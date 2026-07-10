/**
 * Investment-Case Simulator — shared types.
 *
 * The public teaser reads ONLY the four committed reference JSON files
 * (data/simulator/benchmark_*.json). These types describe that data and the
 * derived shapes the engine produces. No live TAIL export, no client data, no
 * cohort data crosses this boundary (the data-line hard rule / concept.md §5).
 */

/** Provenance tier shown on the forward-pricing (Q2) figures. */
export type ProvenanceTier = "audited" | "derived" | "illustrative";

/** Maturity slider index: 0 = bloated (naive, high usage) … 4 = lean (engineered, low usage). */
export type MaturityStep = 0 | 1 | 2 | 3 | 4;

/** A single model from the price sheet, in USD per million tokens. */
export interface ModelPrice {
  /** Stable key from benchmark_price_sheet.json, e.g. "claude_sonnet_4_6". */
  key: string;
  /** Lower-case provider from the price sheet, e.g. "anthropic". */
  provider: string;
  /** USD per 1,000,000 input tokens. */
  inputPerM: number;
  /** USD per 1,000,000 output tokens. */
  outputPerM: number;
}

/** A model as surfaced in the UI (price + presentation label + provider display name). */
export interface Model extends ModelPrice {
  label: string;
  providerLabel: string;
}

/** Low/mid/high token prior for one direction (input or output). */
export interface TokenPrior {
  low: number;
  mid: number;
  high: number;
}

/** The forward-pricing read for one provider (Q2). Numbers all originate in the data file. */
export interface ForwardSignal {
  tracked: boolean;
  tier: ProvenanceTier;
  /** Cents-on-the-dollar customers cover, e.g. 38 → "you pay about 38%". Null if untracked. */
  costRecoveryPct: number | null;
  /** Operating loss ÷ sales, e.g. 56 → "losing 56%". Null where not derivable. */
  underwaterPct: number | null;
  /** Sales per employee in USD millions, e.g. 3.1. Null where not derivable. */
  revenuePerEmployeeUsdM: number | null;
  valuationToArr: number | null;
  /** Structural headroom before cost recovery, e.g. 2.6× — the "if prices rise" multiplier. */
  repricingMultiple: number;
  direction: string;
  reason: string;
}

/** The three-segment cost band (monthly USD), each split into AI usage + build & run. */
export interface CostBand {
  /** Cheapest model today, levers applied. */
  floor: number;
  floorAiUsage: number;
  /** Chosen model today, levers applied. */
  today: number;
  todayAiUsage: number;
  /** Chosen model if prices rise (AI usage × provider multiple), levers applied. */
  repriced: number;
  repricedAiUsage: number;
  /** Build & run cost — identical across all three segments (integration + risk carry). */
  buildAndRun: number;
  /** True when the billing-lever saving was capped to the library's evidenced
   *  envelope (stacking_rules) — i.e. the sliders tried to over-claim. */
  leverClamped: boolean;
}

/** Bear/base/bull value range (monthly USD). Never a single number (D4). */
export interface ValueRange {
  low: number;
  base: number;
  high: number;
}

export type VerdictClass = "good" | "conditional" | "marginal" | "no";

export interface Verdict {
  klass: VerdictClass;
  /** Plain, non-colour label, e.g. "Worth doing — with care". */
  label: string;
  /** One-sentence headline consequence. */
  headline: string;
  /** The named condition(s) that make it true or false. */
  condition: string;
}
