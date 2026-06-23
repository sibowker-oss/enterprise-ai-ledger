"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { CostComponent } from "@/lib/types";
import type { CostMatrixRow } from "@/lib/portfolio";
import { aud, audCompact, monthly, pct } from "@/lib/format";
import { costComponentLabel } from "@/lib/labels";
import { costTypeColor } from "@/styles/tokens";
import { CostDonut } from "./CostDonut";

const COMPONENTS: CostComponent[] = ["licences", "tokens", "cloud", "integration", "people"];
type Lens = "useCase" | "businessUnit";
type Period = "annual" | "monthly";
type SortKey = CostComponent | "total" | "label";

function ColHeader({
  label,
  col,
  sort,
  dir,
  onSort,
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: "asc" | "desc";
  onSort: (c: SortKey) => void;
}) {
  const active = sort === col;
  return (
    <th className="px-3 py-2 text-right font-medium">
      <button type="button" onClick={() => onSort(col)} className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}>
        {label}
        <span aria-hidden="true" className="text-[10px]">{active ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
      </button>
    </th>
  );
}

/**
 * Cost Ledger (BUILD_SPEC §5.3): total banner + donut, monthly/annual toggle,
 * a sortable use-case × cost-component breakdown that reconciles to the total,
 * and a By-use-case / By-business-unit lens.
 */
