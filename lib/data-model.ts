/**
 * Enterprise AI Ledger — P0 Canonical Data Model & Evidence Ledger
 *
 * Implements the signed spec (HA_EnterpriseAI_LedgerDataModelSpec_v2_2026-07-22)
 * Per §2: the spine is ClientInstance → Portfolio → BusinessUnit → UseCase
 * Evidence is first-class data; all derived values are computed, never entered.
 * Isolation root: ClientInstance. No query may cross instances.
 */

// ────────────────────────────────────────────────────────────────────────────
// § 3. Controlled vocabularies
// ────────────────────────────────────────────────────────────────────────────

export type HostingProvider = "client-aws" | "client-azure";

export type DataClass =
  | "public"
  | "internal"
  | "confidential"
  | "restricted"
  | "personal-data"
  | "prompts"
  | "source-documents";

export type AiRole = "assistive" | "agentic-recommend" | "agentic-act";

export type LifecycleStage =
  | "idea"
  | "discover"
  | "validate"
  | "pilot"
  | "controlled-production"
  | "scale"
  | "retire";

export type DecisionType =
  | "scale"
  | "continue-with-conditions"
  | "fix"
  | "pause"
  | "stop"
  | "return-to-discovery";

export type MaterialityTier = "material" | "sub-threshold";

export type MaterialityTrigger =
  | "cost-threshold"
  | "regulated"
  | "customer-facing"
  | "high-risk";

export type DeploymentPosture =
  | "saas-vendor"
  | "client-cloud"
  | "on-prem"
  | "hybrid";

export type Environment =
  | "sandbox"
  | "pilot"
  | "controlled-production"
  | "production";

export type CostComponent =
  | "licences"
  | "tokens"
  | "cloud"
  | "integration"
  | "people"
  | "other";

export type CostBasis = "direct" | "allocated";

export type AllocationBasis =
  | "usage-share"
  | "seat-count"
  | "headcount"
  | "transaction-volume"
  | "revenue-share"
  | "equal-split"
  | "direct-assignment";

export type SourceType =
  | "observed"
  | "finance-reconciled"
  | "system-telemetry"
  | "client-attested"
  | "vendor-claimed"
  | "modelled"
  | "external-benchmark";

export type ClaimType =
  | "productivity"
  | "capacity"
  | "cost-avoided"
  | "revenue"
  | "risk-loss-avoided"
  | "adoption"
  | "quality"
  | "control";

export type BenefitStatus =
  | "observed-operational-improvement"
  | "capacity-released"
  | "budget-avoided"
  | "revenue-realised"
  | "risk-loss-avoided"
  | "forecast-modelled";

export type Confidence = "low" | "medium" | "medium-high" | "high";

export type MetricRole = "primary" | "guardrail";

export type Rag = "green" | "amber" | "red";

export type AutonomyLevel =
  | "human-does"
  | "human-approves"
  | "human-monitors"
  | "autonomous";

export type RegContext =
  | "apra"
  | "asic"
  | "austrac"
  | "privacy"
  | "other"
  | "none";

export type EvidenceTarget =
  | "benefit-claim"
  | "cost-item"
  | "outcome-metric"
  | "risk-assessment";

export type EvidenceStatus =
  | "draft"
  | "attested"
  | "validated"
  | "rejected"
  | "expired";

export type GovernanceRole =
  | "exec-sponsor"
  | "portfolio-lead"
  | "value-owner"
  | "technical-owner"
  | "risk-owner"
  | "finance-partner"
  | "ledger-steward";

export type ValidatorRole = "finance-validator" | "risk-validator";

export type ApprovalStatus = "draft" | "pending" | "approved" | "rejected";

export type ActionType =
  | "scale"
  | "fix"
  | "control-remediation"
  | "cost-out"
  | "revenue-conversion"
  | "discovery";

export type ActionStatus =
  | "open"
  | "in-progress"
  | "done"
  | "overdue"
  | "cancelled";

export type ScenarioType =
  | "price-stress"
  | "model-alternative"
  | "deployment-alternative"
  | "adoption-ramp";

export type AssetType = "licence" | "experiment" | "tool" | "subscription";

export type UnlinkedStatus =
  | "unlinked"
  | "under-review"
  | "to-link"
  | "to-retire";

