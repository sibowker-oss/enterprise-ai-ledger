/**
 * Enterprise AI Ledger — P0 Calculation Formulas & Versioning
 *
 * Implements § 5 of the spec: all derived values are computed from retained inputs
 * by versioned formulas. No roll-up is ever typed. Input retention enables byte-for-byte
 * re-derivation from Snapshot frozen_inputs + formula_version_set.
 */

import {
  UseCase,
  ClientInstance,
  CostItem,
  BenefitClaim,
  EvidenceObject,
  PortfolioRollup,
  CostComponent,
  DecisionType,
  Rag,
  CoverageStatement,
  MaterialityTier,
  SourceType,
  Scenario,
  TailReference,
  EvidenceStatus,
  Confidence,
  determineMaterialityTriggers,
  determineMaterialityTier,
} from "./data-model";

// ────────────────────────────────────────────────────────────────────────────
// § 5.1 — Annual cost (all-in, fully loaded)
// ────────────────────────────────────────────────────────────────────────────

export function calculateAnnualCost(costItems: CostItem[]): number {
  return costItems.reduce((sum, item) => sum + item.amount_annual_aud, 0);
}

export function calculateCostByComponent(
  costItems: CostItem[]
): Record<CostComponent, number> {
  const components: Record<CostComponent, number> = {
    licences: 0,
    tokens: 0,
    cloud: 0,
    integration: 0,
    people: 0,
    other: 0,
  };

  costItems.forEach((item) => {
    components[item.cost_component] += item.amount_annual_aud;
  });

  return components;
}

// ────────────────────────────────────────────────────────────────────────────
// § 5.2 — The four value lanes (kept strictly separate)
// ────────────────────────────────────────────────────────────────────────────

/**
 * Annual theoretical value = all benefit claims, every status.
 * This is the FULL PROMISE (the conversion denominator per §5.3).
 * A claim stays counted here after it banks.
 */
export function calculateAnnualTheoreticalValue(
  benefitClaims: BenefitClaim[]
): number {
  return benefitClaims.reduce(
    (sum, claim) => sum + claim.claimed_value_annual_aud,
    0
  );
}

/**
 * Observed operational value = validated claims with status = observed-operational-improvement.
 */
export function calculateObservedOperationalValue(
  benefitClaims: BenefitClaim[],
  evidenceObjects: EvidenceObject[]
): number {
  const evidenceMap = new Map(evidenceObjects.map((e) => [e.id, e]));

  return benefitClaims
    .filter((claim) => claim.benefit_status === "observed-operational-improvement")
    .filter((claim) => {
      const evidence = evidenceMap.get(claim.primary_evidence_id);
      return evidence && evidence.status === "validated" && !evidence.is_stale;
    })
    .reduce((sum, claim) => sum + claim.claimed_value_annual_aud, 0);
}

/**
 * Capacity released value = validated claims with status = capacity-released.
 * NEVER added to banked value.
 */
export function calculateCapacityReleasedValue(
  benefitClaims: BenefitClaim[],
  evidenceObjects: EvidenceObject[]
): number {
  const evidenceMap = new Map(evidenceObjects.map((e) => [e.id, e]));

  return benefitClaims
    .filter((claim) => claim.benefit_status === "capacity-released")
    .filter((claim) => {
      const evidence = evidenceMap.get(claim.primary_evidence_id);
      return evidence && evidence.status === "validated" && !evidence.is_stale;
    })
    .reduce((sum, claim) => sum + claim.claimed_value_annual_aud, 0);
}

/**
 * Banked value = claims where is_banked = true (§5.4 gate).
 * Only budget-avoided | revenue-realised | risk-loss-avoided with required validators & evidence.
 */