export function CostLedger({
  byUseCase,
  byBusinessUnit,
  spendByCostType,
  total,
  futureMultiple,
}: {
  byUseCase: CostMatrixRow[];
  byBusinessUnit: CostMatrixRow[];
  spendByCostType: Record<CostComponent, number>;
  total: number;
  futureMultiple: number;
}) {
  const [lens, setLens] = useState<Lens>("useCase");
  const [period, setPeriod] = useState<Period>("annual");
  const [sort, setSort] = useState<SortKey>("total");
  const [dir, setDir] = useState<"asc" | "desc">("desc");
  const [showFuture, setShowFuture] = useState(false);

  const rows = lens === "useCase" ? byUseCase : byBusinessUnit;
  const scale = (n: number) => (period === "monthly" ? monthly(n) : n);
  /** Future total = today's total + token line uplifted to cost-recovery. */
  const futureTotal = (r: CostMatrixRow) => r.total + Math.round(r.tokens * (futureMultiple - 1));

  const onSort = (col: SortKey) => {
    if (col === sort) setDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSort(col);
      setDir(col === "label" ? "asc" : "desc");
    }
  };

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      const cmp = sort === "label" ? a.label.localeCompare(b.label) : (a[sort] as number) - (b[sort] as number);
      return dir === "asc" ? cmp : -cmp;
    });
  }, [rows, sort, dir]);

  const totals = useMemo(() => {
    const t: Record<string, number> = { licences: 0, tokens: 0, cloud: 0, integration: 0, people: 0, total: 0 };
    for (const r of rows) {
      for (const c of COMPONENTS) t[c] += r[c];
      t.total += r.total;
    }
    return t;
  }, [rows]);

  const periodLabel = period === "monthly" ? "/mo" : "/yr";

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="grid gap-6 rounded-card border border-border bg-surface p-5 sm:p-6 lg:grid-cols-[auto_1fr] lg:items-center">
        <div>
          <p className="text-sm text-ink-muted">Total annual AI spend</p>
          <p className="tabular text-4xl font-semibold text-ink">{audCompact(total)}</p>
          <p className="tabular mt-1 text-sm text-ink-faint">{aud(monthly(total))} / month</p>
          <div className="mt-4 inline-flex rounded-control border border-border p-0.5 text-sm print:hidden">
            {(["annual", "monthly"] as Period[]).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPeriod(p)}
                className={`rounded-[4px] px-3 py-2 capitalize ${period === p ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
        <div className="lg:justify-self-end">
          <CostDonut data={spendByCostType} total={total} />
        </div>
      </div>

      {/* Lens tabs */}
      <div className="flex items-center justify-between gap-3">
        <div className="inline-flex rounded-control border border-border p-0.5 text-sm print:hidden" role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={lens === "useCase"}
            onClick={() => setLens("useCase")}
            className={`rounded-[4px] px-3 py-2 ${lens === "useCase" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
          >
            By use case
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={lens === "businessUnit"}
            onClick={() => setLens("businessUnit")}
            className={`rounded-[4px] px-3 py-2 ${lens === "businessUnit" ? "bg-accent text-white" : "text-ink-muted hover:text-ink"}`}
          >
            By business unit
          </button>
        </div>
        <label className="inline-flex cursor-pointer select-none items-center gap-2 text-sm text-ink-muted print:hidden">
          <input
            type="checkbox"
            checked={showFuture}
            onChange={(e) => setShowFuture(e.target.checked)}
            className="h-4 w-4 accent-accent"
          />
          Show future pricing ({futureMultiple.toFixed(2)}×, Ledger cost-recovery)
        </label>
      </div>

      {/* Mobile: stacked cards with a mini cost-mix bar (the matrix is too wide for a phone) */}
      <ul className="space-y-3 lg:hidden">
        {sorted.map((r) => {
          const nameInner = (
            <>
              {r.label}
              {r.sublabel && <span className="block text-xs font-normal text-ink-faint">{r.sublabel}</span>}
            </>
          );
          return (
            <li key={r.key}>
              <div className="rounded-card border border-border bg-surface p-4">
                <div className="flex items-start justify-between gap-3">
                  {lens === "useCase" ? (
                    <Link href={`/register/${r.key}`} className="min-w-0 font-medium text-ink active:text-accent">
                      {nameInner}
                    </Link>
                  ) : (
                    <span className="min-w-0 font-medium text-ink">{nameInner}</span>
                  )}
                  <span className="tabular shrink-0 text-right">
                    <span className="block font-semibold text-ink">{aud(scale(r.total))}</span>
                    {showFuture && (
                      <span className="block text-[11px] font-medium text-status-red-fg">→ {aud(scale(futureTotal(r)))}</span>
                    )}
                  </span>
                </div>
                {/* mini cost-mix bar */}
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-surface-muted">
                  {COMPONENTS.map((c) =>
                    r[c] > 0 ? (
                      <div key={c} style={{ width: `${(r[c] / r.total) * 100}%`, backgroundColor: costTypeColor[c] }} title={`${costComponentLabel[c]}: ${aud(scale(r[c]))}`} />
                    ) : null,
                  )}
                </div>
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-ink-muted">
                  {COMPONENTS.filter((c) => r[c] > 0).map((c) => (
                    <span key={c} className="inline-flex items-center gap-1">
                      <span className="inline-block h-2 w-2 rounded-sm" style={{ backgroundColor: costTypeColor[c] }} />
                      {costComponentLabel[c]} <span className="tabular text-ink-faint">{aud(scale(r[c]))}</span>
                    </span>
                  ))}
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Desktop: full matrix table */}
      <div className="hidden overflow-x-auto rounded-card border border-border bg-surface lg:block">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">
                <button type="button" onClick={() => onSort("label")} className="inline-flex items-center gap-1 hover:text-ink">
                  {lens === "useCase" ? "Use case" : "Business unit"}
                  <span aria-hidden="true" className="text-[10px]">{sort === "label" ? (dir === "asc" ? "▲" : "▼") : "↕"}</span>
                </button>
              </th>
              {COMPONENTS.map((c) => (
                <ColHeader key={c} label={costComponentLabel[c]} col={c} sort={sort} dir={dir} onSort={onSort} />
              ))}
              <ColHeader label="Total" col="total" sort={sort} dir={dir} onSort={onSort} />
              {showFuture && (
                <th className="px-3 py-2 text-right font-medium text-status-red-fg">
                  Future
                  <span className="block text-[10px] font-normal normal-case tracking-normal text-ink-faint">cost-recovery</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((r) => (
              <tr key={r.key} className="border-b border-border/60 hover:bg-surface-muted/40">
                <td className="px-3 py-2.5">
                  {lens === "useCase" ? (
                    <Link href={`/register/${r.key}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {r.label}
                    </Link>
                  ) : (
                    <span className="font-medium text-ink">{r.label}</span>
                  )}
                  {r.sublabel && <span className="block text-xs text-ink-faint">{r.sublabel}</span>}
                </td>
                {COMPONENTS.map((c) => (
                  <td key={c} className="tabular px-3 py-2.5 text-right text-ink-muted">
                    {r[c] === 0 ? <span className="text-ink-faint">—</span> : aud(scale(r[c]))}
                  </td>
                ))}
                <td className="tabular px-3 py-2.5 text-right font-semibold text-ink">{aud(scale(r.total))}</td>
                {showFuture && (
                  <td className="tabular px-3 py-2.5 text-right font-semibold text-status-red-fg">
                    {aud(scale(futureTotal(r)))}
                    {futureTotal(r) > r.total && (
                      <span className="block text-[11px] font-normal text-ink-faint">+{aud(scale(futureTotal(r) - r.total))}</span>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-strong bg-surface-muted/40 font-semibold">
              <td className="px-3 py-2.5 text-ink">Total</td>
              {COMPONENTS.map((c) => (
                <td key={c} className="tabular px-3 py-2.5 text-right text-ink">
                  {aud(scale(totals[c]))}
                  <span className="block text-[11px] font-normal text-ink-faint">{pct(totals[c], totals.total)}</span>
                </td>
              ))}
              <td className="tabular px-3 py-2.5 text-right text-ink">{aud(scale(totals.total))}</td>
              {showFuture && (
                <td className="tabular px-3 py-2.5 text-right text-status-red-fg">
                  {aud(scale(totals.total + Math.round(totals.tokens * (futureMultiple - 1))))}
                </td>
              )}
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        Coloured key:{" "}
        {COMPONENTS.map((c) => (
          <span key={c} className="mr-3 inline-flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: costTypeColor[c] }} />
            {costComponentLabel[c]}
          </span>
        ))}
      </p>
    </div>
  );
}
