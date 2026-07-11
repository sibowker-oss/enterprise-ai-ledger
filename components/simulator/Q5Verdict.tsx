import type { CostBand, Verdict } from "@/lib/simulator/types";
import { Q5 } from "@/lib/simulator/labels";
import type { BreakEvenHuman } from "@/lib/simulator/engine";
import {
  breakEvenSentence,
  stressSentence,
  timesLabel,
  verdictMarginSentence,
  verdictRiskSentence,
  verdictWeighingSentence,
} from "@/lib/simulator/copy";
import { usdK, type Cur } from "@/lib/simulator/format";

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone: string }) {
  return (
    <div className="rounded-tile border border-border bg-surface/60 p-3 text-center">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-1 text-[19px] font-bold tabular ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10.5px] leading-tight text-ink-faint">{sub}</div>
    </div>
  );
}

/**
 * Q5 — the conditional verdict. Four states (a clear no is a no; the middle
 * band says "prove the value first — run a small pilot"), never a single ROI
 * number; the status is carried by label text + icon, not colour alone.
 * Beyond the yes/no: the margin of safety, the break-even (in dollars AND in
 * human units), the first-year payback month, and the stress line — your low
 * value against the price-rise case.
 */
export function Q5Verdict({
  verdict,
  band,
  valueBase,
  breakEven,
  haircut,
  paybackMonth,
  coverage,
  stressCoverage,
  cur,
}: {
  verdict: Verdict;
  band: CostBand;
  /** The COUNTED (realisation-discounted) base value — what the verdict runs on. */
  valueBase: number;
  breakEven: BreakEvenHuman;
  haircut: number;
  paybackMonth: number | null;
  coverage: number;
  stressCoverage: number;
  cur: Cur;
}) {
  const tone = {
    good: { box: "border-status-green-fg/40 bg-status-green-soft", label: "text-status-green-fg", icon: "✓" },
    conditional: { box: "border-status-amber-fg/40 bg-status-amber-soft", label: "text-status-amber-fg", icon: "!" },
    marginal: { box: "border-status-amber-fg/40 bg-status-amber-soft", label: "text-status-amber-fg", icon: "~" },
    no: { box: "border-status-red-fg/40 bg-status-red-soft", label: "text-status-red-fg", icon: "✕" },
  }[verdict.klass];

  const marginTone =
    coverage >= 3 ? "text-status-green-fg" : coverage >= 1 ? "text-status-amber-fg" : "text-status-red-fg";

  return (
    <section id="bottom-line" aria-label={Q5.title}>
      <p className="eyebrow mb-2 mt-2 text-xs font-semibold text-ink-faint">Question 5 — {Q5.title}</p>
      <div className={`rounded-card border p-5 sm:p-6 ${tone.box}`}>
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${tone.label}`}>
          <span
            aria-hidden="true"
            className={`flex h-5 w-5 items-center justify-center rounded-chip border ${tone.label}`}
          >
            {tone.icon}
          </span>
          {verdict.label}
        </div>
        <h2 className="mt-2 text-xl font-bold tracking-tight text-ink">{verdict.headline}</h2>

        {/* Margin of safety + break-even + payback — a lopsided "yes" made informative. */}
        <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
          <Tile label={Q5.marginLabel} value={timesLabel(coverage)} sub={Q5.marginSub} tone={marginTone} />
          <Tile
            label={Q5.breakEvenLabel}
            value={`${usdK(band.repriced, cur)}/mo`}
            sub={Q5.breakEvenSub}
            tone="text-ink"
          />
          <Tile
            label={Q5.paybackLabel}
            value={paybackMonth == null ? Q5.paybackNone : `${Q5.paybackMonthPrefix} ${paybackMonth}`}
            sub={Q5.paybackSub}
            tone={paybackMonth == null ? "text-status-red-fg" : "text-ink"}
          />
        </div>

        <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">
          {verdictWeighingSentence(valueBase, band, cur)} {verdictMarginSentence(valueBase, band, cur)}
        </p>
        {/* The stress read (A2): your LOW value against the price-rise case. */}
        <p className="mt-2 text-[13.5px] font-medium leading-relaxed text-ink">
          {stressSentence(stressCoverage)}
        </p>
        {/* The break-even in units an executive can sanity-check in their head. */}
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink">
          {breakEvenSentence(breakEven, haircut, cur)}
        </p>
        <p className="mt-2.5 text-[14px] leading-relaxed text-ink-muted">{verdictRiskSentence(band)}</p>
        <p className="mt-2.5 text-[13.5px] leading-relaxed text-ink-faint">
          <b className="font-semibold text-ink-muted">What keeps it true:</b> {verdict.condition}
        </p>
        {/* The subsidy runs both sides of the ledger — today's return is the best
            it will be, not the worst. Ties the value back to the step-2 thesis. */}
        <p className="mt-3 border-t border-border pt-3 text-[13px] leading-relaxed text-ink-faint">
          {Q5.subsidyNote}
        </p>
      </div>
    </section>
  );
}
