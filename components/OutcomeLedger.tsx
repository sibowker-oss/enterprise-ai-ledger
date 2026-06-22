"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Confidence, UseCase } from "@/lib/types";
import { aud, audCompact, reviewDate } from "@/lib/format";
import { CONFIDENCE_ORDER, netValue, roiPct } from "@/lib/portfolio";
import { DecisionChip } from "./StatusChip";
import { ConfidenceDots } from "./ConfidenceDots";

const BACKED: Confidence[] = ["high", "medium-high"];
const isBacked = (c: Confidence) => BACKED.includes(c);

function Money({ v, signed = false }: { v: number; signed?: boolean }) {
  const color = v > 0 ? "text-status-green-fg" : v < 0 ? "text-status-red-fg" : "text-ink-muted";
  return (
    <span className={`tabular font-medium ${signed ? color : "text-ink"}`}>
      {signed && v !== 0 ? (v > 0 ? "+" : "−") : ""}
      {aud(Math.abs(v))}
    </span>
  );
}

/**
 * Outcome Ledger reframed as the value/ROI view (BUILD addendum — a CFO buys on
 * return, not operational metrics). Each row shows cost → benefit → net → ROI,
 * with the assumption basis on hover and evidence confidence as the trust
 * signal. The what-if toggle recomputes the evidence-backed return live:
 * A$2.07M cost → A$8.0M value (287% ROI).
 */
export function OutcomeLedger({
  useCases,
  total,
  evidenceBackedCost,
  evidenceBackedBenefit,
  evidenceBackedRoi,
  totalBenefit,
  portfolioRoi,
}: {
  useCases: UseCase[];
  total: number;
  evidenceBackedCost: number;
  evidenceBackedBenefit: number;
  evidenceBackedRoi: number;
  totalBenefit: number;
  portfolioRoi: number;
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

  return (
    <div className="space-y-6">
      {/* What-if banner */}
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">
              {onlyBacked ? "Evidence-backed return" : "Total annual return"}
            </p>
            <p className="tabular text-3xl font-semibold text-ink sm:text-4xl">
              {audCompact(onlyBacked ? evidenceBackedBenefit : totalBenefit)}
              <span className="tabular ml-2 align-middle text-base font-normal text-ink-faint">
                value on {audCompact(onlyBacked ? evidenceBackedCost : total)} cost ·{" "}
                <span className="font-semibold text-status-green-fg">
                  {onlyBacked ? evidenceBackedRoi : portfolioRoi}% ROI
                </span>
              </span>
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              {onlyBacked ? (
                <>
                  Only the <strong className="font-semibold text-ink">{backedCount} of {useCases.length}</strong> high /
                  medium-high confidence use cases — the bankable return.
                </>
              ) : (
                <>
                  Across all {useCases.length} use cases — but most of the benefit below is
                  vendor-claimed or self-reported. Toggle to see what is actually evidence-backed.
                </>
              )}
            </p>
          </div>

          {/* Toggle */}
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
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-card border border-border bg-surface">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">Use case</th>
              <th className="px-3 py-2 text-left font-medium">Confidence</th>
              <th className="px-3 py-2 text-right font-medium">Annual cost</th>
              <th className="px-3 py-2 text-right font-medium">Annual benefit</th>
              <th className="px-3 py-2 text-right font-medium">Net value</th>
              <th className="px-3 py-2 text-right font-medium">ROI</th>
              <th className="px-3 py-2 text-left font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((uc) => {
              const backed = isBacked(uc.outcome.confidence);
              const dimmed = onlyBacked && !backed;
              const net = netValue(uc);
              const roi = roiPct(uc);
              return (
                <tr
                  key={uc.id}
                  className={`border-b border-border/60 align-top transition-opacity ${dimmed ? "opacity-40" : "hover:bg-surface-muted/40"}`}
                >
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
                  <td className="px-3 py-3 text-right"><Money v={uc.cost.totalAnnual} /></td>
                  <td className="px-3 py-3 text-right" title={uc.value.basis}>
                    <span className="tabular font-medium text-ink underline decoration-dotted decoration-ink-faint/50 underline-offset-2">
                      {aud(uc.value.annualBenefitAud)}
                    </span>
                    <span className="ml-1 align-super text-[10px] text-ink-faint" aria-hidden="true">ⓘ</span>
                  </td>
                  <td className="px-3 py-3 text-right"><Money v={net} signed /></td>
                  <td className="px-3 py-3 text-right">
                    <span className={`tabular font-semibold ${roi >= 0 ? "text-status-green-fg" : "text-status-red-fg"}`}>
                      {roi >= 0 ? "+" : ""}
                      {roi}%
                    </span>
                  </td>
                  <td className="px-3 py-3"><DecisionChip decision={uc.decision} size="sm" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        Hover a benefit figure (ⓘ) for its basis. Benefit is the defensible/realised annual value;
        net value = benefit − cost; ROI = net ÷ cost. Trust = outcome confidence (evidence-backed = high or medium-high).
      </p>
    </div>
  );
}
