/**
 * The first-year budget line (CTO review 2026-07-10 item 2): one-off build
 * split from monthly run, a 12-month cumulative cost-vs-value view under a
 * simple editable adoption ramp, and the payback month. Pure functions over
 * the cost band — every dollar figure originates in the reference JSON
 * (one_off_build / adoption_ramp_default via data.ts) or in the user's own
 * value inputs. Nothing is priced here.
 */
import type { CostBand, ValueRange } from "./types";
import { adoptionRampDefault, oneOffBuild, type OneOffBuildBand } from "./data";

export interface AdoptionRamp {
  /** Adoption in month 1, percent (0–100). */
  startPct: number;
  /** First month at 100% adoption (≥ 1). */
  fullMonth: number;
}

export const DEFAULT_RAMP: AdoptionRamp = adoptionRampDefault();

/** Clamp a user-edited ramp to sane bounds (soft inputs, hard math). */
export function clampRamp(ramp: AdoptionRamp): AdoptionRamp {
  return {
    startPct: Math.max(0, Math.min(100, Math.round(ramp.startPct))),
    fullMonth: Math.max(1, Math.min(12, Math.round(ramp.fullMonth))),
  };
}

/** Adoption share (0–1) in a given month: linear from startPct (m1) to 100% (fullMonth). */
export function adoptionAt(month: number, ramp: AdoptionRamp): number {
  const r = clampRamp(ramp);
  if (r.fullMonth <= 1 || month >= r.fullMonth) return 1;
  const start = r.startPct / 100;
  return start + ((1 - start) * (month - 1)) / (r.fullMonth - 1);
}

export interface BudgetMonth {
  month: number;
  /** Adoption share this month, 0–1. */
  adoption: number;
  /** Cost this month: the per-use buckets (AI + per-unit run) scale with
   *  adoption; the monthly fixed floor is carried in full from month 1. */
  cost: number;
  /** Counted value this month (haircut value × adoption). */
  value: number;
  /** Cumulative cost including the one-off build (mid). */
  cumCost: number;
  cumValue: number;
}

export interface BudgetLine {
  /** One-off build band (USD, from the reference data). */
  build: OneOffBuildBand;
  /** Steady-state monthly run at full adoption (today's cost). */
  monthlyRun: number;
  months: BudgetMonth[];
  /** First month cumulative value covers cumulative cost (mid build), or null within 12. */
  paybackMonth: number | null;
  /** Cumulative cost at month 12 — the first-year total a budget paper quotes. */
  firstYearCost: number;
  firstYearValue: number;
}

/**
 * The 12-month line. Costs use TODAY'S price (the band's middle segment):
 * the PER-USE buckets (AI usage + per-unit run) scale with adoption, the
 * MONTHLY FIXED floor is carried in full from month 1 (the platform runs
 * whether or not everyone has moved over — 0.3's bucket split). Value is the
 * COUNTED (realisation-discounted) base, scaled by the same adoption share.
 * Payback is computed against the mid one-off build.
 */
export function budgetLine(
  archetypeKey: string,
  band: CostBand,
  countedValue: ValueRange,
  ramp: AdoptionRamp,
): BudgetLine {
  const build = oneOffBuild(archetypeKey);
  const months: BudgetMonth[] = [];
  let cumCost = build.mid;
  let cumValue = 0;
  let paybackMonth: number | null = null;
  for (let m = 1; m <= 12; m++) {
    const adoption = adoptionAt(m, ramp);
    const cost = (band.todayAiUsage + band.perUseRun) * adoption + band.monthlyFixed;
    const value = countedValue.base * adoption;
    cumCost += cost;
    cumValue += value;
    if (paybackMonth == null && cumValue >= cumCost) paybackMonth = m;
    months.push({ month: m, adoption, cost, value, cumCost, cumValue });
  }
  return {
    build,
    monthlyRun: band.today,
    months,
    paybackMonth,
    firstYearCost: cumCost,
    firstYearValue: cumValue,
  };
}
