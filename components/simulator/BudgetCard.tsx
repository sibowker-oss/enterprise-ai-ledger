import { QCard } from "./QCard";
import { BUDGET } from "@/lib/simulator/labels";
import type { AdoptionRamp, BudgetLine } from "@/lib/simulator/budget";
import { buildRangeSentence, firstYearSentence, paybackSentence } from "@/lib/simulator/copy";
import { oneOffBuildAsOf } from "@/lib/simulator/data";
import { asOfLabel, usdK } from "@/lib/simulator/format";

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
 * The first-year budget line (CTO review item 2): one-off build split from
 * monthly run, an editable adoption ramp, and the 12-month cumulative
 * cost-vs-value picture with the payback month — the version of the answer
 * that can be dropped into a budget paper.
 */
export function BudgetCard({
  line,
  ramp,
  onRamp,
}: {
  line: BudgetLine;
  ramp: AdoptionRamp;
  onRamp: (ramp: AdoptionRamp) => void;
}) {
  const scaleMax = Math.max(
    line.months[line.months.length - 1].cumCost,
    line.months[line.months.length - 1].cumValue,
    1,
  );
  return (
    <QCard num="12" title={BUDGET.title}>
      <p className="text-[14.5px] leading-relaxed text-ink-muted">{BUDGET.intro}</p>

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Tile
          label={BUDGET.buildLabel}
          value={`${usdK(line.build.low)}–${usdK(line.build.high)}`}
          sub={`typically about ${usdK(line.build.mid)} — ${BUDGET.buildSub}`}
        />
        <Tile label={BUDGET.runLabel} value={`${usdK(line.monthlyRun)}/mo`} sub={BUDGET.runSub} />
        <Tile
          label={BUDGET.paybackLabel}
          value={line.paybackMonth == null ? "—" : `month ${line.paybackMonth}`}
          sub={BUDGET.paybackSub}
        />
      </div>

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">{buildRangeSentence(line.build)}</p>

      {/* The adoption ramp — a labelled, editable planning assumption. */}
      <div className="mt-4 rounded-tile border border-border bg-surface-muted p-3.5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[12px] font-semibold uppercase tracking-wide text-ink">
            {BUDGET.rampHeading}
          </span>
          <span className="text-[10.5px] text-ink-faint">{BUDGET.rampEditable}</span>
        </div>
        <div className="mt-2.5 flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-[12.5px] text-ink-muted" htmlFor="ramp-start">
            {BUDGET.rampStart}
            <input
              id="ramp-start"
              type="number"
              min={0}
              max={100}
              step={5}
              value={ramp.startPct}
              onChange={(e) => onRamp({ ...ramp, startPct: Number(e.target.value) || 0 })}
              className="w-20 rounded-control border border-border bg-surface px-2 py-1 text-[13px] text-ink tabular"
            />
          </label>
          <label className="flex items-center gap-2 text-[12.5px] text-ink-muted" htmlFor="ramp-full">
            {BUDGET.rampFull}
            <input
              id="ramp-full"
              type="number"
              min={1}
              max={12}
              step={1}
              value={ramp.fullMonth}
              onChange={(e) => onRamp({ ...ramp, fullMonth: Number(e.target.value) || 1 })}
              className="w-16 rounded-control border border-border bg-surface px-2 py-1 text-[13px] text-ink tabular"
            />
          </label>
        </div>
      </div>

      {/* 12-month cumulative view — paired bars, cost vs value, payback marked. */}
      <div className="mt-4">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-[11.5px] text-ink-muted">
          <span className="font-semibold uppercase tracking-wide text-[10.5px] text-ink-faint">
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
        <div className="mt-2 grid grid-cols-12 gap-1">
          {line.months.map((m) => (
            <div key={m.month} className="flex flex-col items-center gap-1">
              <div className="flex h-24 w-full items-end justify-center gap-[2px]">
                <div
                  className="w-[38%] rounded-t-[2px] bg-ink-faint/60"
                  style={{ height: `${Math.max(2, (m.cumCost / scaleMax) * 100)}%` }}
                  title={`Month ${m.month}: ${usdK(m.cumCost)} out`}
                  aria-hidden="true"
                />
                <div
                  className="w-[38%] rounded-t-[2px] bg-accent"
                  style={{ height: `${Math.max(2, (m.cumValue / scaleMax) * 100)}%` }}
                  title={`Month ${m.month}: ${usdK(m.cumValue)} in`}
                  aria-hidden="true"
                />
              </div>
              <span
                className={`text-[9.5px] tabular ${
                  m.month === line.paybackMonth ? "font-bold text-accent-text" : "text-ink-faint"
                }`}
              >
                {m.month === line.paybackMonth ? `▲${m.month}` : m.month}
              </span>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-3 text-[13.5px] leading-relaxed text-ink">{paybackSentence(line)}</p>
      <p className="mt-2 text-[13px] leading-relaxed text-ink-muted">{firstYearSentence(line)}</p>
      <p className="mt-3 border-t border-border pt-2.5 text-[11px] leading-snug text-ink-faint">
        One-off build figures are illustrative planning bands (as of {asOfLabel(oneOffBuildAsOf)}) — replace
        with your own quote. The monthly figures use today&rsquo;s prices from the cost box above.
      </p>
    </QCard>
  );
}