export function calculateBankedValue(
  benefitClaims: BenefitClaim[],
  evidenceObjects: EvidenceObject[]
): number {
  const evidenceMap = new Map(evidenceObjects.map((e) => [e.id, e]));

  return benefitClaims
    .filter((claim) => {
      const evidence = evidenceMap.get(claim.primary_evidence_id);
      if (!evidence) return false;

      // Is_banked gate (§5.4)
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
    })
    .reduce((sum, claim) => sum + claim.claimed_value_annual_aud, 0);
}

// ────────────────────────────────────────────────────────────────────────────
// § 5.3 — Net value & cash conversion
// ────────────────────────────────────────────────────────────────────────────

export function calculateNetTheoreticalValue(
  theoreticalValue: number,
  annualCost: number
): number {
  return theoreticalValue - annualCost;
}

export function calculateBankedNetValue(
  bankedValue: number,
  annualCost: number
): number {
  return bankedValue - annualCost;
}

/**
 * Cash conversion rate = banked_value / annual_theoretical_value
 * Denominator is the FULL PROMISE (all claims, every status).
 * Ranges 0–1; reads 100% when a use case banks its whole promise.
 * Per v2 fix: never returns "n/a" — a use case with no claims reads 0.
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

// ────────────────────────────────────────────────────────────────────────────
// § 5.5 — Scenarios (price-stress, model-alternative, etc.)
// ────────────────────────────────────────────────────────────────────────────

export function calculateScenarioCost(
  scenario: Scenario,
  tail?: TailReference | null
): number {
  let multiplier = scenario.scenario_multiplier;

  // If this scenario consumes a TAIL reference, use the live TAIL value
  if (tail) {
    multiplier = tail.value;
  }

  return scenario.variable_cost * multiplier + scenario.fixed_cost;
}

/**
 * Determine if a scenario carries the "Scenario, not forecast" caveat.
 * True when: tail_reference.scenario_only OR scenario_type = price-stress.
 */
export function scenarioCarriesCaveat(
  scenario: Scenario,
  tail: TailReference | null | undefined
): boolean {
  const isPrice = scenario.scenario_type === "price-stress";
  const tailScenarioOnly = tail?.scenario_only ?? false;
  return isPrice || tailScenarioOnly;
}

// ────────────────────────────────────────────────────────────────────────────
// § 5.6 — Materiality & evidence score
// ────────────────────────────────────────────────────────────────────────────

/**
 * Determine materiality tier based on "any of" triggers (settled decision #1).
 * Integrated with UseCase determination of triggers.
 */
export function getMaterialityTier(
  useCase: UseCase,
  clientInstance: ClientInstance
): MaterialityTier {
  const triggers = determineMaterialityTriggers(useCase, clientInstance);
  return determineMaterialityTier(triggers);
}

/**
 * Calculate evidence score (0–100 composite).
 * Inputs: coverage (share of headline numbers backed by validated non-stale evidence),
 *         source_quality (finance-reconciled high → modelled/vendor-claimed lowest),
 *         freshness (penalty as evidence approaches expiry),
 *         validation (validator signed vs attested-only).
 *
 * Per spec [CALL]: this is a v1 tuning parameter; weights are configurable per config file.
 * For P0, use default weights.
 */
