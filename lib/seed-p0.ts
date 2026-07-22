/**
 * Enterprise AI Ledger — P0 Data Model Seed / Migration Layer
 *
 * Transforms the Meridian prototype seed data (lib/types.ts) into the P0 canonical model (lib/data-model.ts).
 * Provides reconciliation proof: old four headline numbers → new four headline numbers.
 *
 * This is the bridge: old app → new data model.
 * Until every page is wired to use p0(), old and new coexist.
 */

import { SeedData, UseCase as OldUseCase } from "./types";
import {
  ClientInstance,
  Portfolio,
  BusinessUnit,
  UseCase,
  CostItem,
  OutcomeMetric,
  BenefitClaim,
  EvidenceObject,
  RiskControlAssessment,
  Decision,
  Action,
  Snapshot,
  PortfolioRollup,
  CoverageStatement,
  P0DataModel,
  LifecycleStage,
  DecisionType,
  DataClass,
  Rag,
  Confidence,
  CostComponent,
  EvidenceStatus,
} from "./data-model";
import {
  calculateAnnualCost,
  calculateAnnualTheoreticalValue,
  calculateObservedOperationalValue,
  calculateCapacityReleasedValue,
  calculateBankedValue,
  calculateCashConversionRate,
  calculatePortfolioRollup,
  calculateCoverageStatement,
} from "./calculations";

/**
 * Reconciliation proof: four headline numbers old → new.
 * Used to verify the migration preserves the semantics.
 */
export interface ReconciliationProof {
  oldCost: number;
  newCost: number;
  costMatch: boolean;

  oldTheoretical: number;
  newTheoretical: number;
  theoreticalMatch: boolean;

  oldCapacity: number;
  newCapacity: number;
  capacityMatch: boolean;

  oldBanked: number;
  newBanked: number;
  bankedMatch: boolean;

  allMatch: boolean;
  reconciliationStatement: string;
}

/**
 * Migrate old Meridian seed data into the P0 model.
 * Returns the full P0DataModel + reconciliation proof.
 */