export type SnapshotType = "board-pack" | "ai-value-review" | "ad-hoc";

export type ChangeClass =
  | "value"
  | "decision"
  | "risk-score"
  | "ownership"
  | "approval"
  | "other";

export type Role =
  | "viewer"
  | "contributor"
  | "use-case-owner"
  | "finance-validator"
  | "risk-validator"
  | "portfolio-admin";

// ────────────────────────────────────────────────────────────────────────────
// § 2. Canonical entity model — the spine
// ────────────────────────────────────────────────────────────────────────────

/**
 * § 2.1 — The isolation root. One per client engagement.
 * Every entity carries an implicit `client_instance_id`; no query may cross instances.
 */
export interface ClientInstance {
  id: string;
  client_name: string;
  engagement_ref: string;
  hosting_tenancy: string;
  hosting_provider: HostingProvider;
  data_residency: string;
  prohibited_data_classes: DataClass[];
  materiality_cost_threshold_aud: number;
  currency: string;
  reporting_period_label: string;
  nda_dpa_ref: string;
  retention_rule: string;
  created_at: string;
  created_by: string;
}

/**
 * § 2.2 — The client's whole AI estate.
 */
export interface Portfolio {
  id: string;
  client_instance_id: string;
  name: string;
  estate_perimeter: string;
  spend_perimeter: string;
  sponsor_summary: string;
  rollup?: PortfolioRollup; // DERIVED
  perimeter_agreed_at: string;
  perimeter_agreed_by: string;
}

/**
 * § 2.3 — A business unit within the portfolio.
 */
export interface BusinessUnit {
  id: string;
  portfolio_id: string;
  name: string;
  bu_owner: string;
  bu_annual_cost?: number; // DERIVED: Σ allocated use-case cost
}

/**
 * § 2.5 — Governance role assignment (authoritative source for §2.4 denormalised fields).
 */
export interface RoleAssignment {
  id: string;
  use_case_id: string;
  governance_role: GovernanceRole;
  person_name: string;
  person_role_title: string;
  assigned_at: string;
  assigned_by: string;
}

/**
 * § 2.6 — A line item in the fully-loaded cost ledger.
 */
export interface CostItem {
  id: string;
  use_case_id: string;
  cost_component: CostComponent;
  label: string;
  cost_basis: CostBasis;
  amount_annual_aud: number;
  source_type: SourceType;
  source_system: string;
  source_reference: string;
  source_date: string;
  allocation_rule_id: string | null;
  evidence_id: string | null;
  is_reconciled?: boolean; // DERIVED: true only when finance-reconciled evidence exists
  note: string;
}

/**
 * § 2.6 — Shared-cost allocation rule (versioned; never overwritten).
 */
export interface AllocationRule {
  id: string;
  portfolio_id: string;
  name: string;
  allocation_basis: AllocationBasis;
  pool_description: string;
  pool_amount_annual_aud: number;
  driver_definition: string;
  allocation_factor: number;
  rationale: string;
  approval_status: ApprovalStatus;
  approved_by: string | null;
  approved_at: string | null;
  version: number;
}

/**
 * § 2.7 — Primary metric + up to two guardrails per use case.
 */
export interface OutcomeMetric {
  id: string;
  use_case_id: string;
  metric_role: MetricRole;
  name: string;
  unit: string;
  baseline_value: string;
  baseline_window: string;
  baseline_source: string;
  target_value: string;
  measurement_method: string;
  measurement_window: string;
  counterfactual: string;
  population: string;
  latest_observed_value: string | null;
  confidence: Confidence;
  evidence_id: string | null;
  review_date: string;
}

/**
 * § 2.8 — First-class evidence object (the provenance ledger).
 * Hard constraint: no evidence_score or banked_value without a linked, validated,
 * non-stale evidence object + named validator.
 */
export interface EvidenceObject {
  id: string;
  use_case_id: string;
  backs: EvidenceTarget;
  target_id: string;
  claim_type: ClaimType;
  claim_value: number | null;
  unit: string | null;
  source_type: SourceType;
  source_system: string;
  source_reference: string;
  source_date: string;
  measurement_period: string;
  method: string;
  assumptions: string;
  confidence: Confidence;
  attested_by: string;
  attested_at: string;
  validated_by: string | null; // 🔒 Finance and/or Risk validator required
  validated_at: string | null;
  status: EvidenceStatus;
  expires_at: string;
  is_stale?: boolean; // DERIVED: now > expires_at
}

