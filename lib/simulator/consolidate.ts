/**
 * The consolidated business case: every saved case re-derived through the same
 * engine as the calculator (records are never trusted), converted into ONE
 * display currency at the dated RBA rate, and rolled up into the figures a
 * budget paper needs — total one-off build, combined monthly run today and in
 * the price-rise case, combined counted value, overall margin of safety,
 * portfolio payback month, and the first-year cash picture.
 */
import { AUD_USD, USD_TO_AUD } from "./data";
import { budgetLine, type BudgetLine } from "./budget";
import { currencyFactor, deriveCase, type CaseSummary } from "./derive";
import { parseScenario, type UseCaseScenario } from "./scenario";
import type { Currency, SimState } from "./urlState";

/** Factor converting figures in `from` currency into `to` currency. */
export function crossFactor(from: Currency, to: Currency): number {
  if (from === to) return 1;
  return to === "aud" ? USD_TO_AUD : AUD_USD;
}

export interface ConsolidatedRow {
  /** The sanitised state — also what "open in the calculator" serialises. */
  state: Pick<SimState, "current" | "ramp" | "currency">;
  /** Re-derived in the case's own saved currency. */
  s: CaseSummary;
  line: BudgetLine;
  /** The scenario as stored (for per-row file download). */
  scenario: UseCaseScenario;
  /** Figures converted into the PAGE currency. */
  monthlyToday: number;
  monthlyRise: number;
  countedValue: number;
  oneOffBuild: number;
  firstYearCost: number;
  firstYearValue: number;
}

export interface Consolidation {
  cur: Currency;
  rows: ConsolidatedRow[];
  totals: {
    oneOffBuild: number;
    monthlyToday: number;
    monthlyRise: number;
    countedValue: number;
    /** Combined counted value ÷ combined price-rise cost. */
    coverage: number;
    firstYearCost: number;
    firstYearValue: number;
    /** First month the combined cumulative value covers the combined
     *  cumulative cost (each case on its own ramp), or null within 12. */
    paybackMonth: number | null;
    verdicts: Record<"good" | "conditional" | "marginal" | "no", number>;
  };
}

export function consolidate(cases: UseCaseScenario[], pageCur: Currency): Consolidation {
  const rows: ConsolidatedRow[] = [];
  for (const raw of cases) {
    const parsed = parseScenario(JSON.stringify(raw));
    if (!parsed.ok) continue; // foreign/corrupt entries simply don't consolidate
    const { current, ramp, currency } = parsed;
    const s = deriveCase(current, currency);
    const line = budgetLine(
      s.a.key,
      s.band,
      s.counted,
      ramp,
      current.buildOverride,
      currencyFactor(currency),
    );
    const f = crossFactor(currency, pageCur);
    rows.push({
      state: { current, ramp, currency },
      s,
      line,
      scenario: raw,
      monthlyToday: s.band.today * f,
      monthlyRise: s.band.repriced * f,
      countedValue: s.counted.base * f,
      oneOffBuild: line.buildUsed * f,
      firstYearCost: line.firstYearCost * f,
      firstYearValue: line.firstYearValue * f,
    });
  }

  const sum = (pick: (r: ConsolidatedRow) => number) => rows.reduce((t, r) => t + pick(r), 0);
  const monthlyRise = sum((r) => r.monthlyRise);
  const countedValue = sum((r) => r.countedValue);

  // Portfolio payback: month-by-month combined cumulatives, each case on its
  // own ramp and build, converted before summing.
  let paybackMonth: number | null = null;
  for (let m = 0; m < 12 && rows.length > 0; m++) {
    let cost = 0;
    let value = 0;
    for (const r of rows) {
      const f = crossFactor(r.state.currency, pageCur);
      cost += r.line.months[m].cumCost * f;
      value += r.line.months[m].cumValue * f;
    }
    if (value >= cost) {
      paybackMonth = m + 1;
      break;
    }
  }

  const verdicts = { good: 0, conditional: 0, marginal: 0, no: 0 };
  for (const r of rows) verdicts[r.s.verdict.klass] += 1;

  return {
    cur: pageCur,
    rows,
    totals: {
      oneOffBuild: sum((r) => r.oneOffBuild),
      monthlyToday: sum((r) => r.monthlyToday),
      monthlyRise,
      countedValue,
      coverage: countedValue / Math.max(monthlyRise, 1),
      firstYearCost: sum((r) => r.firstYearCost),
      firstYearValue: sum((r) => r.firstYearValue),
      paybackMonth,
      verdicts,
    },
  };
}
