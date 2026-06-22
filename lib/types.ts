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

export interface SeedData {
  meta: Meta;
  company: Company;
  portfolioRollup: PortfolioRollup;
  useCases: UseCase[];
}
