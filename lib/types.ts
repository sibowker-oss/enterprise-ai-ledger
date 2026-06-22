/**
 * Data model for the Enterprise AI Ledger prototype.
 *
 * These types describe the shape of `data/seed-data.json` (the single source of
 * truth). The JSON is authored by hand from the strategy pack; the types here
 * are the contract the selectors and UI bind to. Keep them in sync with the
 * JSON — `lib/seed.ts` casts the imported JSON to `SeedData`, so a drift in the
 * JSON shape surfaces as a type error there first.
 */

export type Decision = "scale" | "fix" | "stop";
export type RAG = "green" | "amber" | "red";
export type Confidence = "low" | "medium" | "medium-high" | "high";

/** The five cost components plus their reconciled annual total. */
export interface CostBreakdown {
  licences: number;
  tokens: number;
  cloud: number;
  integration: number;
  people: number;
  totalAnnual: number;
}

/** Just the five components — used for cost-mix aggregation (no total). */
export type CostComponent = Exclude<keyof CostBreakdown, "totalAnnual">;

export interface Outcome {
  primaryMetric: string;
  baseline: string;
  target: string;
  evidence: string;
  confidence: Confidence;
  reviewDate: string;
}

export interface Risk {
  rag: RAG;
  notes: string;
}

/**
 * Quantified annual financial benefit (BUILD addendum: CFOs need dollarised ROI,
 * not operational metrics). `annualBenefitAud` is the defensible/realised benefit;
 * `basis` is the CFO-readable calculation + caveats. Trust in the benefit reuses
 * the use case's `outcome.confidence` (high/medium-high == evidence-backed).
 */
export interface ValueBlock {
  annualBenefitAud: number;
  basis: string;
}

export interface UseCase {
  id: string;
  name: string;
  businessUnit: string;
  owner: string;
  vendor: string;
  model: string;
  userGroup: string;
  workflow: string;
  currentState: string;
  aiRole: string;
  cost: CostBreakdown;
  outcome: Outcome;
  risk: Risk;
  value: ValueBlock;
  decision: Decision;
  nextAction: string;
}

export interface Company {
  name: string;
  shortName: string;
  fictional: boolean;
  sector: string;
  headquarters: string;
  profile: string;
  sponsor: string;
  fiscalYear: string;
  headlineQuestion: string;
}

export interface Meta {
  schemaVersion: string;
  generated: string;
  currency: string;
  period: string;
  disclaimer: string;
  decisionLegend: Record<Decision, string>;
  ragLegend: Record<RAG, string>;
  confidenceLegend: Confidence[];
}

/**
 * Pre-computed portfolio roll-up baked into the JSON. The selectors in
 * `lib/portfolio.ts` recompute the line-item-derived fields from `useCases`
 * and the test asserts they match this block — so charts and the JSON can
 * never silently drift.
 *
 * `businessUnits` and `vendorsInUse` are editorial headline counts (they do
 * NOT equal a naive distinct-count of the granular `businessUnit` / `vendor`
 * fields) and are treated as declared metadata, not recomputed selectors.
 */
export interface PortfolioRollup {
  totalAnnualSpendAud: number;
  useCaseCount: number;
  businessUnits: number;
  vendorsInUse: number;
  spendByDecision: Record<Decision, number>;
  countByDecision: Record<Decision, number>;
  spendByRisk: Record<RAG, number>;
  countByRisk: Record<RAG, number>;
  spendByCostType: Record<CostComponent, number>;
  reclaimableAnnualSpendAud: number;
  atRiskUnmanagedSpendAud: number;
  headlines: string[];
}

/** Declared value/ROI aggregates — the selectors in lib/portfolio.ts recompute
 *  and assert against these (same discipline as PortfolioRollup). */
export interface ValueRollup {
  totalAnnualBenefitAud: number;
  netValueAud: number;
  portfolioRoiPct: number;
  evidenceBackedBenefitAud: number;
  evidenceBackedCostAud: number;
  evidenceBackedNetValueAud: number;
  evidenceBackedRoiPct: number;
  unprovenBenefitAud: number;
  unprovenCostAud: number;
  unprovenNetValueAud: number;
  benefitByDecision: Record<Decision, number>;
  netValueByDecision: Record<Decision, number>;
}

export interface SeedData {
  meta: Meta;
  company: Company;
  portfolioRollup: PortfolioRollup;
  valueRollup: ValueRollup;
  useCases: UseCase[];
}

// ── The AI Ledger benchmark snapshot (data/ledger-benchmarks.json) ───────────
export interface Benchmarks {
  meta: {
    source: string;
    sourceUrl: string;
    asOf: string;
    note: string;
    fx: { audPerUsd: number; note: string };
  };
  tokenEconomics: {
    blendedGatewayUsdPerMillionTokens: number;
    basis: string;
    frontierNote: string;
  };
  subsidyEconomics: {
    customerRevenueUsdB: number;
    vcSubsidyUsdB: number;
    systemCostUsdB: number;
    subsidyPerRevenueDollar: number;
    customerCostRecoveryPct: number;
    priceToCostRecoveryMultiple: number;
    basis: string;
    implication: string;
  };
  marketScale: {
    cumulativeCapexUsdB: number;
    cumulativeTokensTrillions: number;
    customerRevenueGrossUsdB: number;
    basis: string;
  };
}
