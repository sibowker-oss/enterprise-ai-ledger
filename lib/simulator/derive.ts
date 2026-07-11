/**
 * One-config-in, everything-out derivation. The page, the printed board
 * summary and the exported scenario JSON all derive through this single
 * function, so no surface can disagree with another on the same inputs.
 *
 * CURRENCY: the engine computes costs in US$ (model prices are quoted US$).
 * With the A$ toggle on, the buyer's value entries are read as A$ and the
 * cost band is converted to A$ at the dated RBA rate BEFORE any comparison —
 * verdict, margin, break-even and budget all happen in one currency.
 */
import { ARCHETYPE_BY_KEY, type Archetype } from "./archetypes";
import { tokenPrior, USD_TO_AUD } from "./data";
import {
  applyHaircut,
  breakEvenHuman,
  combinedRealism,
  costBand,
  coverageRatio,
  txPerUnitMonthFor,
  usage,
  valueRange,
  verdict,
  type BreakEvenHuman,
  type UsageBreakdown,
} from "./engine";
import type { CostBand, ValueRange, Verdict } from "./types";
import type { Currency, SimConfig } from "./urlState";

export interface CaseSummary {
  config: SimConfig;
  currency: Currency;
  a: Archetype;
  u: UsageBreakdown;
  /** In the display currency (converted once, here, before any comparison). */
  band: CostBand;
  /** Business transactions a month (units × per-unit rate, before fan-out). */
  businessTx: number;
  /** The value range as entered (Q4 shows this). */
  value: ValueRange;
  /** The counted range after the realism discount (the verdict runs on this). */
  counted: ValueRange;
  /** Combined counted share (adoption×realisation×reliability), 0–100. */
  countedPct: number;
  verdict: Verdict;
  /** Margin of safety: counted value ÷ price-rise-case cost. */
  coverage: number;
  /** The stress read (A2): low counted value ÷ price-rise-case cost. */
  stressCoverage: number;
  breakEven: BreakEvenHuman;
}

const scaleBand = (b: CostBand, f: number): CostBand => ({
  ...b,
  floor: b.floor * f,
  floorAiUsage: b.floorAiUsage * f,
  today: b.today * f,
  todayAiUsage: b.todayAiUsage * f,
  repriced: b.repriced * f,
  repricedAiUsage: b.repricedAiUsage * f,
  monthlyFixed: b.monthlyFixed * f,
  perUseRun: b.perUseRun * f,
  buildAndRun: b.buildAndRun * f,
});

/** Display-currency conversion factor (1 for US$; RBA-dated for A$). */
export function currencyFactor(currency: Currency): number {
  return currency === "aud" ? USD_TO_AUD : 1;
}

export function deriveCase(config: SimConfig, currency: Currency = "usd"): CaseSummary {
  const a = ARCHETYPE_BY_KEY[config.archetypeKey];
  const priors = tokenPrior(a.priorKey);
  const txPerUnit = txPerUnitMonthFor(a, config.intensity);
  const u = usage(
    a,
    config.units,
    config.maturity,
    { input: priors.input, output: priors.output, fanOut: priors.fanOut },
    txPerUnit,
  );
  // The cost band runs on the levers as run NOW (A3) — planned savings are
  // shown separately, never silently banked into the headline cost.
  const bandUsd = costBand(
    a,
    config.modelKey,
    config.units,
    u.inputM,
    u.outputM,
    config.levers.now,
    config.excludedProviders,
  );
  const band = scaleBand(bandUsd, currencyFactor(currency));
  const businessTx = config.units * txPerUnit;
  const value = valueRange(a, config.units, businessTx, config.overrides);
  const countedPct = combinedRealism({
    adoption: config.adoption,
    realisation: config.realisation,
    reliability: config.reliability,
  });
  const counted = applyHaircut(value, countedPct);
  return {
    config,
    currency,
    a,
    u,
    band,
    businessTx,
    value,
    counted,
    countedPct,
    verdict: verdict(counted.base, band, a),
    coverage: coverageRatio(counted.base, band),
    stressCoverage: coverageRatio(counted.low, band),
    breakEven: breakEvenHuman(a, band, config.units, businessTx, config.overrides, countedPct),
  };
}
