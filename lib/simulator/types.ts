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
  /** Price verified against the vendor's own page — floor/routing eligible. */
  verified: boolean;
}

/** Low/mid/high token prior for one direction (input or output). */
export interface TokenPrior {
  low: number;
  mid: number;
  high: number;
}

/** Which forward-pricing read applies (CTO update v2, 0.2): a tracked-provider
 *  read, the open-weights read, or the neutral "not tracked — no forecast"
 *  state. "In-house / low jump risk" copy renders ONLY on the open state. */
export type ForwardState = "tracked" | "open" | "neutral";

/** The forward-pricing read for one provider (Q2). Numbers all originate in the data file. */
export interface ForwardSignal {
  state: ForwardState;
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

/**
 * The three-segment cost band (monthly, display currency = US$ unless the A$
 * toggle scales it). Beyond AI usage the cost is two plain buckets (CTO update
 * v2, 0.3): a MONTHLY FIXED floor plus PER-USE run cost — they must reconcile:
 * today = todayAiUsage + perUseRun + monthlyFixed.
 */
export interface CostBand {
  /** Cheapest model you'd consider, today, levers applied. */
  floor: number;
  floorAiUsage: number;
  /** The model the floor was computed from — null when no verified model is left to consider. */
  floorModelKey: string | null;
  /** Chosen model today, levers applied. */
  today: number;
  todayAiUsage: number;
  /** Chosen model if prices rise (AI usage × provider multiple), levers applied. */
  repriced: number;
  repricedAiUsage: number;
  /** The monthly FIXED floor — platform, monitoring, checking. Same in every segment. */
  monthlyFixed: number;
  /** Per-use run cost beyond the AI itself (per-unit marginals × units). */
  perUseRun: number;
  /** monthlyFixed + perUseRun — everything that isn't the AI usage itself. */
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
