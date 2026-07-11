"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { clearCases, listSavedCases, removeCase } from "@/lib/simulator/caseShelf";
import { consolidate, type Consolidation } from "@/lib/simulator/consolidate";
import { parseScenario, type UseCaseScenario } from "@/lib/simulator/scenario";
import { serializeState, type Currency } from "@/lib/simulator/urlState";
import { timesLabel } from "@/lib/simulator/copy";
import { grouped, usdK, type Cur } from "@/lib/simulator/format";
import { BRAND, CASES, CURRENCY, FOOTER } from "@/lib/simulator/labels";
import { APP_COMMIT, DATA_VERSION, ENGINE_VERSION } from "@/lib/simulator/versions";
import { fxAsOf } from "@/lib/simulator/data";

const VERDICT_TONE: Record<string, string> = {
  good: "bg-status-green-soft text-status-green-fg",
  conditional: "bg-status-amber-soft text-status-amber-fg",
  marginal: "bg-status-amber-soft text-status-amber-fg",
  no: "bg-status-red-soft text-status-red-fg",
};

function Tile({ label, value, sub, tone = "text-ink" }: { label: string; value: string; sub: string; tone?: string }) {
  return (
    <div className="rounded-tile border border-border bg-surface-muted p-3 text-center">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-1 text-[19px] font-bold tabular ${tone}`}>{value}</div>
      <div className="mt-0.5 text-[10.5px] leading-tight text-ink-faint">{sub}</div>
    </div>
  );
}

function downloadScenario(scenario: UseCaseScenario) {
  const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `use-case-${scenario.inputs.archetypeKey}-${scenario.dataVersion}.json`;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * The consolidated business case (Simon, 2026-07-11): every case saved this
 * session, re-derived through the same engine as the calculator and rolled
 * into one set of figures a budget paper can carry — then listed one by one.
 * Session-scoped by design: the tab's shelf, not an account.
 */
export default function SavedCasesPage() {
  const [cases, setCases] = useState<UseCaseScenario[] | null>(null); // null = pre-mount
  const [cur, setCur] = useState<Currency>("usd");
  const fileInputId = "cases-import";

  useEffect(() => {
    const list = listSavedCases();
    setCases(list);
    // Default the page currency to the most recently saved case's currency.
    if (list.length > 0) setCur(list[list.length - 1].currency === "aud" ? "aud" : "usd");
  }, []);

  const con: Consolidation | null = cases && cases.length > 0 ? consolidate(cases, cur) : null;
  const fc: Cur = cur;

  async function addFromFile(file: File) {
    const text = await file.text();
    const parsed = parseScenario(text);
    if (!parsed.ok) return;
    // Re-use the shelf's dedupe/limit rules by saving the raw scenario.
    const { saveCase } = await import("@/lib/simulator/caseShelf");
    saveCase(JSON.parse(text) as UseCaseScenario);
    setCases(listSavedCases());
  }

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-[1400px] px-4 pb-20 sm:px-6">
        <header className="border-b border-border pb-5 pt-8">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            {CASES.eyebrow} · {BRAND.company}
          </p>
          <div className="mt-1.5 flex flex-wrap items-end justify-between gap-3">
            <h1 className="text-[26px] font-bold leading-tight tracking-tight text-ink sm:text-[30px]">
              {CASES.title}
            </h1>
            <Link
              href="/simulator"
              className="print:hidden min-h-[44px] text-[12.5px] font-semibold text-ink-faint underline-offset-2 hover:text-ink hover:underline"
            >
              {CASES.backToCalculator}
            </Link>
          </div>
          <p className="mt-2 max-w-3xl text-[14px] leading-relaxed text-ink-muted">{CASES.intro}</p>
        </header>

        {/* Pre-mount / empty states */}
        {cases !== null && cases.length === 0 && (
          <div className="mt-10 rounded-card border border-border bg-surface p-8 text-center">
            <p className="text-lg font-semibold text-ink">{CASES.emptyTitle}</p>
            <p className="mx-auto mt-2 max-w-xl text-[13.5px] leading-relaxed text-ink-muted">
              {CASES.emptyBody}
            </p>
            <Link
              href="/simulator"
              className="mt-5 inline-flex min-h-[44px] items-center rounded-control bg-accent px-5 text-sm font-semibold text-white hover:bg-accent-hover"
            >
              {CASES.backToCalculator}
            </Link>
          </div>
        )}

        {con && cases && (
          <>
            {/* The combined case */}
            <section aria-label={CASES.totalsHeading} className="mt-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg font-semibold tracking-tight text-ink">{CASES.totalsHeading}</h2>
                <div className="print:hidden flex items-center gap-1" role="group" aria-label={CURRENCY.label}>
                  {(["usd", "aud"] as const).map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={cur === c}
                      onClick={() => setCur(c)}
                      className={`min-h-[44px] rounded-control border px-3 text-[12.5px] font-semibold transition-colors ${
                        cur === c
                          ? "border-accent bg-accent text-white"
                          : "border-border bg-surface text-ink-muted hover:border-accent"
                      }`}
                    >
                      {CURRENCY[c]}
                    </button>
                  ))}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2.5 md:grid-cols-3 xl:grid-cols-6">
                <Tile label={CASES.tileCases} value={grouped(con.rows.length)} sub={CASES.sessionNote} />
                <Tile
                  label={CASES.tileBuild}
                  value={usdK(con.totals.oneOffBuild, fc)}
                  sub={CASES.tileBuildSub}
                />
                <Tile
                  label={CASES.tileMonthly}
                  value={`${usdK(con.totals.monthlyToday, fc)} → ${usdK(con.totals.monthlyRise, fc)}`}
                  sub={CASES.tileMonthlySub}
                />
                <Tile
                  label={CASES.tileValue}
                  value={usdK(con.totals.countedValue, fc)}
                  sub={CASES.tileValueSub}
                />
                <Tile
                  label={CASES.tileMargin}
                  value={timesLabel(con.totals.coverage)}
                  sub={CASES.tileMarginSub}
                  tone={
                    con.totals.coverage >= 3
                      ? "text-status-green-fg"
                      : con.totals.coverage >= 1
                        ? "text-status-amber-fg"
                        : "text-status-red-fg"
                  }
                />
                <Tile
                  label={CASES.tilePayback}
                  value={con.totals.paybackMonth == null ? "not in year 1" : `month ${con.totals.paybackMonth}`}
                  sub={CASES.tilePaybackSub}
                  tone={con.totals.paybackMonth == null ? "text-status-red-fg" : "text-ink"}
                />
              </div>
              <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">
                {CASES.tileFirstYear}: about {usdK(con.totals.firstYearCost, fc)} out against{" "}
                {usdK(con.totals.firstYearValue, fc)} of counted value in ({CASES.tileFirstYearSub}).{" "}
                {con.totals.verdicts.no > 0 &&
                  `${con.totals.verdicts.no} of the ${con.rows.length} cases don't pay on their own numbers — the combined figures include them.`}
                {cur === "aud" && ` A$ at the RBA rate of ${fxAsOf}.`}
              </p>
            </section>

            {/* The cases, one by one */}
            <section aria-label={CASES.listHeading} className="mt-7">
              <h2 className="text-lg font-semibold tracking-tight text-ink">{CASES.listHeading}</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                  <thead>
                    <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-ink-faint">
                      <th className="py-2 pr-3 font-semibold">{CASES.colCase}</th>
                      <th className="py-2 pr-3 font-semibold">{CASES.colCost}</th>
                      <th className="py-2 pr-3 font-semibold">{CASES.colValue}</th>
                      <th className="py-2 pr-3 font-semibold">{CASES.colMargin}</th>
                      <th className="py-2 pr-3 font-semibold">{CASES.colPayback}</th>
                      <th className="py-2 pr-3 font-semibold">{CASES.colVerdict}</th>
                      <th className="py-2 print:hidden" />
                    </tr>
                  </thead>
                  <tbody>
                    {con.rows.map((r, i) => (
                      <tr key={i} className="border-b border-border/60 align-top">
                        <td className="py-2.5 pr-3">
                          <span className="font-semibold text-ink">{r.s.a.label}</span>
                          <div className="text-[11px] text-ink-faint">
                            {grouped(r.state.current.units)} {r.s.a.unitLabel.toLowerCase()}
                          </div>
                        </td>
                        <td className="py-2.5 pr-3 tabular text-ink-muted">
                          {usdK(r.monthlyToday, fc)} → {usdK(r.monthlyRise, fc)}
                        </td>
                        <td className="py-2.5 pr-3 tabular text-ink-muted">{usdK(r.countedValue, fc)}</td>
                        <td className="py-2.5 pr-3 tabular font-semibold text-ink">
                          {timesLabel(r.s.coverage)}
                        </td>
                        <td className="py-2.5 pr-3 tabular text-ink-muted">
                          {r.line.paybackMonth == null ? "—" : `m${r.line.paybackMonth}`}
                        </td>
                        <td className="py-2.5 pr-3">
                          <span
                            className={`inline-block rounded-chip px-2 py-0.5 text-[11px] font-semibold ${VERDICT_TONE[r.s.verdict.klass]}`}
                          >
                            {r.s.verdict.label}
                          </span>
                        </td>
                        <td className="py-2.5 text-right print:hidden">
                          <span className="inline-flex gap-1.5">
                            <Link
                              href={`/simulator/?${serializeState({ ...r.state, currency: r.state.currency })}`}
                              className="rounded-control border border-border px-2.5 py-1.5 text-[11px] text-ink-muted hover:border-accent hover:text-ink"
                            >
                              {CASES.openInCalculator}
                            </Link>
                            <button
                              type="button"
                              onClick={() => downloadScenario(r.scenario)}
                              className="rounded-control border border-border px-2.5 py-1.5 text-[11px] text-ink-muted hover:border-accent hover:text-ink"
                            >
                              {CASES.downloadOne}
                            </button>
                            <button
                              type="button"
                              onClick={() => setCases(removeCase(i))}
                              className="rounded-control border border-border px-2.5 py-1.5 text-[11px] text-ink-faint hover:border-status-red-fg hover:text-status-red-fg"
                            >
                              {CASES.remove}
                            </button>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Page actions */}
              <div className="print:hidden mt-4 flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="inline-flex min-h-[44px] items-center rounded-control bg-accent px-4 text-[12.5px] font-semibold text-white hover:bg-accent-hover"
                >
                  {CASES.printSummary}
                </button>
                <button
                  type="button"
                  onClick={() => con.rows.forEach((r) => downloadScenario(r.scenario))}
                  className="inline-flex min-h-[44px] items-center rounded-control border border-border bg-surface px-4 text-[12.5px] font-semibold text-ink-muted hover:border-accent hover:text-ink"
                >
                  {CASES.downloadAll}
                </button>
                <label
                  htmlFor={fileInputId}
                  className="inline-flex min-h-[44px] cursor-pointer items-center rounded-control border border-border bg-surface px-4 text-[12.5px] font-semibold text-ink-muted hover:border-accent hover:text-ink"
                >
                  {CASES.addFromFile}
                  <input
                    id={fileInputId}
                    type="file"
                    accept="application/json,.json"
                    className="sr-only"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) void addFromFile(f);
                      e.target.value = "";
                    }}
                  />
                </label>
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm(CASES.clearConfirm)) {
                      clearCases();
                      setCases([]);
                    }
                  }}
                  className="inline-flex min-h-[44px] items-center rounded-control border border-border bg-surface px-4 text-[12.5px] font-semibold text-ink-faint hover:border-status-red-fg hover:text-status-red-fg"
                >
                  {CASES.clearAll}
                </button>
              </div>
            </section>
          </>
        )}

        <footer className="mt-10 border-t border-border pt-5 text-[11px] leading-relaxed text-ink-faint">
          <p>
            {BRAND.ribbon} {FOOTER.attribution}
          </p>
          <p className="mt-2 tabular">
            Data version {DATA_VERSION} · calculations v{ENGINE_VERSION} · app {APP_COMMIT}
          </p>
        </footer>
      </div>
    </div>
  );
}
