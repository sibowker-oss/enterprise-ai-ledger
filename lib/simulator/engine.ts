/**
 * The cost/value engine — the five-question math (handoff §3), driven entirely
 * by the four reference JSON files via lib/simulator/data.ts. No figures are
 * invented here; the selectors are unit-tested against the validated worked
 * example (code-assistant: $8,316 AI usage / $10,316 today / $52 per seat /
 * $19,464 if prices rise / $282 on the cheapest model, before levers).
 */
import type { CostBand, TokenPrior, ValueRange, Verdict } from "./types";
import type { Archetype } from "./archetypes";
import { isPerSeat, txWord, unitWord, WEEKS_PER_MONTH, WORKING_DAYS } from "./archetypes";
import {
  BATCH_MULTIPLIER,
  CACHE_READ_MULTIPLIER,
  billingEnvelopeCeiling,
  cacheHitBand,
  declaredCacheShare,
  isBatchable,
  layer4PerUnit,
  layer5PerUnit,
  modelPrice,
  monthlyFixedFloor,
  repricingMultiple,
  volumeHint,
} from "./data";
import { VERIFIED_MODEL_KEYS } from "./models";

/** Fraction off the cached input share (library prompt_caching: 0.1× read ⇒ 0.9 off). */
const CACHE_SAVING = 1 - CACHE_READ_MULTIPLIER;
/** Fraction off all tokens on batched work (library batch_flex: 0.5× ⇒ 0.5 off). */
const BATCH_SAVING = 1 - BATCH_MULTIPLIER;

/** Optimisation levers (Q3). All percentages 0–100. */
export interface Levers {
  /** Share of input reused/cached — ~90% off that portion. */
  cache: number;
  /** Share of work batched — ~50% off the batched share. */
  batch: number;
  /** Share of easy work routed to the cheapest model. */
  route: number;
}

export const NO_LEVERS: Levers = { cache: 0, batch: 0, route: 0 };
export const DEFAULT_LEVERS: Levers = { cache: 30, batch: 20, route: 0 };

/** Two lever settings per case (A3): what you do NOW (defaults to zero —
 *  "not doing this yet") and what you PLAN to do. The cost band runs on now;
 *  the planned settings render as separate, per-lever savings. */
export interface LeverPlan {
  now: Levers;
  planned: Levers;
}

/** The library's cache hit-rate class for an archetype's workload. */
function cacheClassFor(a: Archetype): string {
  if (a.workloadClass === "agentic") return "agentic";
  if (a.workloadClass === "chat_support") return "chat_support";
  return "single_shot_rag";
}

const snap5 = (n: number) => Math.round(n / 5) * 5;

/**
 * Per-archetype starting levers, sourced from the library (NOT arbitrary). Cache
 * starts at the use case's DECLARED realistic cache-read share where the library
 * gives one (agentic 0.8, deep research 0.6 — the input band already counts
 * cache reads, so that discount is intrinsic to a realistic estimate); otherwise
 * at the middle of the workload's evidenced hit-rate band. Batching is on only
 * where the library lists it as a real lever (interactive work isn't batchable);
 * routing off by default (it trades quality, so the buyer opts in).
 */
export function defaultLevers(a: Archetype): Levers {
  const declared = declaredCacheShare(a.priorKey);
  const [lo, hi] = cacheHitBand(cacheClassFor(a));
  const cache = declared != null ? snap5(declared * 100) : snap5(((lo + hi) / 2) * 100);
  return {
    cache,
    batch: isBatchable(a.priorKey) ? 30 : 0,
    route: 0,
  };
}

/** Per-archetype slider ceilings — cache can't exceed the workload's realistic
 *  hit rate; batch is unavailable for interactive work. */
export function leverCaps(a: Archetype): Levers {
  const [, hi] = cacheHitBand(cacheClassFor(a));
  return {
    cache: snap5(hi * 100),
    batch: isBatchable(a.priorKey) ? 100 : 0,
    route: 80,
  };
}

/**
 * User overrides for the Q4 value driver(s). low/likely/high are individually
 * editable (A2): lowDriver/highDriver are absolute driver values — when unset
 * they prefill at ×0.6 / ×1.4 of the likely driver, but the buyer owns all
 * three points, not a fixed spread.
 */
export interface ValueOverrides {
  driver?: number;
  rate?: number;
  lowDriver?: number;
  highDriver?: number;
}

/** The three driver points (low / likely / high) a value range is built from. */
export function driverPoints(
  a: Archetype,
  overrides: ValueOverrides,
): { low: number; likely: number; high: number } {
  const likely = overrides.driver ?? a.value.driver;
  return {
    low: overrides.lowDriver ?? likely * 0.6,
    likely,
    high: overrides.highDriver ?? likely * 1.4,
  };
}

