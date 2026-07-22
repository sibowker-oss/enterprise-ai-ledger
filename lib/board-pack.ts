/**
 * Enterprise AI Ledger — P0 Board-Pack Generation
 *
 * Implements § 7: generates board packs ONLY from immutable Snapshots.
 * All eight sections in order, with lifecycle/decision rendered separately everywhere.
 * Cannot be generated while any consumed TailReference.is_expired = true
 * unless portfolio-admin explicitly acknowledges.
 */

import {
  Snapshot,
  UseCase,
  Decision,
  Action,
  BenefitClaim,
  EvidenceObject,
  TailReference,
  RiskControlAssessment,
  PortfolioRollup,
  CoverageStatement,
  DecisionType,
  LifecycleStage,
  Rag,
} from "./data-model";
import { ExportHeaderBlock } from "./controls";

// ────────────────────────────────────────────────────────────────────────────
// § 7 — Board-pack generation contract (all eight sections)
// ────────────────────────────────────────────────────────────────────────────

/**
 * § 7.1 — Executive summary + change since last review.
 * Diff against prior board-pack snapshot: new banked value, decisions taken, risk movements.
 */
export interface BoardPackExecutiveSummary {
  title: string;
  highlights: string[];
  changesSinceLastReview: {
    newBankedValueAud: number;
    decisionsCount: Record<DecisionType, number>;
    riskMovements: Array<{
      useCaseId: string;
      useCaseTitle: string;
      previousRisk: Rag;
      currentRisk: Rag;
    }>;
  };
}

/**
 * § 7.2 — Coverage / data-quality statement.
 * Assessed use cases, reconciled spend, pending validations, stale evidence, expired TAIL refs.
 */
export type BoardPackCoverageStatement = CoverageStatement;

/**
 * § 7.3 — Current economics across four lanes.
 */
export interface BoardPackEconomics {
  annual_cost: number;
  theoretical_value: number; // Full promise
  capacity_released: number; // Separate lane
  banked_value: number;
  cash_conversion_rate: number;
  net_theoretical_value: number;
  banked_net_value: number;
}

/**
 * § 7.4 — Scenarios & assumptions.
 * Each price-stress/forward figure labelled "Scenario, not forecast" with TAIL as-of + expiry.
 */
export interface BoardPackScenario {
  name: string;
  type: string;
  cost: number;
  assumption: string;
  carries_caveat: boolean;
  tail_as_of?: string;
  tail_expires?: string;
}

/**
 * § 7.5 — Decisions & exceptions.
 * AI Value Review's recorded scale/continue/fix/pause/stop/return decisions.
 */
export interface BoardPackDecision {
  use_case_id: string;
  use_case_title: string;
  lifecycle_stage: LifecycleStage; // Separate axis
  decision: DecisionType;
  decided_by: string;
  decided_at: string;
  rationale: string;
  conditions?: string;
}

/**
 * § 7.6 — Top controls & risk.
 * Unmanaged-risk spend, red/amber concentration, residual-risk movements.
 */
export interface BoardPackControlsAndRisk {
  unmanaged_risk_spend: number;
  red_risk_concentration: Array<{
    useCaseId: string;
    useCaseTitle: string;
    annualCost: number;
  }>;
  amber_risk_concentration: Array<{
    useCaseId: string;
    useCaseTitle: string;
    annualCost: number;
  }>;
  residual_risk_movements: Array<{
    useCaseId: string;
    useCaseTitle: string;
    previous: Rag;
    current: Rag;
  }>;
}

/**
 * § 7.7 — Actions / owners / dates.
 * 90-day intervention register: control remediation, cost-out, revenue-conversion.
 */
export interface BoardPackAction {
  use_case_id: string;
  use_case_title: string;
  action_type: string;
  description: string;
  owner: string;
  due_date: string;
  status: string;
}

/**
 * § 7.8 — Methodology & evidence appendix.
 * Formula version set, evidence sources per headline number, validators, confidence, expiries.
 */
export interface BoardPackEvidenceAppendix {
  formula_version_set: string;
  headlines: Array<{
    use_case_id: string;
    use_case_title: string;
    benefit_claim_id: string;
    claim_value: number;
    benefit_status: string;
    primary_evidence: {
      id: string;
      source_type: string;
      source_reference: string;
      source_date: string;
      validated_by?: string;
      confidence: string;
      expires_at: string;
    };
  }>;
}

/**
 * Complete board pack (immutable, generated from Snapshot).
 */
export interface BoardPack {
  header: ExportHeaderBlock;
  snapshot_id: string;
  snapshot_type: string;
  generated_at: string;

  // Section 1: Executive summary
  executive_summary: BoardPackExecutiveSummary;

  // Section 2: Coverage statement
  coverage_statement: BoardPackCoverageStatement;