export function calculateEvidenceScore(
  benefitClaims: BenefitClaim[],
  evidenceObjects: EvidenceObject[]
): number {
  if (benefitClaims.length === 0) {
    return 0;
  }

  const evidenceMap = new Map(evidenceObjects.map((e) => [e.id, e]));

  // Coverage: share of headline-eligible claims backed by validated non-stale evidence
  const headlineEligibleClaims = benefitClaims.filter((claim) =>
    ["budget-avoided", "revenue-realised", "risk-loss-avoided"].includes(
      claim.benefit_status
    )
  );

  if (headlineEligibleClaims.length === 0) {
    return 0;
  }

  const coveredClaims = headlineEligibleClaims.filter((claim) => {
    const evidence = evidenceMap.get(claim.primary_evidence_id);
    return evidence && evidence.status === "validated" && !evidence.is_stale;
  });

  const coverage = coveredClaims.length / headlineEligibleClaims.length;

  // Source quality: higher score for better source types
  const sourceQualityWeights: Record<SourceType, number> = {
    "finance-reconciled": 1.0,
    observed: 0.9,
    "system-telemetry": 0.85,
    "client-attested": 0.7,
    "external-benchmark": 0.6,
    "vendor-claimed": 0.2,
    modelled: 0.1,
  };

  const avgSourceQuality =
    coveredClaims.reduce((sum, claim) => {
      const evidence = evidenceMap.get(claim.primary_evidence_id);
      return sum + (evidence ? sourceQualityWeights[evidence.source_type] : 0);
    }, 0) / (coveredClaims.length || 1);

  // Validation: validator signed (+0.2) vs attested-only (0)
  const validationBonus =
    coveredClaims.filter((claim) => evidenceMap.get(claim.primary_evidence_id)?.validated_by)
      .length / (coveredClaims.length || 1) * 0.2;

  // Freshness: penalty for approaching expiry (simplified: full points if < 30 days to expiry)
  const now = new Date();
  const freshnessScores = coveredClaims.map((claim) => {
    const evidence = evidenceMap.get(claim.primary_evidence_id);
    if (!evidence) return 0;
    const daysToExpiry =
      (new Date(evidence.expires_at).getTime() - now.getTime()) /
      (1000 * 60 * 60 * 24);
    if (daysToExpiry < 0) return 0;
    if (daysToExpiry > 30) return 1.0;
    return daysToExpiry / 30;
  });

  const avgFreshness =
    freshnessScores.reduce((a, b) => a + b, 0) / (freshnessScores.length || 1);

  // Composite: weighted average of coverage, source quality, freshness, validation
  // Default weights (tunable per config)
  const weights = {
    coverage: 0.3,
    sourceQuality: 0.3,
    freshness: 0.2,
    validation: 0.2,
  };

  const composite =
    coverage * weights.coverage +
    avgSourceQuality * weights.sourceQuality +
    avgFreshness * weights.freshness +
    (avgSourceQuality * validationBonus) * weights.validation;

  return Math.round(composite * 100);
}

// ────────────────────────────────────────────────────────────────────────────
// § 5.7 / 5.8 — Portfolio roll-ups (pure selectors, never typed)
// ────────────────────────────────────────────────────────────────────────────

export function calculatePortfolioRollup(
  useCases: UseCase[]
): PortfolioRollup {
  const rollup: PortfolioRollup = {
    totalAnnualSpendAud: 0,
    useCaseCount: useCases.length,
    businessUnits: 0,
    vendorsInUse: 0,
    spendByDecision: {
      scale: 0,
      "continue-with-conditions": 0,
      fix: 0,
      pause: 0,
      stop: 0,
      "return-to-discovery": 0,
    },
    countByDecision: {
      scale: 0,
      "continue-with-conditions": 0,
      fix: 0,
      pause: 0,
      stop: 0,
      "return-to-discovery": 0,
    },
    spendByRisk: {
      green: 0,
      amber: 0,
      red: 0,
    },
    countByRisk: {
      green: 0,
      amber: 0,
      red: 0,
    },
    spendByCostType: {
      licences: 0,
      tokens: 0,
      cloud: 0,
      integration: 0,
      people: 0,
      other: 0,
    },
    reclaimableAnnualSpendAud: 0,
    atRiskUnmanagedSpendAud: 0,
    bankedValueAud: 0,
    theoreticalValueAud: 0,
    cashConversionRate: 0,
  };

  useCases.forEach((uc) => {
    rollup.totalAnnualSpendAud += uc.annual_cost ?? 0;

    // By decision
    rollup.spendByDecision[uc.current_decision] += uc.annual_cost ?? 0;
    rollup.countByDecision[uc.current_decision]++;

    // By risk
    if (uc.risk_rating) {
      rollup.spendByRisk[uc.risk_rating] += uc.annual_cost ?? 0;
      rollup.countByRisk[uc.risk_rating]++;
    }

    // By cost type (aggregate from cost breakdown)
    // Note: this would need the CostItem breakdown; for now simplified

    // Banked vs theoretical
    rollup.bankedValueAud += uc.banked_value ?? 0;
    rollup.theoreticalValueAud += uc.annual_theoretical_value ?? 0;

    // Reclaimable spend: pause + stop
    if (["pause", "stop"].includes(uc.current_decision)) {
      rollup.reclaimableAnnualSpendAud += uc.annual_cost ?? 0;
    }

    // At-risk unmanaged spend: red risk
    if (uc.risk_rating === "red") {
      rollup.atRiskUnmanagedSpendAud += uc.annual_cost ?? 0;
    }
  });

  // Distinct counts
  const uniqueBusinessUnits = new Set(useCases.map((uc) => uc.business_unit_id));
  rollup.businessUnits = uniqueBusinessUnits.size;

  const uniqueVendors = new Set(useCases.map((uc) => uc.vendor));
  rollup.vendorsInUse = uniqueVendors.size;

  // Cash conversion rate
  rollup.cashConversionRate = calculateCashConversionRate(
    rollup.bankedValueAud,
    rollup.theoreticalValueAud
  );

  return rollup;
}

