/**
 * § UX Change #4: Four Value Lanes (Side by Side)
 *
 * Shows the four lanes separately and never sums them:
 * 1. Annual Theoretical Value (full promise)
 * 2. Observed Operational Improvement
 * 3. Capacity Released (separate; never added to banked)
 * 4. Banked Value (validated + finance-signed only)
 *
 * Also shows ROI = (banked - annual_cost) / annual_cost.
 * And revenue-up lane (revenue-realised only, separate from other capacity).
 */

import { audCompact } from "@/lib/format";

export interface P0FourValueLanesProps {
  theoretical: number;
  observed: number;
  capacity: number;
  banked: number;
  annual_cost?: number;
}

export function P0FourValueLanes({
  theoretical,
  observed,
  capacity,
  banked,
  annual_cost = 0,
}: P0FourValueLanesProps) {
  const roi = annual_cost > 0 ? ((banked - annual_cost) / annual_cost) * 100 : 0;

  return (
    <div>
      <div className="mb-6">
        <h3 className="mb-4 font-semibold text-ink">AI Value — Four Lanes</h3>
        <p className="mb-4 text-sm text-ink-muted">
          Separate lanes, never summed. Theoretical = full promise (all claims, every status).
          Banked = validated, finance-signed only.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Lane 1: Theoretical (Full Promise) */}
        <div className="rounded-card border border-border bg-surface-muted p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-grey-fg">
            Theoretical Value
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(theoretical)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Full promise (all benefit claims, every status)
          </p>
          <div className="mt-3 h-1 w-full bg-status-grey-solid" />
        </div>

        {/* Lane 2: Observed Operational */}
        <div className="rounded-card border border-border bg-surface-muted p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
            Observed Operational
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(observed)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Measured process improvement
          </p>
          <div className="mt-3 h-1 w-full bg-accent" />
        </div>

        {/* Lane 3: Capacity Released */}
        <div className="rounded-card border border-border bg-surface-muted p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-amber-fg">
            Capacity Released
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(capacity)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Freed time/throughput (NOT added to banked)
          </p>
          <div className="mt-3 h-1 w-full bg-status-amber-solid" />
        </div>

        {/* Lane 4: Banked Value */}
        <div className="rounded-card border border-border bg-surface-muted p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-status-green-fg">
            Banked Value
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(banked)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Validated + finance-signed only
          </p>
          <div className="mt-3 h-1 w-full bg-status-green-solid" />
        </div>
      </div>

      {/* ROI */}
      {annual_cost > 0 && (
        <div className="mt-6 rounded-card border border-border bg-surface-muted p-5">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-status-green-fg">
                Return on Investment
              </p>
              <p className="mt-2 text-3xl font-bold text-ink">
                {roi > 0 ? "+" : ""}{Math.round(roi)}%
              </p>
              <p className="mt-2 text-sm text-ink-muted">
                (Banked Value − Annual Cost) ÷ Annual Cost
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-ink-muted">
                {audCompact(banked)} − {audCompact(annual_cost)} ÷ {audCompact(annual_cost)}
              </p>
              <p className="mt-2 text-xs font-medium text-ink">
                Measures the financial return on the AI investment.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