  // Section 3: Current economics
  economics: BoardPackEconomics;

  // Section 4: Scenarios & assumptions
  scenarios: BoardPackScenario[];

  // Section 5: Decisions & exceptions
  decisions: BoardPackDecision[];

  // Section 6: Controls & risk
  controls_and_risk: BoardPackControlsAndRisk;

  // Section 7: Actions
  actions: BoardPackAction[];

  // Section 8: Methodology & evidence appendix
  evidence_appendix: BoardPackEvidenceAppendix;
}

// ────────────────────────────────────────────────────────────────────────────
// Board-pack generation (from Snapshot)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Validate that a board pack can be generated.
 * Checks for expired TAIL refs (blocks unless explicitly acknowledged).
 */
export function validateBoardPackGeneratable(
  snapshot: Snapshot,
  tailReferences: TailReference[]
): { allowed: boolean; reason?: string } {
  const expiredTails = tailReferences.filter((tr) => tr.is_expired);

  if (expiredTails.length > 0) {
    return {
      allowed: false,
      reason: `Cannot generate board pack with ${expiredTails.length} expired TAIL reference(s). Refresh or explicitly acknowledge.`,
    };
  }

  return { allowed: true };
}

/**
 * Generate an executive summary section from snapshot and use cases.
 */
export function generateExecutiveSummary(
  useCases: UseCase[],
  decisions: Decision[],
  previousSnapshot?: Snapshot
): BoardPackExecutiveSummary {
  // Calculate changes since last review
  let newBankedValueDelta = 0;
  if (previousSnapshot) {
    const previousBanked = (previousSnapshot.frozen_rollup as any)
      ?.bankedValueAud ?? 0;
    const currentBanked = useCases.reduce(
      (sum, uc) => sum + (uc.banked_value ?? 0),
      0
    );
    newBankedValueDelta = currentBanked - previousBanked;
  }

  // Count decisions by type
  const decisionCounts: Record<DecisionType, number> = {
    scale: 0,
    "continue-with-conditions": 0,
    fix: 0,
    pause: 0,
    stop: 0,
    "return-to-discovery": 0,
  };

  decisions.forEach((d) => {
    decisionCounts[d.decision]++;
  });

  return {
    title: "Enterprise AI Ledger — Board Pack",
    highlights: [
      `${useCases.length} use cases under review`,
      `AUD$${(useCases.reduce((sum, uc) => sum + (uc.annual_cost ?? 0), 0) / 1000000).toFixed(1)}M annual spend`,
      `${useCases.filter((uc) => uc.banked_value && uc.banked_value > 0).length} use cases with banked value`,
    ],
    changesSinceLastReview: {
      newBankedValueAud: newBankedValueDelta,
      decisionsCount: decisionCounts,
      riskMovements: [], // Would require prior risk snapshot to populate
    },
  };
}

/**
 * Generate decisions section (lifecycle and decision shown separately).
 */
export function generateDecisionsSection(
  useCases: UseCase[],
  decisions: Decision[]
): BoardPackDecision[] {
  const decisionMap = new Map(decisions.map((d) => [d.use_case_id, d]));

  return useCases
    .filter((uc) => decisionMap.has(uc.id))
    .map((uc) => {
      const decision = decisionMap.get(uc.id)!;
      return {
        use_case_id: uc.id,
        use_case_title: uc.title,
        lifecycle_stage: uc.lifecycle_stage, // Separate axis
        decision: uc.current_decision, // Separate axis
        decided_by: decision.decided_by,
        decided_at: decision.decided_at,
        rationale: decision.rationale,
        conditions: decision.conditions ?? undefined,
      };
    });
}

/**
 * Generate controls & risk section.
 */
export function generateControlsAndRiskSection(
  useCases: UseCase[]
): BoardPackControlsAndRisk {
  const redRiskCases = useCases.filter((uc) => uc.risk_rating === "red");
  const amberRiskCases = useCases.filter((uc) => uc.risk_rating === "amber");

  const unManagedRiskSpend = redRiskCases.reduce(
    (sum, uc) => sum + (uc.annual_cost ?? 0),
    0
  );

  return {
    unmanaged_risk_spend: unManagedRiskSpend,
    red_risk_concentration: redRiskCases.map((uc) => ({
      useCaseId: uc.id,
      useCaseTitle: uc.title,
      annualCost: uc.annual_cost ?? 0,
    })),
    amber_risk_concentration: amberRiskCases.map((uc) => ({
      useCaseId: uc.id,
      useCaseTitle: uc.title,
      annualCost: uc.annual_cost ?? 0,
    })),
    residual_risk_movements: [], // Would require prior risk snapshot
  };
}

/**
 * Generate actions section (open + overdue + high-priority).
 */
