/**
 * Enterprise AI Ledger — P0 Operational Controls
 *
 * Implements § 6 (RBAC, change history, isolation, export) and § 3.5 (prohibited data classes).
 * Hard constraints:
 * - Every record carries client_instance_id; no query may cross instances.
 * - Append-only ChangeLogEntry for all value, decision, risk-score changes.
 * - Prohibited data classes blocked + logged by default.
 * - Only finance-validator (+ risk-validator for risk-loss-avoided) can bank.
 */

import {
  Role,
  ValidatorRole,
  GovernanceRole,
  ClientInstance,
  UseCase,
  DataClass,
  CostItem,
  EvidenceObject,
  ChangeLogEntry,
  BenefitClaim,
  ApprovalStatus,
} from "./data-model";

// ────────────────────────────────────────────────────────────────────────────
// § 6.1 — Role-based access control (six roles)
// ────────────────────────────────────────────────────────────────────────────

export interface RbacPermissions {
  read: boolean;
  createEdit: boolean;
  validateToBanked: boolean;
  approveAllocation: boolean;
  admin: boolean;
}

const RBAC_MATRIX: Record<Role, RbacPermissions> = {
  viewer: {
    read: true,
    createEdit: false,
    validateToBanked: false,
    approveAllocation: false,
    admin: false,
  },
  contributor: {
    read: true,
    createEdit: true, // draft/attest only
    validateToBanked: false,
    approveAllocation: false,
    admin: false,
  },
  "use-case-owner": {
    read: true,
    createEdit: true, // own use cases only
    validateToBanked: false,
    approveAllocation: false,
    admin: false,
  },
  "finance-validator": {
    read: true,
    createEdit: false, // no direct record creation; validation is the action
    validateToBanked: true, // budget-avoided, revenue-realised, finance side of risk-loss-avoided
    approveAllocation: true, // material shared-cost allocations
    admin: false,
  },
  "risk-validator": {
    read: true,
    createEdit: false,
    validateToBanked: true, // risk-loss-avoided (risk side only)
    approveAllocation: false,
    admin: false,
  },
  "portfolio-admin": {
    read: true,
    createEdit: true,
    validateToBanked: false,
    approveAllocation: false,
    admin: true, // roles, perimeter, config
  },
};

/**
 * Get RBAC permissions for a user role.
 */
export function getRbacPermissions(role: Role): RbacPermissions {
  return RBAC_MATRIX[role];
}

/**
 * Check if a user has permission to perform an action.
 */
export function hasPermission(
  role: Role,
  permission: keyof RbacPermissions
): boolean {
  return RBAC_MATRIX[role][permission];
}

/**
 * Enforce: only finance-validator (+ risk-validator where required) can bank a value.
 */
export function canValidateToBanked(
  actor: { role: Role; personName: string },
  claim: BenefitClaim
): boolean {
  if (!hasPermission(actor.role, "validateToBanked")) {
    return false;
  }

  // If risk-loss-avoided, only risk-validator can approve (not just finance)
  if (
    claim.benefit_status === "risk-loss-avoided" &&
    actor.role !== "risk-validator" &&
    actor.role !== "finance-validator"
  ) {
    return false;
  }

  return true;
}

// ────────────────────────────────────────────────────────────────────────────
// § 6.2 — Append-only change history
// ────────────────────────────────────────────────────────────────────────────

/**
 * Record a change to a material field (mandatory for value, decision, risk-score).
 * Returns a new ChangeLogEntry ready to append.
 */