/* ------------------------------------------------------------------ *
 * Usage intensity — how often each seat actually uses it.
 * ------------------------------------------------------------------ */

/**
 * The library's evidenced volume band for an archetype (e.g. code assistant
 * 10/30/80 uses per developer a day). DEFAULTS SIT AT MID — the typical rate,
 * not the heavy end — and the slider runs the full low–high band, so the heavy
 * end stays reachable without being the anchor. Null where the library carries
 * no volume hint (per-transaction archetypes: the units input IS the volume).
 */
export interface IntensityBand {
  low: number;
  mid: number;
  high: number;
  period: "day" | "week";
  /** The library's volume-hint key (copy maps it to a plain phrase). */
  unitPer: string;
}

export function intensityBand(a: Archetype): IntensityBand | null {
  if (!a.intensityPeriod) return null;
  const vh = volumeHint(a.priorKey);
  if (!vh) return null;
  return { low: vh.low, mid: vh.mid, high: vh.high, period: a.intensityPeriod, unitPer: vh.unitPer };
}

/** Monthly business transactions per unit at a chosen intensity (per day/week). */
export function txPerUnitMonthFor(a: Archetype, intensity: number | null): number {
  if (intensity == null || !a.intensityPeriod) return a.txPerUnitMonth;
  return intensity * (a.intensityPeriod === "week" ? WEEKS_PER_MONTH : WORKING_DAYS);
}

/**
 * The five maturity steps for one token prior. Index 0 = bloated (naive, high
 * usage) … 4 = lean (engineered, low usage). Mirrors the prototype's band():
 * [high, (high+mid)/2, mid, (mid+low)/2, low].
 */
export function maturityBand(prior: TokenPrior): number[] {
  const { low, mid, high } = prior;
  return [high, (high + mid) / 2, mid, (mid + low) / 2, low];
}

export const MATURITY_WORDS = ["bloated", "loose", "typical", "tight", "lean"] as const;

export interface UsageBreakdown {
  monthlyTx: number;
  inputTokensPer: number;
  outputTokensPer: number;
  /** Per-request background at the leanest setting (maturity 4). */
  inputTokensLean: number;
  inputM: number;
  outputM: number;
  /** Total monthly tokens at the current maturity. */
  totalTokens: number;
  /** Honest usage band by band_semantics: lean (engineered) … typical … bloated (naive). */
  usageBandLow: number;
  usageBandMid: number;
  usageBandHigh: number;
}

export function usage(
  a: Archetype,
  units: number,
  maturity: number,
  priors: { input: TokenPrior; output: TokenPrior; fanOut: number },
  /** Monthly business transactions per unit — defaults to the archetype's
   *  typical rate; the intensity slider passes txPerUnitMonthFor(a, intensity). */
  txPerUnitMonth: number = a.txPerUnitMonth,
): UsageBreakdown {
  const inBand = maturityBand(priors.input);
  const outBand = maturityBand(priors.output);
  // fan_out = model calls per interaction, sourced from the library (typical = mid).
  const monthlyTx = units * txPerUnitMonth * priors.fanOut;
  const inputTokensPer = inBand[maturity];
  const outputTokensPer = outBand[maturity];
  const inputM = (monthlyTx * inputTokensPer) / 1e6;
  const outputM = (monthlyTx * outputTokensPer) / 1e6;
  const totalAt = (i: number) => monthlyTx * (inBand[i] + outBand[i]);
  return {
    monthlyTx,
    inputTokensPer,
    outputTokensPer,
    inputTokensLean: inBand[4],
    inputM,
    outputM,
    totalTokens: totalAt(maturity),
    usageBandLow: totalAt(4), // lean / well-engineered (band_semantics low)
    usageBandMid: totalAt(2), // typical production (band_semantics mid)
    usageBandHigh: totalAt(0), // bloated / naive (band_semantics high)
  };
}

/**
 * The cheapest model you'd consider (A4): the lowest-cost VERIFIED model at
 * this workload's input/output mix, over the providers the user hasn't
 * excluded. Returns null when nothing qualifies — the UI renders an honest
 * empty state rather than inventing a floor. Facts + user choice only.
 */
