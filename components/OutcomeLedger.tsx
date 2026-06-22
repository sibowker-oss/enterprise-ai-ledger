"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Confidence, UseCase } from "@/lib/types";
import type { DerivedValueRollup } from "@/lib/portfolio";
import { aud, audCompact, reviewDate, pct } from "@/lib/format";
import { CONFIDENCE_ORDER, netValue, roiPct, bankedConversionPct } from "@/lib/portfolio";
import { DecisionChip } from "./StatusChip";
import { ConfidenceDots } from "./ConfidenceDots";

const BACKED: Confidence[] = ["high", "medium-high"];
const isBacked = (c: Confidence) => BACKED.includes(c);

/**
 * Outcome Ledger with the theoretical-vs-banked distinction (BUILD addendum —
 * a CFO separates modeled "value" from cash that has actually hit the P&L).
 * Each row shows theoretical value, what's banked, and the conversion; the
 * banner contrasts A$8.82M theoretical against A$1.84M banked. The what-if
 * toggle recomputes both to the evidence-backed set.
 */
export function OutcomeLedger({
  useCases,
  total,
  value,
}: {
  useCases: UseCase[];
  total: number;
  value: DerivedValueRollup;
}) {
  const [onlyBacked, setOnlyBacked] = useState(false);
  const backedCount = useCases.filter((uc) => isBacked(uc.outcome.confidence)).length;

  const sorted = useMemo(
    () =>
      [...useCases].sort(
        (a, b) =>
          CONFIDENCE_ORDER[b.outcome.confidence] - CONFIDENCE_ORDER[a.outcome.confidence] ||
          netValue(b) - netValue(a),
      ),
    [useCases],
  );

  // Headline figures flip between whole-portfolio and evidence-backed.
  const theoretical = onlyBacked ? value.evidenceBackedBenefitAud : value.totalAnnualBenefitAud;
  const banked = onlyBacked ? value.evidenceBackedBankedAud : value.totalBankedValueAud;
  const conv = onlyBacked ? value.evidenceBackedBankedConversionPct : value.bankedConversionPct;
  const cost = onlyBacked ? value.evidenceBackedCostAud : total;

  return (
    <div className="space-y-6">
      {/* Theoretical vs banked banner */}
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <p className="text-sm text-ink-muted">
            {onlyBacked ? "Evidence-backed use cases only" : `All ${useCases.length} use cases`} · on {audCompact(cost)} cost
          </p>
          <label className="inline-flex shrink-0 cursor-pointer select-none items-center gap-3 print:hidden">
            <span className="text-sm text-ink-muted">Evidence-backed only</span>
            <button
              type="button"
              role="switch"
              aria-checked={onlyBacked}
              onClick={() => setOnlyBacked((v) => !v)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${onlyBacked ? "bg-accent" : "bg-border-strong"}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${onlyBacked ? "translate-x-5" : "translate-x-0.5"}`} />
            </button>
          </label>
        </div>

        <div className="mt-3 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-center">
          {/* Theoretical */}
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Theoretical value / yr</p>
            <p className="tabular text-3xl font-semibold text-ink sm:text-4xl">{audCompact(theoretical)}</p>
            <p className="mt-0.5 text-xs text-ink-faint">Modeled benefit — freed capacity, projected & avoided cost.</p>
          </div>
          <div className="hidden text-2xl text-ink-faint sm:block" aria-hidden="true">→</div>
          {/* Banked */}
          <div className="rounded-card border border-status-green-solid/30 bg-status-green-soft/40 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-ink-faint">Banked in the P&amp;L / yr</p>
            <p className="tabular text-3xl font-semibold text-status-green-fg sm:text-4xl">
              {audCompact(banked)}
              <span className="ml-2 align-middle text-base font-normal text-ink-muted">{conv}% converted</span>
            </p>
            <p className="mt-0.5 text-xs text-ink-faint">Actually booked — cost removed, losses avoided, revenue won.</p>
          </div>
        </div>

        {/* Conversion bar */}
        <div className="mt-4">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted" role="img" aria-label={`${conv}% of theoretical value banked`}>
            <div className="h-full rounded-full bg-status-green-solid" style={{ width: `${conv}%` }} />
          </div>
          <p className="mt-2 text-sm text-ink-muted">
            <strong className="font-semibold text-ink">{audCompact(theoretical - banked)}</strong> of value is
            not yet cash — freed capacity and projected savings that need deliberate cost-out or revenue conversion to bank.
            {!onlyBacked && (
              <> Only <strong className="font-semibold text-ink">{backedCount} of {useCases.length}</strong> use cases are evidence-backed.</>
            )}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[900px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">Use case</th>
              <th className="px-3 py-2 text-left font-medium">Confidence</th>
              <th className="px-3 py-2 text-right font-medium">Annual cost</th>
              <th className="px-3 py-2 text-right font-medium">Theoretical value</th>
              <th className="px-3 py-2 text-right font-medium">Banked (P&amp;L)</th>
              <th className="px-3 py-2 text-left font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((uc) => {
              const dimmed = onlyBacked && !isBacked(uc.outcome.confidence);
              const conversion = bankedConversionPct(uc);
              return (
                <tr key={uc.id} className={`border-b border-border/60 align-top transition-opacity ${dimmed ? "opacity-40" : "hover:bg-surface-muted/40"}`}>
                  <td className="px-3 py-3">
                    <Link href={`/register/${uc.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {uc.name}
                    </Link>
                    <span className="block text-xs text-ink-faint">{uc.outcome.primaryMetric}</span>
                  </td>
                  <td className="px-3 py-3">
                    <ConfidenceDots confidence={uc.outcome.confidence} />
                    <span className="mt-1 block text-xs text-ink-faint">Review {reviewDate(uc.outcome.reviewDate)}</span>
                  </td>
                  <td className="tabular px-3 py-3 text-right font-medium text-ink">{aud(uc.cost.totalAnnual)}</td>
                  <td className="px-3 py-3 text-right" title={uc.value.basis}>
                    <span className="tabular font-medium text-ink underline decoration-dotted decoration-ink-faint/50 underline-offset-2">
                      {aud(uc.value.annualBenefitAud)}
                    </span>
                    <span className="ml-1 align-super text-[10px] text-ink-faint" aria-hidden="true">ⓘ</span>
                  </td>
                  <td className="px-3 py-3 text-right" title={uc.value.bankedBasis}>
                    {uc.value.bankedValueAud > 0 ? (
                      <>
                        <span className="tabular font-semibold text-status-green-fg underline decoration-dotted decoration-status-green-fg/40 underline-offset-2">
                          {aud(uc.value.bankedValueAud)}
                        </span>
                        <span className="block text-[11px] text-ink-faint">{conversion}% of theoretical</span>
                      </>
                    ) : (
                      <span className="text-ink-faint" title={uc.value.bankedBasis}>
                        —<span className="ml-1 align-super text-[10px]" aria-hidden="true">ⓘ</span>
                        <span className="block text-[11px]">nothing banked</span>
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3"><DecisionChip decision={uc.decision} size="sm" /></td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr className="border-t-2 border-border-strong bg-surface-muted/40 font-semibold">
              <td className="px-3 py-2.5 text-ink" colSpan={2}>Total</td>
              <td className="tabular px-3 py-2.5 text-right text-ink">{aud(total)}</td>
              <td className="tabular px-3 py-2.5 text-right text-ink">{aud(value.totalAnnualBenefitAud)}</td>
              <td className="tabular px-3 py-2.5 text-right text-status-green-fg">
                {aud(value.totalBankedValueAud)}
                <span className="block text-[11px] font-normal text-ink-faint">{value.bankedConversionPct}% banked</span>
              </td>
              <td className="px-3 py-2.5"></td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        Hover any figure (ⓘ) for its basis. <strong className="font-medium text-ink">Theoretical value</strong> = modeled
        annual benefit; <strong className="font-medium text-ink">banked</strong> = the portion converted to hard P&amp;L
        (cost removed, losses avoided, revenue booked). The gap is the work — and the reason to engage Hepburn.
      </p>
    </div>
  );
}
