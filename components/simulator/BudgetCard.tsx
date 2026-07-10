import { QCard } from "./QCard";
import { NumberField } from "./NumberField";
import { BUDGET } from "@/lib/simulator/labels";
import type { AdoptionRamp, BudgetLine } from "@/lib/simulator/budget";
import { buildRangeSentence, firstYearSentence, paybackSentence } from "@/lib/simulator/copy";
import { oneOffBuildAsOf } from "@/lib/simulator/data";
import { asOfLabel, usdK, type Cur } from "@/lib/simulator/format";

function Tile({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-tile border border-border bg-surface-muted p-3 text-center">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className="mt-1 text-[17px] font-bold tabular text-ink">{value}</div>
      <div className="mt-0.5 text-[10.5px] leading-tight text-ink-faint">{sub}</div>
    </div>
  );
}

/**
 * The first-year budget line: one-off build split from monthly run, an
 * editable adoption ramp, and the 12-month cumulative cost-vs-value picture
 * with the payback month — the version of the answer that can be dropped
 * into a budget paper. The plain sentences below the chart carry the same
 * information for screen readers; the bars are decorative reinforcement.
 */
export function BudgetCard({
  line,
  ramp,
  cur,
  onRamp,
}: {
  line: BudgetLine;
  ramp: AdoptionRamp;
  cur: Cur;
  onRamp: (ramp: AdoptionRamp) => void;
}) {
  const scaleMax = Math.max(
    line.months[line.months.length - 1].cumCost,
    line.months[line.months.length - 1].cumValue,
    1,
  );
  const barH = (v: number) => (v <= 0 ? 0 : Math.max(2, (v / scaleMax) * 100));
  return (
    <QCard num="12" title={BUDGET.title}>
      <p className="text-[14.5px] leading-relaxed text-ink-muted">{BUDGET.intro}</p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Tile
          label={BUDGET.buildLabel}
          value={`${usdK(line.build.low, cur)}–${usdK(line.build.high, cur)}`}
          sub={`typically about ${usdK(line.build.mid, cur)} — ${BUDGET.buildSub}`}
        />
        <Tile label={BUDGET.runLabel} value={`${usdK(line.monthlyRun, cur)}/mo`} sub={BUDGET.runSub} />
        <Tile
          label={BUDGET.paybackLabel}
          value={line.paybackMonth == null ? "—" : `month ${line.paybackMonth}`}
          sub={BUDGET.paybackSub}
        />
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
        {buildRangeSentence(line.build, cur)}
      </p>

      {/* The adoption ramp — a labelled, editable planning assumption (A6:
          validated numeric fields, no silent clamping). */}
      <div className="mt-4 rounded-tile border border-border bg-surface-muted p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink">
            {BUDGET.rampHeading}
          </span>
          <span className="text-[10.5px] text-ink-faint">{BUDGET.rampEditable}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap items-center gap-x-5 gap-y-2">
          <span className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            {BUDGET.rampStart}
            <NumberField
              id="ramp-start"
              label={BUDGET.rampStart}
              value={ramp.startPct}
              min={0}
              max={100}
              step={5}
              compact
              onChange={(n) => onRamp({ ...ramp, startPct: n })}
            />
          </span>
          <span className="flex items-center gap-2 text-[12.5px] text-ink-muted">
            {BUDGET.rampFull}
            <NumberField
              id="ramp-full"
              label={BUDGET.rampFull}
              value={ramp.fullMonth}
              min={1}
              max={12}
              step={1}
              compact
              onChange={(n) => onRamp({ ...ramp, fullMonth: n })}
            />
          </span>
        </div>
      </div>

      {/* 12-month cumulative view — paired bars, cost vs value, payback marked.
          The sentences below carry the story; the chart is reinforcement. */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-ink-muted">
          <span className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint">
            {BUDGET.chartHeading}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-ink-faint/60" aria-hidden="true" />
            {BUDGET.chartCost}
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" aria-hidden="true" />
            {BUDGET.chartValue}
          </span>
        </div>
        <div
          className="mt-2 grid grid-cols-12 gap-[3px] sm:gap-1"
          role="img"
          aria-label={`${paybackSentence(line)} ${firstYearSentence(line, cur)}`}
        >
          {line.months.map((m) => (
            <div key={m.month} className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end justify-center gap-[2px]" aria-hidden="true">
                <div
                  className="w-[38%] rounded-t-[2px] bg-ink-faint/60"
                  style={{ height: `${barH(m.cumCost)}%` }}
                  title={`Month ${m.month}: ${usdK(m.cumCost, cur)} out`}
                />
                <div
                  className="w-[38%] rounded-t-[2px] bg-accent"
                  style={{ height: `${barH(m.cumValue)}%` }}
                  title={`Month ${m.month}: ${usdK(m.cumValue, cur)} in`}
                />
              </div>
              <span
                aria-hidden="true"
                className={`text-[9px] tabular sm:text-[9.5px] ${
                  m.month === line.paybackMonth
                    ? "rounded-[3px] bg-accent-soft px-0.5 font-bold text-accent-text"
                    : "text-ink-faint"
                }`}
              >
                {m.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{paybackSentence(line)}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{firstYearSentence(line, cur)}</p>
      <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-snug text-ink-faint">
        One-off build figures are illustrative planning bands (as of {asOfLabel(oneOffBuildAsOf)}) — replace
        with your own quote. The monthly figures use today&rsquo;s prices from the cost box above.
      </p>
    </QCard>
  );
}