/**
 * § 2.9 — Control posture (versioned for auditability).
 */
export interface RiskControlAssessment {
  id: string;
  use_case_id: string;
  version: number;
  inherent_risk: Rag;
  residual_risk: Rag;
  data_classification: DataClass;
  autonomy_level: AutonomyLevel;
  human_approval_gate: string;
  monitoring: string;
  regulatory_context: RegContext[];
  key_controls: string;
  control_gaps: string;
  assessed_by: string;
  assessed_at: string;
  risk_validator_status: ApprovalStatus;
}

/**
 * § 2.10 — Live TAIL data points (never hard-coded).
 * Every TAIL-sourced figure is a reference with source, as-of and expiry.
 */
export interface TailReference {
  id: string;
  portfolio_id: string;
  tail_metric_key: string;
  tail_tier: string;
  value: number;
  unit: string;
  source_type: SourceType; // external-benchmark
  as_of_date: string;
  expires_at: string;
  is_expired?: boolean; // DERIVED
  scenario_only: boolean;
  fetch_note: string;
}

/**
 * § 2.11 — AI Value Review output (append-only).
 * Latest Decision.decision is mirrored onto UseCase.current_decision.
 */
export interface Decision {
  id: string;
  use_case_id: string;
  decision: DecisionType;
  rationale: string;
  conditions: string | null;
  fix_by_date: string | null;
  decided_by: string;
  decided_at: string;
  review_cycle_ref: string;
  informed_by_snapshot_id: string | null;
}

/**
 * § 2.12 — Action (control remediation, cost-out, revenue-conversion, discovery).
 */
export interface Action {
  id: string;
  use_case_id: string;
  action_type: ActionType;
  description: string;
  owner: string;
  due_date: string;
  status: ActionStatus;
  outcome: string | null;
}

/**
 * § 2.12 — Approval (for benefit claims, allocation rules, banked values, assumptions).
 */
export interface Approval {
  id: string;
  subject_type: string;
  subject_id: string;
  approval_role: ValidatorRole;
  approval_status: ApprovalStatus;
  approver: string;
  decided_at: string;
  note: string;
}

/**
 * § 2.13 — Material assumptions (capture assumptions used in calculations/scenarios).
 */
export interface Assumption {
  id: string;
  use_case_id: string;
  statement: string;
  source_type: SourceType;
  confidence: Confidence;
  approval_status: ApprovalStatus;
  owner: string;
  review_date: string;
}

/**
 * § 2.13 — Scenario (price-stress, model-alternative, deployment-alternative, adoption-ramp).
 */
export interface Scenario {
  id: string;
  use_case_id: string;
  name: string;
  scenario_type: ScenarioType;
  scenario_multiplier: number;
  fixed_cost: number;
  variable_cost: number;
  scenario_cost?: number; // DERIVED §5.5
  tail_reference_id: string | null;
  carries_scenario_caveat?: boolean; // DERIVED: true when tail_reference.scenario_only OR type=price-stress
  assumptions: string;
}

/**
 * § 2.14 — Unlinked assets (licences/experiments not yet tied to a use case).
 */
export interface UnlinkedAsset {
  id: string;
  portfolio_id: string;
  asset_type: AssetType;
  label: string;
  vendor: string;
  annual_cost_aud: number;
  source_type: SourceType;
  status: UnlinkedStatus;
  utilisation_note: string;
  owner: string;
}

/**
 * § 4 & § 5.3 — Benefit claim (core taxonomy; is_board_headline and is_banked are DERIVED).
 * Hard constraint: is_banked requires validated non-stale evidence, named validators per status.
 * source_type ∉ {modelled, vendor-claimed} for banked or headline values.
 */
export interface BenefitClaim {
  id: string;
  use_case_id: string;
  benefit_status: BenefitStatus;
  claim_type: ClaimType;
  claimed_value_annual_aud: number;
  is_board_headline?: boolean; // DERIVED
  is_banked?: boolean; // DERIVED 🔒
  commercial_owner: string | null;
  attribution_method: string | null;
  cost_centre: string | null;
  primary_evidence_id: string;
  finance_validator: string | null;
  risk_validator: string | null;
  status_note: string;
}

