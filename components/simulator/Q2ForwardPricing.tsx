import type { ForwardSignal, ProvenanceTier } from "@/lib/simulator/types";
import { QCard } from "./QCard";
import { ProvChip } from "./ProvChip";
import { Q2 } from "@/lib/simulator/labels";
import { Q2_COUNTER_SENTENCE, q2PlanSentence, tierLabel } from "@/lib/simulator/copy";
import { asOfLabel, multipleLabel } from "@/lib/simulator/format";

/** The per-figure provenance chip — provenance is the product claim, so it
 *  sits AT the figure, not only in the footer (CTO review item 7). */
function TierChip({ tier }: { tier: ProvenanceTier }) {
  const style =
    tier === "audited"
      ? "bg-status-green-soft text-status-green-fg"
      : tier === "derived"
        ? "bg-accent-soft text-accent-text"
        : "bg-surface-muted text-ink-faint";
  return (
    <span className={`mt-1.5 inline-block rounded-chip px-1.5 py-0.5 text-[9.5px] font-semibold ${style}`}>
      {tierLabel(tier)}
    </span>
  );
}

function Tile({
  label,
  value,
  sub,
  tier,
  highlight = false,
}: {
  label: string;
  value: string;
  sub: string;
  tier: ProvenanceTier;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-tile border p-3 ${
        highlight ? "border-accent/40 bg-accent-soft" : "border-border bg-surface-muted"
      }`}
    >
      <div className="text-[10.5px] uppercase leading-tight tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-1 text-2xl font-bold tabular ${highlight ? "text-accent-text" : "text-ink"}`}>
        {value}
      </div>
      <div className="mt-0.5 text-[10.5px] leading-tight text-ink-faint">{sub}</div>
      <TierChip tier={tier} />
    </div>
  );
}

/**
 * Q2 — the forward-pricing engine. The only TAIL-irreplaceable layer, so it
 * dominates: what customers cover, how far underwater the provider is, sales per
 * employee, room to rise — then a direction, a plain reason, the planning line
 * and the mandatory efficiency counter-force. Every figure is provenance-tagged.
 */
export function Q2ForwardPricing({
  signal,
  providerLabel,
  asOf,
}: {
  signal: ForwardSignal;
  providerLabel: string;
  /** The forward-signal snapshot date — shown AT the figures, not only the footer. */
  asOf: string;
}) {
  const pct = (n: number | null) => (n == null ? "—" : `${n}%`);
  const money = (n: number | null) => (n == null ? "—" : `$${n}M`);

  return (
    <QCard num="2" title={Q2.title} accent right={<ProvChip signal={signal} />}>
      <p className="text-[14.5px] leading-relaxed text-ink-muted">{Q2.intro}</p>

      {signal.tracked ? (
        <>
          <div className="mt-4 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
            <Tile
              label={Q2.tileRecovery}
              value={pct(signal.costRecoveryPct)}
              sub={Q2.tileRecoverySub}
              tier={signal.tier}
            />
            <Tile
              label={Q2.tileUnderwater}
              value={pct(signal.underwaterPct)}
              sub={Q2.tileUnderwaterSub}
              tier={signal.tier}
            />
            <Tile
              label={Q2.tileRevPerEmp}
              value={money(signal.revenuePerEmployeeUsdM)}
              sub={Q2.tileRevPerEmpSub}
              tier={signal.tier}
            />
            <Tile
              label={Q2.tileHeadroom}
              value={multipleLabel(signal.repricingMultiple)}
              sub={Q2.tileHeadroomSub}
              tier={signal.tier}
              highlight
            />
          </div>

          <p className="mt-2 text-[11px] text-ink-faint">
            {Q2.figuresAsOfPrefix} {asOfLabel(asOf)}.
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-2.5">
            <span className="rounded-chip bg-status-amber-soft px-3 py-1 text-[12.5px] font-bold text-status-amber-fg">
              ▲ {signal.direction}
            </span>
            <span className="text-[12.5px] font-semibold text-ink-faint">{providerLabel}</span>
          </div>

          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{signal.reason}</p>

          <p className="mt-3 rounded-tile bg-status-amber-soft px-3.5 py-3 text-[14.5px] leading-relaxed text-ink">
            {q2PlanSentence(signal.repricingMultiple)}
          </p>

          <p className="mt-2.5 rounded-tile bg-status-green-soft px-3.5 py-3 text-[13.5px] leading-relaxed text-status-green-fg">
            ▼ {Q2_COUNTER_SENTENCE}
          </p>
        </>
      ) : signal.state === "open" ? (
        <>
          {/* Open weights — the ONLY untracked state that carries a risk read
              (can run in-house → low jump risk). Update v2, 0.2. */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="rounded-chip bg-status-green-soft px-3 py-1 text-[12.5px] font-bold text-status-green-fg">
              ● {Q2.lowRisk}
            </span>
            <span className="text-[12.5px] font-semibold text-ink-faint">{providerLabel}</span>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{signal.reason}</p>
          <p className="mt-2 text-[11px] text-ink-faint">
            {Q2.figuresAsOfPrefix} {asOfLabel(asOf)}.
          </p>
        </>
      ) : (
        <>
          {/* Neutral — hosted, untracked: no forecast, NO risk rating either way. */}
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <span className="rounded-chip bg-surface-muted px-3 py-1 text-[12.5px] font-bold text-ink-muted">
              {Q2.neutralChip}
            </span>
            <span className="text-[12.5px] font-semibold text-ink-faint">{providerLabel}</span>
          </div>
          <p className="mt-3 text-[14.5px] leading-relaxed text-ink-muted">{signal.reason}</p>
          <p className="mt-2 text-[11px] text-ink-faint">
            {Q2.figuresAsOfPrefix} {asOfLabel(asOf)}.
          </p>
        </>
      )}

      <p className="mt-4 border-t border-border pt-3 text-[12px] leading-relaxed text-ink-faint">
        {signal.state === "tracked" ? Q2.footnote : Q2.footnoteUntracked}
      </p>
    </QCard>
  );
}