export function consideredFloorKey(
  inputM: number,
  outputM: number,
  excludedProviders: string[] = [],
): string | null {
  let best: string | null = null;
  let bestCost = Infinity;
  for (const key of VERIFIED_MODEL_KEYS) {
    const m = modelPrice(key);
    if (excludedProviders.includes(m.provider)) continue;
    const cost = inputM * m.inputPerM + outputM * m.outputPerM;
    if (cost < bestCost) {
      bestCost = cost;
      best = key;
    }
  }
  return best;
}

/**
 * Layer-1 inference cost (monthly USD). With levers: caching (~90% off the
 * cached input share), routing (blend toward the cheapest considered model),
 * batching (~50% off the batched share). Faithful to the prototype's
 * inferenceCost(); routing is a no-op when no floor model qualifies.
 */
export function inferenceCost(
  modelKey: string,
  inputM: number,
  outputM: number,
  levers: Levers | null,
  floorKey: string | null = null,
): number {
  const m = modelPrice(modelKey);
  let costIn = inputM * m.inputPerM;
  let costOut = outputM * m.outputPerM;
  if (!levers) return costIn + costOut;

  // Billing levers only (consumption is already set by the maturity band —
  // methodology §5: consumption levers move you WITHIN the band, they never
  // stack on top of it). caching → cached input share; routing → blend price;
  // batching → all tokens. cache × batch is multiplicative (stacking_rules).
  costIn *= 1 - (levers.cache / 100) * CACHE_SAVING;
  if (levers.route > 0 && floorKey) {
    const cheap = modelPrice(floorKey);
    const blendIn = (1 - levers.route / 100) * m.inputPerM + (levers.route / 100) * cheap.inputPerM;
    const blendOut = (1 - levers.route / 100) * m.outputPerM + (levers.route / 100) * cheap.outputPerM;
    costIn = inputM * blendIn * (1 - (levers.cache / 100) * CACHE_SAVING);
    costOut = outputM * blendOut;
  }
  let total = costIn + costOut;
  total *= 1 - (levers.batch / 100) * BATCH_SAVING;
  return total;
}

/**
 * One lever's saving on its own (A3: show each lever's saving separately) —
 * the monthly dollars off the unoptimised bill if ONLY this lever ran at the
 * given setting, envelope-clamped like everything else.
 */
export function leverSaving(
  modelKey: string,
  inputM: number,
  outputM: number,
  lever: keyof Levers,
  pct: number,
  workloadClass: string,
  floorKey: string | null,
): number {
  const base = inferenceCost(modelKey, inputM, outputM, NO_LEVERS);
  const solo: Levers = { ...NO_LEVERS, [lever]: pct };
  const raw = inferenceCost(modelKey, inputM, outputM, solo, floorKey);
  const { cost } = clampToEnvelope(base, raw, workloadClass);
  return Math.max(0, base - cost);
}

/**
 * Clamp a billing-lever saving to the library's evidenced envelope for the
 * workload (stacking_rules.combined_envelopes_vs_naive_uncached_frontier). This
 * makes the "slider calculators double-count savings" failure structurally
 * impossible (methodology §5 / P6): the combined caching+batch+routing saving
 * can never exceed what the evidence supports for that workload class.
 * Returns the clamped optimised cost and whether the clamp bit.
 */
export function clampToEnvelope(
  baseCost: number,
  optimisedCost: number,
  workloadClass: string,
): { cost: number; clamped: boolean } {
  if (baseCost <= 0) return { cost: optimisedCost, clamped: false };
  const ceiling = billingEnvelopeCeiling(workloadClass);
  const floorCost = baseCost * (1 - ceiling);
  if (optimisedCost < floorCost) return { cost: floorCost, clamped: true };
  return { cost: optimisedCost, clamped: false };
}

/**
 * The MONTHLY FIXED floor — platform, monitoring, the people checking its
 * work. Carried in full whether one person uses it or a thousand (0.3: a
 * 1-unit deployment must show a sane fixed-floor cost, not $13/mo).
 */
export function fixedFloorCost(a: Archetype): number {
  return monthlyFixedFloor(a.key, a.costModel.floorTier);
}

/** PER-USE run cost beyond the AI itself: per-unit marginals × units. */
export function perUseRunCost(a: Archetype, units: number): number {
  const cm = a.costModel;
  let perUnit = 0;
  if (cm.l4Marginal) perUnit += layer4PerUnit(cm.l4Marginal.complexity, cm.l4Marginal.tier);
  if (cm.l5Marginal) perUnit += layer5PerUnit(cm.l5Marginal.governance, cm.l5Marginal.tier);
  return perUnit * units;
}

/** Everything that isn't the AI usage itself (the old "build & run" figure). */
export function buildAndRunCost(a: Archetype, units: number): number {
  return fixedFloorCost(a) + perUseRunCost(a, units);
}