/**
 * § 2.4 — The management unit (heart of the model).
 * All child objects are attached here; the spine is ClientInstance → Portfolio → BusinessUnit → UseCase.
 *
 * Denormalised fields (current_decision, risk_rating, residual_risk, next_action) mirror child records
 * for fast table rendering; the child record is the source of truth.
 *
 * Sub-threshold use cases carry only Identity, minimal ownership, lifecycle, technology, materiality.
 */
export interface UseCase {
  id: string;
  client_instance_id: string;
  business_unit_id: string;

  // ─── Identity ───
  title: string;
  description: string;
  workflow: string;
  ai_role: AiRole;
  user_group: string;
  current_state: string;

  // ─── Ownership (denormalised pointers; authoritative source = RoleAssignment) ───
  executive_sponsor: string;
  value_owner: string;
  technical_owner: string;
  risk_owner: string;
  finance_partner: string;
  ledger_steward: string;

  // ─── Lifecycle & decision (SEPARATE axes) ───
  lifecycle_stage: LifecycleStage;
  current_decision: DecisionType; // Latest Decision.decision (append-only)
  decision_rationale: string;
  next_action: string;
  due_date: string | null;
  last_reviewed_at: string;
  next_review_due: string;

  // ─── Technology / posture ───
  vendor: string;
  model: string;
  deployment_posture: DeploymentPosture;
  environment: Environment;
  data_classification: DataClass;

  // ─── Materiality (settled decision #1) ───
  materiality_tier?: MaterialityTier; // DERIVED
  materiality_triggers?: MaterialityTrigger[]; // Which "any of" conditions fired
  regulated_flag: boolean;
  customer_facing_flag: boolean;
  high_risk_flag: boolean;

  // ─── Headline economics (ALL DERIVED) ───
  annual_cost?: number; // §5.1
  cost_as_of: string;
  annual_theoretical_value?: number; // §5.2 lane 1
  observed_operational_value?: number; // §5.2 lane 2
  capacity_released_value?: number; // §5.2 lane 3 (never auto-banked)
  banked_value?: number; // 🔒 §5.3 lane 4
  value_as_of: string;
  banked_value_as_of: string;
  evidence_score?: number; // §5.6 (0 unless evidence objects exist)
  cash_conversion_rate?: number; // §5.3

  // ─── Risk (authoritative source = RiskControlAssessment §2.9) ───
  risk_rating?: Rag;
  residual_risk?: Rag;
}

/**
 * § 2.15 — Immutable snapshot (board-pack, ai-value-review, ad-hoc).
 * Every board pack freezes inputs, formula versions and TAIL as-of dates.
 * A pack cannot be generated while any consumed TailReference.is_expired = true
 * unless portfolio-admin explicitly acknowledges.
 */
export interface CoverageStatement {
  assessed_use_cases: number;
  total_use_cases: number;
  reconciled_spend_aud: number;
  total_spend_aud: number;
  pending_validations: number;
  stale_evidence_count: number;
  expired_tail_refs: number;
}

export interface Snapshot {
  id: string;
  portfolio_id: string;
  client_instance_id: string;
  snapshot_type: SnapshotType;
  taken_at: string;
  taken_by: string;
  data_cut_off: string;
  formula_version_set: string;
  tail_as_of_set: Record<string, { as_of: string; expires_at: string }>;
  frozen_inputs: Record<string, unknown>; // Full retained input set (principle #5/#6)
  frozen_rollup: PortfolioRollup;
  coverage_statement: CoverageStatement;
  confidentiality_marking: string;
  immutable: true;
}

/**
 * § 2.15 — Append-only change log (mandatory for value, decision, risk-score changes).
 */
export interface ChangeLogEntry {
  id: string;
  client_instance_id: string;
  entity_type: string;
  entity_id: string;
  field: string;
  old_value: string | null;
  new_value: string | null;
  change_class: ChangeClass;
  changed_by: string;
  changed_at: string;
  reason: string | null;
}

// ────────────────────────────────────────────────────────────────────────────
// § 5.7 / 5.8 — Roll-ups (computed selectors, never typed)
// ────────────────────────────────────────────────────────────────────────────

