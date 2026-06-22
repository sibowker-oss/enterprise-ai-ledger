"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Confidence, UseCase } from "@/lib/types";
import { aud, audCompact, pct, reviewDate } from "@/lib/format";
import { CONFIDENCE_ORDER } from "@/lib/portfolio";
import { DecisionChip } from "./StatusChip";
import { ConfidenceDots } from "./ConfidenceDots";

const BACKED: Confidence[] = ["high", "medium-high"];
const isBacked = (c: Confidence) => BACKED.includes(c);

/**
 * Outcome Ledger (BUILD_SPEC §5.4). Confidence is the visual spine — rows are
 * sorted high → low so the contrast is obvious. The single what-if toggle greys
 * the rows NOT backed by high/medium-high evidence and recomputes the
 * evidence-backed figure live (A$2,066,000 of A$3,713,000).
 */
export function OutcomeLedger({ useCases, total }: { useCases: UseCase[]; total: number }) {
  const [onlyBacked, setOnlyBacked] = useState(false);

  const backedSpend = useMemo(
    () => useCases.filter((uc) => isBacked(uc.outcome.confidence)).reduce((s, uc) => s + uc.cost.totalAnnual, 0),
    [useCases],
  );
  const backedCount = useCases.filter((uc) => isBacked(uc.outcome.confidence)).length;

  const sorted = useMemo(
    () =>
      [...useCases].sort(
        (a, b) =>
          CONFIDENCE_ORDER[b.outcome.confidence] - CONFIDENCE_ORDER[a.outcome.confidence] ||
          b.cost.totalAnnual - a.cost.totalAnnual,
      ),
    [useCases],
  );

  return (
    <div className="space-y-6">
      {/* What-if banner */}
      <div className="rounded-card border border-border bg-surface p-5 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-ink-muted">
              {onlyBacked ? "Spend backed by solid outcome evidence" : "Total annual AI spend"}
            </p>
            <p className="tabular text-4xl font-semibold text-ink">
              {audCompact(onlyBacked ? backedSpend : total)}
              {onlyBacked && (
                <span className="tabular ml-2 align-middle text-base font-normal text-ink-faint">
                  of {audCompact(total)} · {pct(backedSpend, total)}
                </span>
              )}
            </p>
            <p className="mt-1 text-sm text-ink-faint">
              Only <strong className="font-semibold text-ink">{backedCount} of {useCases.length}</strong> use
              cases carry high or medium-high confidence evidence — the rest rely on vendor or anecdotal claims.
            </p>
          </div>

          {/* Toggle */}
          <label className="inline-flex cursor-pointer select-none items-center gap-3 print:hidden">
            <span className="text-sm text-ink-muted">Show only evidence-backed spend</span>
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
        <table className="w-full min-w-[920px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-faint">
              <th className="px-3 py-2 text-left font-medium">Use case</th>
              <th className="px-3 py-2 text-left font-medium">Primary metric</th>
              <th className="px-3 py-2 text-left font-medium">Baseline → target</th>
              <th className="px-3 py-2 text-left font-medium">Evidence</th>
              <th className="px-3 py-2 text-left font-medium">Confidence</th>
              <th className="px-3 py-2 text-right font-medium">Annual cost</th>
              <th className="px-3 py-2 text-left font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((uc) => {
              const backed = isBacked(uc.outcome.confidence);
              const dimmed = onlyBacked && !backed;
              return (
                <tr
                  key={uc.id}
                  className={`border-b border-border/60 align-top transition-opacity ${dimmed ? "opacity-40" : "hover:bg-surface-muted/40"}`}
                >
                  <td className="px-3 py-3">
                    <Link href={`/register/${uc.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {uc.name}
                    </Link>
                    <span className="block text-xs text-ink-faint">{uc.id}</span>
                  </td>
                  <td className="px-3 py-3 text-ink-muted">{uc.outcome.primaryMetric}</td>
                  <td className="px-3 py-3 text-ink-muted">
                    <span className="block">{uc.outcome.baseline}</span>
                    <span className="block text-ink-faint">→ {uc.outcome.target}</span>
                  </td>
                  <td className="max-w-xs px-3 py-3 text-ink-muted">{uc.outcome.evidence}</td>
                  <td className="px-3 py-3">
                    <ConfidenceDots confidence={uc.outcome.confidence} />
                    <span className="mt-1 block text-xs text-ink-faint">Review {reviewDate(uc.outcome.reviewDate)}</span>
                  </td>
                  <td className="tabular px-3 py-3 text-right font-medium text-ink">{aud(uc.cost.totalAnnual)}</td>
                  <td className="px-3 py-3"><DecisionChip decision={uc.decision} size="sm" /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-ink-faint">
        Confidence is shown as 4 steps (1 = low, 4 = high). Evidence-backed = high or medium-high confidence.
      </p>
    </div>
  );
}