/** The three-segment cost band: cheapest considered / your model today / your model if prices rise. */
export function costBand(
  a: Archetype,
  modelKey: string,
  units: number,
  inputM: number,
  outputM: number,
  levers: Levers,
  excludedProviders: string[] = [],
): CostBand {
  const monthlyFixed = fixedFloorCost(a);
  const perUseRun = perUseRunCost(a, units);
  const buildAndRun = monthlyFixed + perUseRun;
  const floorKey = consideredFloorKey(inputM, outputM, excludedProviders);
  // Clamp the chosen-model lever saving to the workload's evidenced envelope so
  // the sliders can't claim more than the library supports (no double-counting).
  const baseL1 = inferenceCost(modelKey, inputM, outputM, NO_LEVERS);
  const rawOptL1 = inferenceCost(modelKey, inputM, outputM, levers, floorKey);
  const { cost: optL1, clamped } = clampToEnvelope(baseL1, rawOptL1, a.workloadClass);
  // "Cheapest model you'd consider" = the verified floor over the considered
  // providers, OR your own model if you've already picked something cheaper —
  // the floor can never sit above today. The floor's lever saving is clamped
  // to the same envelope as the chosen model (no over-claiming on either bar).
  let floorL1 = optL1;
  if (floorKey) {
    const floorBase = inferenceCost(floorKey, inputM, outputM, NO_LEVERS);
    const floorRaw = inferenceCost(floorKey, inputM, outputM, levers, floorKey);
    floorL1 = Math.min(clampToEnvelope(floorBase, floorRaw, a.workloadClass).cost, optL1);
  }
  const multiple = repricingMultiple(modelPrice(modelKey).provider);
  return {
    floorAiUsage: floorL1,
    floor: floorL1 + buildAndRun,
    floorModelKey: floorKey,
    todayAiUsage: optL1,
    today: optL1 + buildAndRun,
    repricedAiUsage: optL1 * multiple,
    repriced: optL1 * multiple + buildAndRun,
    monthlyFixed,
    perUseRun,
    buildAndRun,
    leverClamped: clamped,
  };
}

/** Share of today's cost that is the AI usage itself (the cost-mix line). */
export function aiSharePct(band: CostBand): number {
  if (band.today <= 0) return 0;
  return Math.round((band.todayAiUsage / band.today) * 100);
}

/** Inference is the cost driver when it is at least this share of today's cost. */
export const AI_LED_THRESHOLD = 55;

/** Total-cost spread: repriced ÷ floor (the "same use case, N× gap" number). */
export function spreadMultiple(band: CostBand): number {
  return band.repriced / Math.max(band.floor, 1);
}

/**
 * Q4 — value as a low/likely/high range, each point individually editable
 * (A2 replaced the fixed ×0.6/×1.4 multipliers). Never a single number.
 *
 * `businessTx` is BUSINESS transactions a month (units × per-unit rate), NOT
 * model calls: the "$ saved per call/claim" driver prices the business event,
 * so the library's fan-out (model calls per event) must not inflate it. (It
 * previously did, over-counting value ~2–2.5× on the multi-call use cases.)
 */
export function valueRange(
  a: Archetype,
  units: number,
  businessTx: number,
  overrides: ValueOverrides,
): ValueRange {
  const v = a.value;
  const d = driverPoints(a, overrides);
  const monthly = (driver: number): number => {
    if (v.kind === "hours") {
      const r = overrides.rate ?? v.rate;
      return (units * driver * r * 52) / 12;
    }
    if (v.kind === "perTx") return businessTx * driver;
    return units * driver;
  };
  return { low: monthly(d.low), base: monthly(d.likely), high: monthly(d.high) };
}

/**
 * The realisation discount (Q4): not everyone uses it, and not all saved time
 * turns into output — so only this share of the entered value is counted before
 * the verdict. Applied against ourselves: the verdict runs on the counted
 * range, never the raw one. Default lives in simulator_input_rails.json.
 */
export function applyHaircut(range: ValueRange, haircutPct: number): ValueRange {
  const f = Math.max(0, Math.min(100, haircutPct)) / 100;
  return { low: range.low * f, base: range.base * f, high: range.high * f };
}

/**
 * Worst-case margin of safety: how many times the entered value covers the run
 * cost even if prices rise. This is what makes the verdict informative when the
 * headline answer is an obvious "yes" — a 12× margin and a 1.3× margin are both
 * "worth doing", but they are not the same decision.
 */
export function coverageRatio(valueBase: number, band: CostBand): number {
  return valueBase / Math.max(band.repriced, 1);
}

