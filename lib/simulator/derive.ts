/**
 * One-config-in, everything-out derivation. The page, the pinned-case compare
 * tray and the printed board summary all derive through this single function,
 * so a pinned case can never disagree with the live walk on the same inputs.
 */
import { ARCHETYPE_BY_KEY, type Archetype } from "./archetypes";
import { tokenPrior } from "./data";
import {
  applyHaircut,
  breakEvenHuman,
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
import type { SimConfig } from "./urlState";

export interface CaseSummary {
  config: SimConfig;
  a: Archetype;
  u: UsageBreakdown;
  band: CostBand;
  /** Business transactions a month (units × per-unit rate, before fan-out). */
  businessTx: number;
  /** The value range as entered (Q4 shows this). */
  value: ValueRange;
  /** The counted range after the realisation discount (the verdict runs on this). */
  counted: ValueRange;
  verdict: Verdict;
  /** Margin of safety: counted value ÷ worst-case cost. */
  coverage: number;
  breakEven: BreakEvenHuman;
}

export function deriveCase(config: SimConfig): CaseSummary {
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
  const band = costBand(a, config.modelKey, config.units, u.inputM, u.outputM, config.levers);
  const businessTx = config.units * txPerUnit;
  const value = valueRange(a, config.units, businessTx, config.overrides);
  const counted = applyHaircut(value, config.haircut);
  return {
    config,
    a,
    u,
    band,
    businessTx,
    value,
    counted,
    verdict: verdict(counted.base, band, a),
    coverage: coverageRatio(counted.base, band),
    breakEven: breakEvenHuman(a, band, config.units, businessTx, config.overrides, config.haircut),
  };
}
