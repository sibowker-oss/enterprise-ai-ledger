import type { CaseSummary } from "@/lib/simulator/derive";
import { unverifiedCount } from "@/lib/simulator/derive";
import type { BudgetLine } from "@/lib/simulator/budget";
import { MATURITY_WORDS, intensityBand } from "@/lib/simulator/engine";
import {
  breakEvenSentence,
  intensityLabel,
  stressSentence,
  timesLabel,
  verdictWeighingSentence,
} from "@/lib/simulator/copy";
import { model as resolveModel } from "@/lib/simulator/models";
import {
  forwardSignalAsOf,
  fxAsOf,
  libraryAsOf,
  modelMeta,
  monthlyFixedFloorAsOf,
  oneOffBuildAsOf,
  priceSheetAsOf,
} from "@/lib/simulator/data";
import { asOfLabel, grouped, usd, usdK, type Cur } from "@/lib/simulator/format";
import { BRAND, FOOTER, PRINT, TRIAGE } from "@/lib/simulator/labels";
import { APP_COMMIT, DATA_VERSION, ENGINE_VERSION } from "@/lib/simulator/versions";

function Row({ k, v }: { k: string; v: string }) {
  return (
    <tr className="border-b border-border/60">
      <td className="py-1 pr-4 text-[11px] text-ink-faint">{k}</td>
      <td className="py-1 text-[11.5px] font-semibold tabular text-ink">{v}</td>
    </tr>
  );
}

/**
 * The one-page board summary. Hidden on screen; @media print hides the
 * interactive walk and shows this instead. Everything derives from the same
 * engine as the page — and it now carries the assumptions, sources and data
 * version (A5), so the page can stand alone in a board pack.
 */
export function PrintSummary({ s, line }: { s: CaseSummary; line: BudgetLine }) {
  const m = resolveModel(s.config.modelKey);
  const meta = modelMeta(s.config.modelKey);
  const band = intensityBand(s.a);
  const cur: Cur = s.currency;
  const unverified = unverifiedCount(s.config);
  const now = new Date();
  const dateStr = now.toLocaleDateString("en-AU", { year: "numeric", month: "2-digit", day: "2-digit" });

  return (
    <div className="hidden print:block">
      {/* Triage warning header */}
      <div className="border-b-2 border-status-amber-fg bg-status-amber-soft px-2 py-1 mb-3">
        <p className="text-[9px] font-bold uppercase tracking-wide text-status-amber-fg">
          {TRIAGE.printHeader} · as of {dateStr}
        </p>
      </div>

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
          <Row k="Model" v={`${m.label} (${m.providerLabel})${m.verified ? "" : " — price unverified"}`} />
          <Row k="Setup" v={MATURITY_WORDS[s.config.maturity]} />
          <Row
            k="Savings running now"
            v={`caching ${s.config.levers.now.cache}% · batching ${s.config.levers.now.batch}% · routing ${s.config.levers.now.route}%`}
          />
          <Row
            k="Savings planned"
            v={`caching ${s.config.levers.planned.cache}% · batching ${s.config.levers.planned.batch}% · routing ${s.config.levers.planned.route}%`}
          />
          {s.config.excludedProviders.length > 0 && (
            <Row k="Providers not considered" v={s.config.excludedProviders.join(", ")} />
          )}
          <Row k="Figures shown in" v={cur === "aud" ? `A$ (RBA rate, ${fxAsOf})` : "US$"} />
        </tbody>
      </table>

      {/* Cost */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">{PRINT.costHeading}</h2>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          <Row
            k="Monthly running cost"
            v={`${usd(s.band.floor, cur)} (cheapest you'd consider) · ${usd(s.band.today, cur)} (your model, today) · ${usd(
              s.band.repriced,
              cur,
            )} (if prices rise)`}
          />
          <Row
            k="Of which"
            v={`AI usage ${usd(s.band.todayAiUsage, cur)} + per use ${usd(s.band.perUseRun, cur)} + monthly fixed ${usd(
              s.band.monthlyFixed,
              cur,
            )}`}
          />
          <Row
            k="One-off build (planning band)"
            v={`${usdK(line.build.low, cur)}–${usdK(line.build.high, cur)}, typically ${usdK(line.build.mid, cur)}`}
          />
          <Row
            k="Pays back"
            v={line.paybackMonth == null ? "not inside the first year" : `month ${line.paybackMonth}`}
          />
          <Row
            k="First year all-in"
            v={`${usdK(line.firstYearCost, cur)} out · ${usdK(line.firstYearValue, cur)} of counted value in`}
          />
        </tbody>
      </table>

      {/* Value */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">{PRINT.valueHeading}</h2>
      <table className="mt-1.5 w-full border-collapse">
        <tbody>
          <Row
            k="Value entered (low · likely · high)"
            v={`${usd(s.value.low, cur)} · ${usd(s.value.base, cur)} · ${usd(s.value.high, cur)} per month`}
          />
          <Row
            k={`Counted for the verdict (${Math.round(s.countedPct)}%)`}
            v={`${usd(s.counted.base, cur)}/mo — after adoption, what turns into money, and what's usable without rework`}
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
          Margin of safety {timesLabel(s.coverage)}. {verdictWeighingSentence(s.counted.base, s.band, cur)}{" "}
          {stressSentence(s.stressCoverage)} {breakEvenSentence(s.breakEven, Math.round(s.countedPct), cur)}
        </p>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">
          What keeps it true: {s.verdict.condition}
        </p>
      </div>

      {/* Assumptions, sources, versions (A5) */}
      <h2 className="mt-4 text-[13px] font-bold uppercase tracking-wide text-ink">{PRINT.asOfHeading}</h2>
      <p className="mt-1 text-[10.5px] leading-snug text-ink-faint">
        Model price: {m.label} — {meta.verificationStatus === "verified" ? "checked against" : "unverified;"}{" "}
        {meta.sourceUrl.replace(/^https?:\/\/(www\.)?/, "").split("/")[0]}, {meta.effectiveDate}. Price-hold
        figures: The AI Ledger, as of {asOfLabel(forwardSignalAsOf)}. Usage estimates as of{" "}
        {asOfLabel(libraryAsOf)}. Model list prices as of {asOfLabel(priceSheetAsOf)}. One-off build and
        monthly-fixed planning bands as of {asOfLabel(oneOffBuildAsOf)} / {asOfLabel(monthlyFixedFloorAsOf)}{" "}
        (editorial — replace with your own quotes). {FOOTER.attribution}
      </p>
      <p className="mt-1.5 text-[10.5px] leading-snug tabular text-ink-faint">
        Data version {DATA_VERSION} · calculations v{ENGINE_VERSION} · app {APP_COMMIT} ·{" "}
        {PRINT.preparedBy} · hepburnadvisory.com.au
      </p>

      {/* Triage warning footer */}
      <div className="border-t-2 border-status-amber-fg bg-status-amber-soft px-2 py-1 mt-4">
        <p className="text-[9px] leading-snug text-status-amber-fg">
          {TRIAGE.printFooter.replace("%unverified%", String(unverified))}
        </p>
      </div>
    </div>
  );
}