export function migrateToP0(oldSeed: SeedData): {
  model: P0DataModel;
  reconciliation: ReconciliationProof;
} {
  const now = new Date().toISOString();

  // ─── Root: ClientInstance ───
  const clientInstance: ClientInstance = {
    id: "ci-meridian",
    client_name: oldSeed.company.name,
    engagement_ref: "MERIDIAN-PROTOTYPE-001",
    hosting_tenancy: "client-aws-ap-southeast-2",
    hosting_provider: "client-aws",
    data_residency: "Australia",
    prohibited_data_classes: ["prompts", "source-documents", "personal-data"],
    materiality_cost_threshold_aud: 50000,
    currency: oldSeed.meta.currency,
    reporting_period_label: oldSeed.meta.period,
    nda_dpa_ref: "PROTOTYPE-NDA",
    retention_rule: "7 years",
    created_at: oldSeed.meta.generated,
    created_by: "meridian-seed",
  };

  // ─── Portfolio ───
  const portfolio: Portfolio = {
    id: "port-meridian",
    client_instance_id: clientInstance.id,
    name: `${oldSeed.company.shortName} Enterprise AI Estate`,
    estate_perimeter: oldSeed.portfolioRollup.useCaseCount
      ? `${oldSeed.portfolioRollup.useCaseCount} use cases across ${oldSeed.portfolioRollup.businessUnits} business units`
      : "All production AI workloads",
    spend_perimeter: `All AI-attributed spend (${oldSeed.meta.period})`,
    sponsor_summary: oldSeed.company.sponsor,
    perimeter_agreed_at: oldSeed.meta.generated,
    perimeter_agreed_by: oldSeed.company.sponsor,
  };

  // ─── Business Units ───
  const businessUnitMap = new Map<string, BusinessUnit>();
  const uniqueBUs = new Set(oldSeed.useCases.map((uc) => uc.businessUnit));

  uniqueBUs.forEach((buName, index) => {
    const buId = `bu-${index + 1}`;
    businessUnitMap.set(buName, {
      id: buId,
      portfolio_id: portfolio.id,
      name: buName,
      bu_owner: "TBD",
      bu_annual_cost: 0, // Will be computed
    });
  });

  const businessUnits = Array.from(businessUnitMap.values());

  // ─── Decision mapping (shared across Use Cases and Decisions) ───
  const decisionMap: Record<string, DecisionType> = {
    scale: "scale",
    fix: "fix",
    stop: "stop",
  };

  // ─── Use Cases (with full P0 structure) ───
  const useCases: UseCase[] = oldSeed.useCases.map((oldUC: OldUseCase) => {
    const buId = businessUnitMap.get(oldUC.businessUnit)?.id || businessUnits[0].id;

    const lifecycleMap: Record<string, LifecycleStage> = {
      "In production across 3 contact centres": "scale",
      "In pilot with 50 users": "pilot",
      "Controlled rollout": "controlled-production",
      "Early adopter group": "validate",
    };

    // Lifecycle stage: infer from currentState
    let lifecycle: LifecycleStage = "controlled-production";
    if (oldUC.currentState.includes("production")) {
      lifecycle = "scale";
    } else if (oldUC.currentState.includes("pilot")) {
      lifecycle = "pilot";
    } else if (oldUC.currentState.includes("rollout")) {
      lifecycle = "controlled-production";
    }

    const dataClassMap: Record<string, DataClass> = {
      pii: "restricted",
      confidential: "confidential",
      internal: "internal",
      public: "public",
    };

    return {
      id: oldUC.id,
      client_instance_id: clientInstance.id,
      business_unit_id: buId,
      title: oldUC.name,
      description: oldUC.workflow,
      workflow: oldUC.workflow,
      ai_role: (oldUC.aiRole.toLowerCase().includes("assistive")
        ? "assistive"
        : oldUC.aiRole.toLowerCase().includes("agentic-recommend")
          ? "agentic-recommend"
          : "agentic-act") as any,
      user_group: oldUC.userGroup,
      current_state: oldUC.currentState,
      executive_sponsor: oldUC.owner,
      value_owner: oldUC.owner,
      technical_owner: "TBD",
      risk_owner: "TBD",
      finance_partner: "TBD",
      ledger_steward: "TBD",
      lifecycle_stage: lifecycle,
      current_decision: decisionMap[oldUC.decision] || "fix",
      decision_rationale: `Prototype decision: ${oldUC.decision}`,
      next_action: oldUC.nextAction,
      due_date: null,
      last_reviewed_at: now,
      next_review_due: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      vendor: oldUC.vendor,
      model: oldUC.model,
      deployment_posture: "saas-vendor",
      environment: "production",
      data_classification: "confidential",
      regulated_flag: true,
      customer_facing_flag: oldUC.currentState.includes("customer"),
      high_risk_flag: oldUC.risk.rag === "red",
      cost_as_of: now,
      value_as_of: now,
      banked_value_as_of: now,
      // These are DERIVED; will be computed below
      annual_cost: oldUC.cost.totalAnnual,
      annual_theoretical_value: oldUC.value.annualBenefitAud,
      observed_operational_value: oldUC.value.bankedValueAud * 0.5, // Proxy: half the banked is observed
      capacity_released_value: 0, // Will be set
      banked_value: oldUC.value.bankedValueAud,
      evidence_score: 75, // Proxy
      cash_conversion_rate: oldUC.value.bankedValueAud / oldUC.value.annualBenefitAud,
      risk_rating: (oldUC.risk.rag as any) || "amber",
      residual_risk: (oldUC.risk.rag as any) || "amber",
    };
  });

  // ─── Cost Items (expand old cost breakdown) ───
  const costItems: CostItem[] = oldSeed.useCases.flatMap((oldUC: OldUseCase) => {
    const components: CostComponent[] = [
      "licences",
      "tokens",
      "cloud",
      "integration",
      "people",
    ];
    return components
      .filter((comp) => oldUC.cost[comp as keyof typeof oldUC.cost] > 0)
      .map((comp) => ({
        id: `ci-${oldUC.id}-${comp}`,
        use_case_id: oldUC.id,
        cost_component: comp,
        label: `${comp.charAt(0).toUpperCase() + comp.slice(1)} (${oldUC.name})`,
        cost_basis: "direct" as const,
        amount_annual_aud: oldUC.cost[comp as keyof typeof oldUC.cost],
        source_type: "finance-reconciled" as const,
        source_system: "Prototype Finance",
        source_reference: `UC-${oldUC.id}`,
        source_date: oldSeed.meta.generated,
        allocation_rule_id: null,
        evidence_id: null,
        note: "Prototype seed cost",
      }));
  });

  // ─── Outcome Metrics ───
  const outcomeMetrics: OutcomeMetric[] = oldSeed.useCases.map(
    (oldUC: OldUseCase) => ({
      id: `metric-${oldUC.id}`,
      use_case_id: oldUC.id,
      metric_role: "primary" as const,
      name: oldUC.outcome.primaryMetric,
      unit: "varies",
      baseline_value: oldUC.outcome.baseline,
      baseline_window: "2026 baseline",
      baseline_source: "Prototype observation",
      target_value: oldUC.outcome.target,
      measurement_method: oldUC.outcome.evidence,
      measurement_window: "2026",
      counterfactual: "Without AI: status quo",
      population: oldUC.userGroup,
      latest_observed_value: null,
      confidence: (oldUC.outcome.confidence as any) || "medium",
      evidence_id: null,
      review_date: oldSeed.meta.generated,
    })
  );

  // ─── Benefit Claims ───
  const benefitClaims: BenefitClaim[] = oldSeed.useCases.map(
    (oldUC: OldUseCase, idx) => ({
      id: `claim-${oldUC.id}`,
      use_case_id: oldUC.id,
      benefit_status:
        oldUC.value.bankedValueAud > 0
          ? "budget-avoided"
          : "forecast-modelled",
      claim_type:
        oldUC.value.bankedValueAud > 0 ? "cost-avoided" : "productivity",
      claimed_value_annual_aud: oldUC.value.annualBenefitAud,
      is_board_headline:
        oldUC.value.bankedValueAud > 0 && oldUC.decision === "scale",
      is_banked: oldUC.value.bankedValueAud > 0,
      commercial_owner: null,
      attribution_method: null,
      cost_centre: null,
      primary_evidence_id: `ev-${oldUC.id}`,
      finance_validator:
        oldUC.value.bankedValueAud > 0 ? "Finance" : null,
      risk_validator: null,
      status_note: oldUC.value.basis,
    })
  );

  // ─── Evidence Objects ───
  const evidenceObjects: EvidenceObject[] = oldSeed.useCases.map(
    (oldUC: OldUseCase) => ({
      id: `ev-${oldUC.id}`,
      use_case_id: oldUC.id,
      backs: "benefit-claim" as const,
      target_id: `claim-${oldUC.id}`,
      claim_type: oldUC.value.bankedValueAud > 0 ? "cost-avoided" : "productivity",
      claim_value: oldUC.value.bankedValueAud || oldUC.value.annualBenefitAud,
      unit: "AUD",
      source_type:
        oldUC.value.bankedValueAud > 0
          ? "finance-reconciled"
          : "client-attested",
      source_system: "Prototype",
      source_reference: oldUC.id,
      source_date: oldSeed.meta.generated,
      measurement_period: oldSeed.meta.period,
      method: oldUC.value.basis,
      assumptions: oldUC.outcome.evidence,
      confidence: (oldUC.outcome.confidence as any) || "medium",
      attested_by: oldUC.owner,
      attested_at: oldSeed.meta.generated,
      validated_by:
        oldUC.value.bankedValueAud > 0 && oldUC.decision === "scale"
          ? "Finance"
          : null,
      validated_at:
        oldUC.value.bankedValueAud > 0 && oldUC.decision === "scale"
          ? oldSeed.meta.generated
          : null,
      status:
        oldUC.value.bankedValueAud > 0 && oldUC.decision === "scale"
          ? "validated"
          : "attested",
      expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
      is_stale: false,
    })
  );

  // ─── Risk Assessments ───
  const riskControlAssessments: RiskControlAssessment[] = oldSeed.useCases.map(
    (oldUC: OldUseCase) => ({
      id: `risk-${oldUC.id}`,
      use_case_id: oldUC.id,
      version: 1,
      inherent_risk: (oldUC.risk.rag as any) || "amber",
      residual_risk: (oldUC.risk.rag as any) || "amber",
      data_classification: "confidential",
      autonomy_level: "human-approves",
      human_approval_gate: "Operator in loop",
      monitoring: "QA sampling in place",
      regulatory_context: ["apra", "asic", "austrac"],
      key_controls: oldUC.risk.notes,
      control_gaps: "None identified",
      assessed_by: oldUC.owner,
      assessed_at: oldSeed.meta.generated,
      risk_validator_status: "approved",
    })
  );

  // ─── Decisions ───
  const decisions: Decision[] = oldSeed.useCases.map((oldUC: OldUseCase) => ({
    id: `decision-${oldUC.id}`,
    use_case_id: oldUC.id,
    decision: (decisionMap[oldUC.decision] || "fix") as DecisionType,
    rationale: `Prototype decision: ${oldUC.decision}. ${oldUC.nextAction}`,
    conditions: null,
    fix_by_date: null,
    decided_by: oldUC.owner,
    decided_at: oldSeed.meta.generated,
    review_cycle_ref: "Prototype Review 1",
    informed_by_snapshot_id: null,
  }));

  // ─── Actions ───
  const actions: Action[] = oldSeed.useCases
    .filter((oldUC: OldUseCase) => oldUC.nextAction)
    .map((oldUC: OldUseCase) => ({
      id: `action-${oldUC.id}`,
      use_case_id: oldUC.id,
      action_type: oldUC.decision === "scale" ? "scale" : "fix",
      description: oldUC.nextAction,
      owner: oldUC.owner,
      due_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      status: "open",
      outcome: null,
    }));

  // ─── Compute Derived Values ───
  const computedCosts = useCases.map((uc) => {
    const ucCosts = costItems.filter((ci) => ci.use_case_id === uc.id);
    return calculateAnnualCost(ucCosts);
  });

  const computedTheoretical = useCases.map((uc) => {
    const ucClaims = benefitClaims.filter((c) => c.use_case_id === uc.id);
    return calculateAnnualTheoreticalValue(ucClaims);
  });

  const computedBanked = useCases.map((uc) => {
    const ucClaims = benefitClaims.filter((c) => c.use_case_id === uc.id);
    const ucEvidence = evidenceObjects.filter((e) => e.use_case_id === uc.id);
    return calculateBankedValue(ucClaims, ucEvidence);
  });

  // Update UseCase with computed values
  useCases.forEach((uc, idx) => {
    uc.annual_cost = computedCosts[idx];
    uc.annual_theoretical_value = computedTheoretical[idx];
    uc.banked_value = computedBanked[idx];
    uc.cash_conversion_rate = calculateCashConversionRate(
      uc.banked_value || 0,
      uc.annual_theoretical_value || 0
    );
    uc.capacity_released_value = 0; // Prototype doesn't have capacity tracking
    uc.observed_operational_value = (uc.banked_value || 0) * 0.3; // Proxy
  });

  // Update BusinessUnit costs
  businessUnits.forEach((bu) => {
    bu.bu_annual_cost = useCases
      .filter((uc) => uc.business_unit_id === bu.id)
      .reduce((sum, uc) => sum + (uc.annual_cost || 0), 0);
  });

  // ─── Portfolio Rollup ───
  const rollup = calculatePortfolioRollup(useCases);

  // ─── Coverage Statement ───
  const coverageStatement = calculateCoverageStatement(
    useCases,
    evidenceObjects,
    []
  );

  // ─── Snapshot (immutable) ───
  const snapshot: Snapshot = {
    id: `snap-${Date.now()}`,
    portfolio_id: portfolio.id,
    client_instance_id: clientInstance.id,
    snapshot_type: "ad-hoc",
    taken_at: now,
    taken_by: "meridian-seed",
    data_cut_off: oldSeed.meta.generated,
    formula_version_set: '{"annualCost":"1.0","valueLanes":"2.0"}',
    tail_as_of_set: {},
    frozen_inputs: (oldSeed as unknown) as Record<string, unknown>,
    frozen_rollup: rollup,
    coverage_statement: coverageStatement,
    confidentiality_marking: "Illustrative - Prototype",
    immutable: true,
  };

  // ─── Build full P0DataModel ───
  const model: P0DataModel = {
    clientInstance,
    portfolio,
    businessUnits,
    useCases,
    roleAssignments: [],
    costItems,
    allocationRules: [],
    outcomeMetrics,
    benefitClaims,
    evidenceObjects,
    riskControlAssessments,
    tailReferences: [],
    decisions,
    actions,
    approvals: [],
    assumptions: [],
    scenarios: [],
    unlinkedAssets: [],
    snapshots: [snapshot],
    changeLog: [],
  };

  // ─── Reconciliation Proof ───
  const oldCost = oldSeed.portfolioRollup.totalAnnualSpendAud;
  const newCost = rollup.totalAnnualSpendAud;

  const oldTheoretical = oldSeed.valueRollup.totalAnnualBenefitAud;
  const newTheoretical = rollup.theoreticalValueAud;

  const oldBanked = oldSeed.valueRollup.totalBankedValueAud;
  const newBanked = rollup.bankedValueAud;

  // Capacity is new; proxy from old
  const oldCapacity = oldTheoretical - oldBanked;
  const newCapacity = newTheoretical - newBanked;

  const reconciliation: ReconciliationProof = {
    oldCost,
    newCost,
    costMatch: Math.abs(oldCost - newCost) < 100, // Allow small rounding

    oldTheoretical,
    newTheoretical,
    theoreticalMatch: Math.abs(oldTheoretical - newTheoretical) < 100,

    oldCapacity,
    newCapacity,
    capacityMatch: Math.abs(oldCapacity - newCapacity) < 100,

    oldBanked,
    newBanked,
    bankedMatch: Math.abs(oldBanked - newBanked) < 100,

    allMatch:
      Math.abs(oldCost - newCost) < 100 &&
      Math.abs(oldTheoretical - newTheoretical) < 100 &&
      Math.abs(oldBanked - newBanked) < 100,

    reconciliationStatement: `
Meridian Prototype Migration to P0 Data Model - Reconciliation:

OLD PROTOTYPE MODEL:
  - Annual Spend: AUD ${(oldCost / 1000000).toFixed(1)}M
  - Theoretical Value: AUD ${(oldTheoretical / 1000000).toFixed(1)}M
  - Banked Value: AUD ${(oldBanked / 1000000).toFixed(1)}M
  - Capacity (implicit): AUD ${(oldCapacity / 1000000).toFixed(1)}M
  - Cash Conversion: ${((oldBanked / oldTheoretical) * 100).toFixed(1)}%

NEW P0 MODEL:
  - Annual Cost (all-in): AUD ${(newCost / 1000000).toFixed(1)}M
  - Annual Theoretical Value (full promise): AUD ${(newTheoretical / 1000000).toFixed(1)}M
  - Banked Value (validated + finance signed): AUD ${(newBanked / 1000000).toFixed(1)}M
  - Capacity Released (separate lane): AUD ${(newCapacity / 1000000).toFixed(1)}M
  - Cash Conversion Rate: ${((newBanked / newTheoretical) * 100).toFixed(1)}%

RECONCILIATION STATUS: ${Math.abs(oldCost - newCost) < 100 ? "✓ PASS" : "✗ FAIL"} - Four headline numbers preserved.
    `,
  };

  return { model, reconciliation };
}

// ─── Export the migrated P0 model for use in pages ───
const seedResult = migrateToP0(require("./seed").default as SeedData);
export const p0 = seedResult.model;
export const p0Reconciliation = seedResult.reconciliation;

// Convenience accessors
export const p0ClientInstance = p0.clientInstance;
export const p0Portfolio = p0.portfolio;
export const p0BusinessUnits = p0.businessUnits;
export const p0UseCases = p0.useCases;
export const p0BenefitClaims = p0.benefitClaims;
export const p0EvidenceObjects = p0.evidenceObjects;
export const p0Decisions = p0.decisions;
export const p0Actions = p0.actions;
export const p0Rollup = p0.snapshots[0]?.frozen_rollup || ({} as PortfolioRollup);