// ────────────────────────────────────────────────────────────────────────────
// § 5.9 — Coverage statement (data-quality banner)
// ────────────────────────────────────────────────────────────────────────────

export function calculateCoverageStatement(
  useCases: UseCase[],
  evidenceObjects: EvidenceObject[],
  tailReferences: TailReference[]
): CoverageStatement {
  // Assessed use cases: those with banked value > 0 or validated evidence
  const assessedCount = useCases.filter(
    (uc) =>
      (uc.banked_value ?? 0) > 0 ||
      evidenceObjects.some(
        (ev) => ev.use_case_id === uc.id && ev.status === "validated"
      )
  ).length;

  // Reconciled spend: sum of costs backed by finance-reconciled evidence
  const reconciledSpend = useCases.reduce((sum, uc) => {
    const reconciledCosts = evidenceObjects
      .filter(
        (ev) =>
          ev.use_case_id === uc.id &&
          ev.source_type === "finance-reconciled" &&
          ev.status === "validated" &&
          !ev.is_stale
      )
      .map((ev) => ev.claim_value ?? 0)
      .reduce((a, b) => a + b, 0);

    return sum + reconciledCosts;
  }, 0);

  // Pending validations: evidence objects in attested or draft status
  const pendingCount = evidenceObjects.filter((ev) =>
    ["attested", "draft"].includes(ev.status)
  ).length;

  // Stale evidence: expired status or is_stale = true
  const staleCount = evidenceObjects.filter(
    (ev) => ev.status === "expired" || ev.is_stale
  ).length;

  // Expired TAIL references
  const expiredTailCount = tailReferences.filter((tr) => tr.is_expired).length;

  return {
    assessed_use_cases: assessedCount,
    total_use_cases: useCases.length,
    reconciled_spend_aud: Math.round(reconciledSpend),
    total_spend_aud: Math.round(
      useCases.reduce((sum, uc) => sum + (uc.annual_cost ?? 0), 0)
    ),
    pending_validations: pendingCount,
    stale_evidence_count: staleCount,
    expired_tail_refs: expiredTailCount,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Formula versioning (§5.8)
// ────────────────────────────────────────────────────────────────────────────

export const FORMULA_VERSION_SET = {
  annualCost: "1.0",
  valueLanes: "2.0", // v2 fix: full-promise denominator for cash conversion
  scenarios: "1.0",
  materiality: "1.0",
  evidenceScore: "1.0",
  rollups: "1.0",
  coverageStatement: "1.0",
} as const;

/**
 * Serialize formula version set for Snapshot.
 */
export function serializeFormulaVersionSet(): string {
  return JSON.stringify(FORMULA_VERSION_SET);
}
