/**
 * § UX Change #1: Coverage / Data-Quality Banner
 *
 * Displays current coverage status (assessed use cases, reconciled spend, pending validations,
 * stale evidence, expired TAIL refs) in a visible banner.
 */

import { CoverageStatement } from "@/lib/data-model";
import { pct } from "@/lib/format";

export function P0CoverageBanner({ coverage }: { coverage: CoverageStatement }) {
  const assessedPct = pct(coverage.assessed_use_cases, coverage.total_use_cases);
  const reconciledPct = pct(coverage.reconciled_spend_aud, coverage.total_spend_aud);

  const issuesCount =
    coverage.pending_validations +
    coverage.stale_evidence_count +
    coverage.expired_tail_refs;

  return (
    <div className="mx-auto max-w-6xl px-4 py-4 sm:px-6">
      <div className="rounded-card border border-accent/30 bg-accent-soft/40 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold text-ink">Data Quality & Coverage</h3>
          <span
            className={`text-sm font-medium ${issuesCount === 0 ? "text-success" : "text-warn"}`}
          >
            {issuesCount === 0 ? "✓ No gaps" : `⚠ ${issuesCount} issue(s)`}
          </span>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Assessed Use Cases
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {coverage.assessed_use_cases}/{coverage.total_use_cases}
            </p>
            <p className="text-xs text-ink-muted">{assessedPct}% coverage</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Reconciled Spend
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              A${(coverage.reconciled_spend_aud / 1000000).toFixed(1)}M
            </p>
            <p className="text-xs text-ink-muted">
              of A${(coverage.total_spend_aud / 1000000).toFixed(1)}M ({reconciledPct}%)
            </p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Pending Validations
            </p>
            <p className="mt-1 text-lg font-semibold text-ink">
              {coverage.pending_validations}
            </p>
            <p className="text-xs text-ink-muted">evidence items awaiting review</p>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-ink-muted">
              Data Quality Flags
            </p>
            <p className="mt-1 text-lg font-semibold text-warn">
              {coverage.stale_evidence_count + coverage.expired_tail_refs}
            </p>
            <p className="text-xs text-ink-muted">
              stale/expired evidence or TAIL refs
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
