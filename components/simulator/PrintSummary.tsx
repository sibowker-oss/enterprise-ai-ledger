import type { CaseSummary } from "@/lib/simulator/derive";
import type { BudgetLine } from "@/lib/simulator/budget";
import type { SimConfig } from "@/lib/simulator/urlState";
import { deriveCase } from "@/lib/simulator/derive";
import { MATURITY_WORDS } from "@/lib/simulator/engine";
import { intensityBand } from "@/lib/simulator/engine";
import {
  breakEvenSentence,
  intensityLabel,
  timesLabel,
  verdictWeighingSentence,
} from "@/lib/simulator/copy";
import { model as resolveModel } from "@/lib/simulator/models";
import {
  forwardSignalAsOf,
  libraryAsOf,
  oneOffBuildAsOf,
  priceSheetAsOf,
} from "@/lib/simulator/data";
import { asOfLabel, grouped, usd, usdK } from "@/lib/simulator/format";
import { BRAND, FOOTER, PRINT } from "@/lib/simulator/labels";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-border/60">
      <td className="py-1 pr-4 text-[11px] text-ink-faint">{k}</td>
      <td className="py-1 text-[11.5px] font-semibold tabular text-ink">{v}</td>
    </tr>
  );
}

/**
 * The one-page board summary (CTO review item 5). Hidden on screen; @media
 * print hides the interactive walk and shows this instead — the global print
 * stylesheet flips the dark surface to ink-on-white. Everything here derives
 * from the same engine as the page; nothing is restated by hand.
 */
export function PrintSummary({
  s,
  line,
  pins,
}: {
  s: CaseSummary;
  line: BudgetLine;
  pins: SimConfig[];
}) {
  const m = resolveModel(s.config.modelKey);
  const band = intensityBand(s.a);
  const pinRows = pins.map((p) => deriveCase(p));
  return (
    <div className="hidden print:block">
      {/* Header */}
      <div className="border-b border-border pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-faint">
          {BRAND.company} · {BRAND.eyebrow}
        </p>
        <h1 className="mt-1 text-[22px] font-bold tracking-tight text-ink">{PRINT.docTitle}</h1>
        <p className="mt-1 text-[11px] text-ink-faint">{PRINT.demoNote}</p>
      </div>

      {/* The case */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">
        {PRINT.inputsHeading}
      </h2>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          <Row k="Use case" v={s.a.label} />
          <Row k={s.a.unitLabel} v={grouped(s.config.units)} />
          {band && s.config.intensity != null && (
            <Row k={intensityLabel(band)} v={`${s.config.intensity} (typical ${band.mid})`} />
          )}
          <Row k="Model" v={`${m.label} (${m.providerLabel})`} />
          <Row k="Setup" v={MATURITY_WORDS[s.config.maturity]} />
          <Row
            k="Savings applied"
            v={`caching ${s.config.levers.cache}% · batching ${s.config.levers.batch}% · routing ${s.config.levers.route}%`}
          />
        </tbody>
      </table>

      {/* Cost */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">{PRINT.costHeading}</h2>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          <Row
            k="Monthly running cost"
            v={`${usd(s.band.floor)} (cheapest model) · ${usd(s.band.today)} (your model, today) · ${usd(
              s.band.repriced,
            )} (if prices rise)`}
          />
          <Row k="Of which build & run" v={`${usd(s.band.buildAndRun)}/mo — the same in all three`} />
          <Row
            k="One-off build (planning band)"
            v={`${usdK(line.build.low)}–${usdK(line.build.high)}, typically ${usdK(line.build.mid)}`}
          />
          <Row
            k="Pays back"
            v={line.paybackMonth == null ? "not inside the first year" : `month ${line.paybackMonth}`}
          />
          <Row
            k="First year all-in"
            v={`${usdK(line.firstYearCost)} out · ${usdK(line.firstYearValue)} of counted value in`}
          />
        </tbody>
      </table>

      {/* Value */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">{PRINT.valueHeading}</h2>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          <Row
            k="Value entered (low · likely · high)"
            v={`${usd(s.value.low)} · ${usd(s.value.base)} · ${usd(s.value.high)} per month`}
          />
          <Row
            k={`Counted for the verdict (${s.config.haircut}%)`}
            v={`${usd(s.counted.base)}/mo — not everyone uses it; not all saved time turns into output`}
          />
        </tbody>
      </table>

      {/* Verdict */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">
        {PRINT.verdictHeading}
      </h2>
      <div className="mt-1.5 rounded-tile border border-border p-3">
        <p className="text-[13px] font-bold uppercase tracking-wide text-ink">{s.verdict.label}</p>
        <p className="mt-1 text-[12.5px] leading-snug text-ink">{s.verdict.headline}</p>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-muted">
          Margin of safety {timesLabel(s.coverage)}. {verdictWeighingSentence(s.counted.base, s.band)}{" "}
          {breakEvenSentence(s.breakEven, s.config.haircut)}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">
          What keeps it true: {s.verdict.condition}
        </p>
      </div>

      {/* Pinned cases */}
      {pinRows.length > 0 && (
        <>
          <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">
            {PRINT.pinsHeading}
          </h2>
          <table className="mt-1.5 w-full border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-border text-left text-[9.5px] uppercase tracking-wide text-ink-faint">
                <th className="py-1 pr-3 font-semibold">Use case</th>
                <th className="py-1 pr-3 font-semibold">Cost /mo (today → risen)</th>
                <th className="py-1 pr-3 font-semibold">Counted value /mo</th>
                <th className="py-1 pr-3 font-semibold">Margin</th>
                <th className="py-1 font-semibold">Verdict</th>
              </tr>
            </thead>
            <tbody>
              {pinRows.map((r, i) => (
                <tr key={i} className="border-b border-border/60">
                  <td className="py-1 pr-3 font-semibold text-ink">{r.a.label}</td>
                  <td className="py-1 pr-3 tabular text-ink-muted">
                    {usdK(r.band.today)} → {usdK(r.band.repriced)}
                  </td>
                  <td className="py-1 pr-3 tabular text-ink-muted">{usdK(r.counted.base)}</td>
                  <td className="py-1 pr-3 tabular font-semibold text-ink">{timesLabel(r.coverage)}</td>
                  <td className="py-1 text-ink-muted">{r.verdict.label}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {/* Provenance + attribution */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">{PRINT.asOfHeading}</h2>
      <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">
        Price-hold figures: The AI Ledger, as of {asOfLabel(forwardSignalAsOf)}. Usage estimates as of{" "}
        {asOfLabel(libraryAsOf)}. Model list prices as of {asOfLabel(priceSheetAsOf)}. One-off build
        planning bands as of {asOfLabel(oneOffBuildAsOf)}. {FOOTER.attribution}
      </p>
      <p className="mt-1.5 text-[10.5px] leading-snug text-ink-faint">
        {PRINT.preparedBy} · hepburnadvisory.com.au
      </p>
    </div>
  );
}