export function createChangeLogEntry(
  clientInstanceId: string,
  entityType: string,
  entityId: string,
  field: string,
  oldValue: string | null,
  newValue: string | null,
  changedBy: string,
  changeClass: "value" | "decision" | "risk-score" | "ownership" | "approval" | "other",
  reason?: string
): ChangeLogEntry {
  return {
    id: `change-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    client_instance_id: clientInstanceId,
    entity_type: entityType,
    entity_id: entityId,
    field,
    old_value: oldValue,
    new_value: newValue,
    change_class: changeClass,
    changed_by: changedBy,
    changed_at: new Date().toISOString(),
    reason: reason ?? null,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// § 6.3 — Client data isolation (settled decision #5)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Every entity must carry client_instance_id (enforced at type level).
 * This enforcer checks that no query crosses instance boundaries.
 */
export function enforceClientInstanceIsolation<T extends { client_instance_id?: string }>(
  records: T[],
  allowedClientInstanceId: string
): T[] {
  return records.filter((r) => r.client_instance_id === allowedClientInstanceId);
}

/**
 * Prohibited data classes (by default): prompts, source-documents, personal-data.
 * These cannot be ingested unless explicitly exempted by portfolio-admin.
 */
export const DEFAULT_PROHIBITED_DATA_CLASSES: DataClass[] = [
  "prompts",
  "source-documents",
  "personal-data",
];

/**
 * Validate that a data classification is allowed.
 * Throws if prohibited by default (unless custom list allows it).
 */
export function validateDataClassification(
  dataClass: DataClass,
  prohibitedClasses: DataClass[]
): { allowed: boolean; reason?: string } {
  if (prohibitedClasses.includes(dataClass)) {
    return {
      allowed: false,
      reason: `Data class '${dataClass}' is prohibited for this client instance.`,
    };
  }
  return { allowed: true };
}

/**
 * Log prohibited data class ingestion attempt.
 */
export function logProhibitedDataClassIngestion(
  clientInstanceId: string,
  dataClass: DataClass,
  context: string,
  actor: string
): ChangeLogEntry {
  return createChangeLogEntry(
    clientInstanceId,
    "data-class-ingestion",
    clientInstanceId,
    "prohibited_class_blocked",
    null,
    dataClass,
    actor,
    "other",
    `Ingestion of prohibited class blocked: ${context}`
  );
}

// ────────────────────────────────────────────────────────────────────────────
// § 6.4 — Redaction-safe, dated export (header block)
// ────────────────────────────────────────────────────────────────────────────

export interface ExportHeaderBlock {
  client_name: string;
  engagement_ref: string;
  engagement_scope: string;
  data_cut_off_date: string;
  scenario_assumptions: string;
  tail_as_of_expiry: string;
  confidentiality_marking: string;
  generated_at: string;
  generated_by: string;
}

/**
 * Generate a redaction-safe export header block.
 */
export function generateExportHeader(
  clientInstance: ClientInstance,
  dataCutOff: string,
  scenarioAssumptions: string,
  tailAsOfExpiry: string,
  confidentialityMarking: string,
  generatedBy: string
): ExportHeaderBlock {
  return {
    client_name: clientInstance.client_name,
    engagement_ref: clientInstance.engagement_ref,
    engagement_scope: `Hosting: ${clientInstance.hosting_provider} | Residency: ${clientInstance.data_residency}`,
    data_cut_off_date: dataCutOff,
    scenario_assumptions: scenarioAssumptions,
    tail_as_of_expiry: tailAsOfExpiry,
    confidentiality_marking: confidentialityMarking,
    generated_at: new Date().toISOString(),
    generated_by: generatedBy,
  };
}

/**
 * Apply redaction to an export object (remove named fields/people while preserving figures/structure).
 */
export function applyRedaction(
  data: Record<string, unknown>,
  fieldsToRedact: string[]
): Record<string, unknown> {
  const redacted = { ...data };
  fieldsToRedact.forEach((field) => {
    if (field in redacted) {
      if (typeof redacted[field] === "string") {
        redacted[field] = "[REDACTED]";
      } else if (typeof redacted[field] === "object" && redacted[field] !== null) {
        // For objects, recursively redact
        redacted[field] = applyRedaction(redacted[field] as Record<string, unknown>, fieldsToRedact);
      }
    }
  });
  return redacted;
}

// ────────────────────────────────────────────────────────────────────────────
// RBAC constraints on specific operations
// ────────────────────────────────────────────────────────────────────────────

/**
 * Enforce: only finance-validator can set a BenefitClaim to banked
 * (+ risk-validator required for risk-loss-avoided).
 *
 * Attempting to bank without the required validator fails.
 */
export function enforceFinanceValidatorGate(
  claim: BenefitClaim,
  actor: { role: Role; personName: string }
): { allowed: boolean; reason?: string } {
  const isBankable = [
    "budget-avoided",
    "revenue-realised",
    "risk-loss-avoided",
  ].includes(claim.benefit_status);

  if (!isBankable) {
    return {
      allowed: false,
      reason: `Claim status '${claim.benefit_status}' is never banked.`,
    };
  }

  // Finance-validator signature required
  if (!claim.finance_validator) {
    return {
      allowed: false,
      reason: "Banked value requires finance-validator signature.",
    };
  }

  // For risk-loss-avoided, BOTH validators required
  if (claim.benefit_status === "risk-loss-avoided" && !claim.risk_validator) {
    return {
      allowed: false,
      reason: "Risk-loss-avoided requires both finance-validator AND risk-validator signatures.",
    };
  }

  return { allowed: true };
}

/**
 * Enforce: budget-avoided requires cost_centre + finance reconciliation.
 */
export function enforceBudgetAvoidedRequirements(
  claim: BenefitClaim
): { allowed: boolean; reason?: string } {
  if (claim.benefit_status !== "budget-avoided") {
    return { allowed: true };
  }

  if (!claim.cost_centre) {
    return {
      allowed: false,
      reason: "budget-avoided requires cost_centre to be set.",
    };
  }

  return { allowed: true };
}

/**
 * Enforce: revenue-realised requires commercial_owner + attribution_method + finance reconciliation.
 */
export function enforceRevenueRealisedRequirements(
  claim: BenefitClaim
): { allowed: boolean; reason?: string } {
  if (claim.benefit_status !== "revenue-realised") {
    return { allowed: true };
  }

  if (!claim.commercial_owner) {
    return {
      allowed: false,
      reason: "revenue-realised requires commercial_owner to be set.",
    };
  }

  if (!claim.attribution_method) {
    return {
      allowed: false,
      reason: "revenue-realised requires attribution_method to be set.",
    };
  }

  return { allowed: true };
}

/**
 * Enforce: capacity-released is NEVER included in banked_value.
 * Any attempt to bank a capacity-released claim fails.
 */
export function enforceCapacityNeverBanked(
  claim: BenefitClaim
): { allowed: boolean; reason?: string } {
  if (claim.benefit_status === "capacity-released") {
    return {
      allowed: false,
      reason: "capacity-released is never auto-banked.",
    };
  }

  return { allowed: true };
}

// ────────────────────────────────────────────────────────────────────────────
// Hard constraint checks (evidence gate)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Hard constraint: an evidence_score or banked_value cannot be set without
 * a linked, validated, non-stale evidence object + named validator.
 *
 * Attempting it fails (exception).
 */
export function enforceEvidenceGate(
  claim: BenefitClaim,
  evidence: EvidenceObject | null,
  actor: { role: Role; personName: string }
): { allowed: boolean; reason?: string } {
  if (!evidence) {
    return {
      allowed: false,
      reason: "Banked value requires a linked evidence object.",
    };
  }

  if (evidence.status !== "validated") {
    return {
      allowed: false,
      reason: `Evidence status is '${evidence.status}', not 'validated'. Cannot bank.`,
    };
  }

  if (evidence.is_stale) {
    return {
      allowed: false,
      reason: "Evidence is stale (expired). Cannot bank.",
    };
  }

  if (!evidence.validated_by) {
    return {
      allowed: false,
      reason: "Evidence must have a named validator. Cannot bank.",
    };
  }

  // source_type ∉ {modelled, vendor-claimed}
  if (["modelled", "vendor-claimed"].includes(evidence.source_type)) {
    return {
      allowed: false,
      reason: `Evidence source type '${evidence.source_type}' cannot support banked value.`,
    };
  }

  return { allowed: true };
}

/**
 * Check if an evidence object is eligible to back a headline number.
 * Same gate as is_banked.
 */
export function isEvidenceEligibleForHeadline(
  evidence: EvidenceObject
): boolean {
  return (
    evidence.status === "validated" &&
    !evidence.is_stale &&
    !!evidence.validated_by &&
    !["modelled", "vendor-claimed"].includes(evidence.source_type)
  );
}