export interface PortfolioRollup {
  totalAnnualSpendAud: number;
  useCaseCount: number;
  businessUnits: number;
  vendorsInUse: number;
  spendByDecision: Record<DecisionType, number>;
  countByDecision: Record<DecisionType, number>;
  spendByRisk: Record<Rag, number>;
  countByRisk: Record<Rag, number>;
  spendByCostType: Record<CostComponent, number>;
  reclaimableAnnualSpendAud: number;
  atRiskUnmanagedSpendAud: number;
  bankedValueAud: number;
  theoreticalValueAud: number;
  cashConversionRate: number;
}

// ────────────────────────────────────────────────────────────────────────────
// Derived value helpers (§5 calculations)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Determine if a use case is material based on the "any of" rule (§5.6).
 */
export function determineMaterialityTier(
  triggers: MaterialityTrigger[]
): MaterialityTier {
  return triggers.length > 0 ? "material" : "sub-threshold";
}

/**
 * Determine if a benefit can be banked (§5.4).
 * Hard constraint: is_banked(claim) requires all conditions to hold.
 */
export function canBankClaim(claim: BenefitClaim, evidence: EvidenceObject): boolean {
  const isValidBenefitStatus = [
    "budget-avoided",
    "revenue-realised",
    "risk-loss-avoided",
  ].includes(claim.benefit_status);

  const hasValidatedEvidence =
    evidence.status === "validated" && !evidence.is_stale;

  const sourceNotProhibited = !["modelled", "vendor-claimed"].includes(
    evidence.source_type
  );

  const financeValidatorSigned = !!claim.finance_validator;

  const riskValidatorRequiredAndSigned =
    claim.benefit_status === "risk-loss-avoided"
      ? !!claim.risk_validator
      : true;

  return (
    isValidBenefitStatus &&
    hasValidatedEvidence &&
    sourceNotProhibited &&
    financeValidatorSigned &&
    riskValidatorRequiredAndSigned
  );
}

/**
 * Determine if a claim can appear as a board headline (§4).
 * Same gate as is_banked.
 */
export function canAppearAsHeadline(
  claim: BenefitClaim,
  evidence: EvidenceObject
): boolean {
  return canBankClaim(claim, evidence);
}

/**
 * Calculate cash conversion rate (§5.3).
 * cash_conversion_rate = banked_value / annual_theoretical_value
 * Ranges 0–1; reads 100% when a use case banks its whole promise.
 */
export function calculateCashConversionRate(
  bankedValue: number,
  theoreticalValue: number
): number {
  if (theoreticalValue === 0) {
    return 0; // No claims = no conversion to report
  }
  return bankedValue / theoreticalValue;
}

/**
 * Determine materiality triggers for a use case.
 */
export function determineMaterialityTriggers(
  useCase: UseCase,
  clientInstance: ClientInstance
): MaterialityTrigger[] {
  const triggers: MaterialityTrigger[] = [];

  if (useCase.annual_cost && useCase.annual_cost >= clientInstance.materiality_cost_threshold_aud) {
    triggers.push("cost-threshold");
  }
  if (useCase.regulated_flag) {
    triggers.push("regulated");
  }
  if (useCase.customer_facing_flag) {
    triggers.push("customer-facing");
  }
  if (useCase.high_risk_flag) {
    triggers.push("high-risk");
  }

  return triggers;
}

export interface P0DataModel {
  clientInstance: ClientInstance;
  portfolio: Portfolio;
  businessUnits: BusinessUnit[];
  useCases: UseCase[];
  roleAssignments: RoleAssignment[];
  costItems: CostItem[];
  allocationRules: AllocationRule[];
  outcomeMetrics: OutcomeMetric[];
  benefitClaims: BenefitClaim[];
  evidenceObjects: EvidenceObject[];
  riskControlAssessments: RiskControlAssessment[];
  tailReferences: TailReference[];
  decisions: Decision[];
  actions: Action[];
  approvals: Approval[];
  assumptions: Assumption[];
  scenarios: Scenario[];
  unlinkedAssets: UnlinkedAsset[];
  snapshots: Snapshot[];
  changeLog: ChangeLogEntry[];
}
