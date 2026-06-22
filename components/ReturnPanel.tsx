import type { DerivedValueRollup } from "@/lib/portfolio";
import { aud, audCompact } from "@/lib/format";

function ValueColumn({
  tone,
  label,
  cost,
  benefit,
  net,
  roi,
  caption,
}: {
  tone: "good" | "bad";
  label: string;
  cost: number;
  benefit: number;
  net: number;
  roi: number;
  caption: string;
}) {
  const accent = tone === "good" ? "border-l-status-green-solid" : "border-l-status-red-solid";
  const netColor = net >= 0 ? "text-status-green-fg" : "text-status-red-fg";
  return (
    <div className={`rounded-card border border-border border-l-4 bg-surface p-5 ${accent}`}>
      <p className="text-sm font-medium text-ink">{label}</p>
      <div className="mt-3 flex items-end gap-2">
        <span className="tabular text-3xl font-semibold text-ink">{audCompact(benefit)}</span>
        <span className="mb-1 text-sm text-ink-faint">value / yr</span>
      </div>
      <p className="tabular mt-1 text-sm text-ink-muted">
        on {audCompact(cost)} cost ·{" "}
        <span className={`font-semibold ${net >= 0 ? "text-status-green-fg" : "text-status-red-fg"}`}>
          {roi >= 0 ? "+" : ""}
          {roi}% ROI
        </span>
      </p>
      <p className={`tabular mt-3 text-lg font-semibold ${netColor}`}>
        {net >= 0 ? "+" : "−"}
        {aud(Math.abs(net))} net
      </p>
      <p className="mt-2 text-xs leading-snug text-ink-faint">{caption}</p>
    </div>
  );
}

/**
 * "Return on AI spend" — the CFO answer the deck demands (operational metrics
 * don't justify a multi-million spend; dollarised ROI does). Splits the
 * portfolio into evidence-backed value (proven, high ROI) vs unproven spend
 * (underwater), which is exactly what makes scale/fix/stop a financial call.
 */
export function ReturnPanel({ value }: { value: DerivedValueRollup }) {
  return (
    <section aria-label="Return on AI spend">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="text-lg font-semibold text-ink">What is the return on the spend?</h2>
        <p className="tabular hidden text-sm text-ink-faint sm:block">
          Portfolio: {audCompact(value.totalAnnualBenefitAud)} value on{" "}
          {audCompact(value.totalAnnualBenefitAud - value.netValueAud)} cost
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <ValueColumn
          tone="good"
          label="Evidence-backed AI — scale it"
          cost={value.evidenceBackedCostAud}
          benefit={value.evidenceBackedBenefitAud}
          net={value.evidenceBackedNetValueAud}
          roi={value.evidenceBackedRoiPct}
          caption="Measured benefit on the 4 high / medium-high confidence use cases. This is the bankable return — the case to invest more."
        />
        <ValueColumn
          tone="bad"
          label="Unproven AI — fix or stop it"
          cost={value.unprovenCostAud}
          benefit={value.unprovenBenefitAud}
          net={value.unprovenNetValueAud}
          roi={Math.round((value.unprovenNetValueAud / value.unprovenCostAud) * 100)}
          caption="The other 6 use cases return vendor claims and self-reported savings — currently underwater. Fix the workflow/evidence, or stop."
        />
      </div>
      {/* Theoretical vs banked — the CFO honesty layer */}
      <div className="mt-4 rounded-card border border-border bg-surface p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-ink">But how much has actually been banked?</p>
            <p className="mt-0.5 max-w-xl text-sm text-ink-muted">
              Across the portfolio that is {audCompact(value.totalAnnualBenefitAud)} of <em>theoretical</em> value — but only{" "}
              <strong className="font-semibold text-status-green-fg">{audCompact(value.totalBankedValueAud)} ({value.bankedConversionPct}%)</strong>{" "}
              has hit the P&amp;L. The rest is freed capacity, not cash.
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="tabular text-2xl font-semibold text-status-green-fg">{audCompact(value.totalBankedValueAud)}</p>
            <p className="text-xs text-ink-faint">banked of {audCompact(value.totalAnnualBenefitAud)} theoretical</p>
          </div>
        </div>
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${value.bankedConversionPct}% of theoretical value banked`}>
          <div className="h-full rounded-full bg-status-green-solid" style={{ width: `${value.bankedConversionPct}%` }} />
        </div>
        <p className="mt-2 text-xs text-ink-faint">
          Banking the gap — deliberate cost-out or revenue conversion of proven capacity — is the work. It is also the engagement.
        </p>
      </div>
    </section>
  );
}