/** A wide margin of safety — above this the AI cost is no longer the deciding factor. */
export const WIDE_MARGIN = 3;

/* ------------------------------------------------------------------ *
 * Break-even in human units — the sanity-check any executive can run.
 * ------------------------------------------------------------------ */

/** The break-even restated in the archetype's own value units. */
export type BreakEvenHuman =
  | { kind: "minutesPerWeek"; minutes: number; unit: string }
  | { kind: "perTx"; usd: number; unit: string }
  | { kind: "perUnitMonth"; usd: number; unit: string };

/**
 * What the entered value driver would have to reach, per person or per
 * transaction, for the counted value to cover the worst-case running cost.
 * Uses the same arithmetic as valueRange in reverse, INCLUDING the realisation
 * discount — "save N minutes a week" means N nominal minutes, of which only
 * the counted share turns into output.
 */
export function breakEvenHuman(
  a: Archetype,
  band: CostBand,
  units: number,
  businessTx: number,
  overrides: ValueOverrides,
  haircutPct: number,
): BreakEvenHuman {
  const f = Math.max(1, haircutPct) / 100;
  const needed = band.repriced / f; // raw value that must be entered to cover the worst case
  const v = a.value;
  if (v.kind === "hours") {
    const rate = overrides.rate ?? v.rate;
    const hoursPerWeek = needed / (Math.max(units, 1) * Math.max(rate, 1) * (52 / 12));
    return { kind: "minutesPerWeek", minutes: hoursPerWeek * 60, unit: unitWord(a) };
  }
  if (v.kind === "perTx") {
    // The value is priced per business EVENT (call, claim, report) — which can
    // differ from the units noun (agents, analysts).
    return { kind: "perTx", usd: needed / Math.max(businessTx, 1), unit: txWord(a) };
  }
  return { kind: "perUnitMonth", usd: needed / Math.max(units, 1), unit: unitWord(a) };
}

/** Below this coverage of TODAY'S cost, the answer is a plain no, not "close". */
export const NO_THRESHOLD = 0.5;
/** Up to this coverage of today's cost the case is genuinely too close to call. */
export const CLOSE_THRESHOLD = 1.2;

/**
 * Q5 — the conditional verdict, comparing the counted value against the cost
 * band. Four klasses (good/conditional/marginal/no), pinned by engine.test. The
 * two upper states are unchanged; the old low state is split so a clear no
 * reads as a no (a tool that hedges "$0 of value" as "too close to call" reads
 * as unwilling to disappoint): under half of today's cost = doesn't pay; up to
 * ~1.2× of today's cost = genuinely too close to call.
 */
export function verdict(valueBase: number, band: CostBand, a: Archetype): Verdict {
  const perUnitUsage = isPerSeat(a) ? `usage per ${unitWord(a)}` : "usage per request";
  const keepCondition = `Keep the setup tight, don't let ${perUnitUsage} creep up, and switch to a cheaper model when it'll do the job.`;
  const todayCoverage = valueBase / Math.max(band.today, 1);

  if (valueBase >= band.repriced) {
    const wide = coverageRatio(valueBase, band) >= WIDE_MARGIN;
    return {
      klass: "good",
      label: wide ? "Pays off with room to spare" : "Pays off — but the margin is modest",
      headline: wide
        ? "The value covers the cost several times over, even if prices double — so the AI bill isn't really what decides this."
        : "The value still covers the cost even if prices double, but there isn't much room between them.",
      condition: keepCondition,
    };
  }
  if (valueBase >= band.today && todayCoverage >= CLOSE_THRESHOLD) {
    return {
      klass: "conditional",
      label: "Pays off at today's price — watch the margin",
      headline:
        "It pays off at today's prices, but a price rise could close the gap. The risk isn't whether it works — it's letting usage or price creep up without noticing.",
      condition: keepCondition,
    };
  }
  if (todayCoverage >= NO_THRESHOLD) {
    return {
      klass: "marginal",
      label: "Too close to call",
      headline:
        "On these numbers it's genuinely close — close enough that the value assumption decides it, not the maths.",
      condition:
        "Prove the value first — run a small pilot and measure what actually gets saved before committing.",
    };
  }
  return {
    klass: "no",
    label: "Doesn't pay on these numbers",
    headline:
      "The value entered doesn't come close to covering the cost. On these numbers this isn't worth doing — the case only changes if the value is far bigger than entered, or the cost falls a long way.",
    condition:
      "For this to be worth revisiting, the value would need to at least double, or the cost to halve — check the value figure first.",
  };
}