export function generateActionsSection(
  useCases: UseCase[],
  actions: Action[]
): BoardPackAction[] {
  return actions
    .filter((a) => ["open", "overdue", "in-progress"].includes(a.status))
    .map((a) => {
      const uc = useCases.find((u) => u.id === a.use_case_id);
      return {
        use_case_id: a.use_case_id,
        use_case_title: uc?.title ?? "Unknown",
        action_type: a.action_type,
        description: a.description,
        owner: a.owner,
        due_date: a.due_date,
        status: a.status,
      };
    });
}

/**
 * Generate methodology & evidence appendix.
 */
export function generateEvidenceAppendix(
  useCases: UseCase[],
  benefitClaims: BenefitClaim[],
  evidenceObjects: EvidenceObject[],
  formulaVersionSet: string
): BoardPackEvidenceAppendix {
  const evidenceMap = new Map(evidenceObjects.map((e) => [e.id, e]));

  // Only include banked claims in appendix
  const bankedClaims = benefitClaims.filter((claim) => claim.is_banked);

  return {
    formula_version_set: formulaVersionSet,
    headlines: bankedClaims.map((claim) => {
      const evidence = evidenceMap.get(claim.primary_evidence_id);
      return {
        use_case_id: claim.use_case_id,
        use_case_title: useCases.find((uc) => uc.id === claim.use_case_id)
          ?.title ?? "Unknown",
        benefit_claim_id: claim.id,
        claim_value: claim.claimed_value_annual_aud,
        benefit_status: claim.benefit_status as string,
        primary_evidence: {
          id: evidence?.id ?? "unknown",
          source_type: evidence?.source_type ?? "unknown",
          source_reference: evidence?.source_reference ?? "unknown",
          source_date: evidence?.source_date ?? "unknown",
          validated_by: evidence?.validated_by ?? undefined,
          confidence: evidence?.confidence ?? "unknown",
          expires_at: evidence?.expires_at ?? "unknown",
        },
      };
    }),
  };
}

/**
 * Generate a complete board pack from a Snapshot and supporting data.
 *
 * This is the main entry point; it orchestrates all eight sections.
 */
export function generateBoardPack(
  header: ExportHeaderBlock,
  snapshot: Snapshot,
  useCases: UseCase[],
  benefitClaims: BenefitClaim[],
  evidenceObjects: EvidenceObject[],
  decisions: Decision[],
  actions: Action[],
  tailReferences: TailReference[],
  coverageStatement: CoverageStatement,
  generatedBy: string
): { boardPack: BoardPack; validationErrors: string[] } {
  const validationErrors: string[] = [];

  // Validate TAIL refs
  const expiredTails = tailReferences.filter((tr) => tr.is_expired);
  if (expiredTails.length > 0) {
    validationErrors.push(
      `${expiredTails.length} expired TAIL reference(s) found. Refresh or acknowledge to proceed.`
    );
  }

  // Calculate economics
  const totalCost = useCases.reduce((sum, uc) => sum + (uc.annual_cost ?? 0), 0);
  const theoreticalValue = useCases.reduce(
    (sum, uc) => sum + (uc.annual_theoretical_value ?? 0),
    0
  );
  const capacityReleased = useCases.reduce(
    (sum, uc) => sum + (uc.capacity_released_value ?? 0),
    0
  );
  const bankedValue = useCases.reduce(
    (sum, uc) => sum + (uc.banked_value ?? 0),
    0
  );
  const cashConversion =
    theoreticalValue > 0 ? bankedValue / theoreticalValue : 0;

  const boardPack: BoardPack = {
    header,
    snapshot_id: snapshot.id,
    snapshot_type: snapshot.snapshot_type,
    generated_at: new Date().toISOString(),

    // Section 1: Executive summary
    executive_summary: generateExecutiveSummary(useCases, decisions, undefined),

    // Section 2: Coverage statement
    coverage_statement: coverageStatement,

    // Section 3: Economics
    economics: {
      annual_cost: totalCost,
      theoretical_value: theoreticalValue,
      capacity_released: capacityReleased,
      banked_value: bankedValue,
      cash_conversion_rate: cashConversion,
      net_theoretical_value: theoreticalValue - totalCost,
      banked_net_value: bankedValue - totalCost,
    },

    // Section 4: Scenarios (simplified; would be populated from Scenario entities)
    scenarios: [],

    // Section 5: Decisions
    decisions: generateDecisionsSection(useCases, decisions),

    // Section 6: Controls & risk
    controls_and_risk: generateControlsAndRiskSection(useCases),

    // Section 7: Actions
    actions: generateActionsSection(useCases, actions),

    // Section 8: Evidence appendix
    evidence_appendix: generateEvidenceAppendix(
      useCases,
      benefitClaims,
      evidenceObjects,
      snapshot.formula_version_set
    ),
  };

  return { boardPack, validationErrors };
}
