/**
 * § UX Change #4: Four Value Lanes (Side by Side)
 *
 * Shows the four lanes separately and never sums them:
 * 1. Annual Theoretical Value (full promise)
 * 2. Observed Operational Improvement
 * 3. Capacity Released (separate; never added to banked)
 * 4. Banked Value (validated + finance-signed only)
 *
 * Also shows cash-conversion rate = banked / theoretical.
 * And revenue-up lane (revenue-realised only, separate from other capacity).
 */

import { audCompact, pct } from "@/lib/format";

export function P0FourValueLanes({
  theoretical,
  observed,
  capacity,
  banked,
}: {
  theoretical: number;
  observed: number;
  capacity: number;
  banked: number;
}) {
  const cashConversion = theoretical > 0 ? banked / theoretical : 0;

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
        <div className="rounded-card border border-slate-200 bg-slate-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Theoretical Value
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(theoretical)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Full promise (all benefit claims, every status)
          </p>
          <div className="mt-3 h-1 w-full bg-slate-300" />
        </div>

        {/* Lane 2: Observed Operational */}
        <div className="rounded-card border border-blue-200 bg-blue-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Observed Operational
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(observed)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Measured process improvement
          </p>
          <div className="mt-3 h-1 w-full bg-blue-300" />
        </div>

        {/* Lane 3: Capacity Released */}
        <div className="rounded-card border border-amber-200 bg-amber-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Capacity Released
          </p>
          <p className="mt-2 text-2xl font-bold text-ink">
            {audCompact(capacity)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Freed time/throughput (NOT added to banked)
          </p>
          <div className="mt-3 h-1 w-full bg-amber-300" />
        </div>

        {/* Lane 4: Banked Value */}
        <div className="rounded-card border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Banked Value
          </p>
          <p className="mt-2 text-2xl font-bold text-emerald-700">
            {audCompact(banked)}
          </p>
          <p className="mt-2 text-xs text-ink-muted">
            Validated + finance-signed only
          </p>
          <div className="mt-3 h-1 w-full bg-emerald-400" />
        </div>
      </div>

      {/* Cash Conversion Rate */}
      <div className="mt-6 rounded-card border border-accent/30 bg-accent-soft/20 p-5">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
              Cash Conversion Rate
            </p>
            <p className="mt-2 text-3xl font-bold text-ink">
              {Math.round(cashConversion * 100)}%
            </p>
            <p className="mt-2 text-sm text-ink-muted">
              Banked ÷ Theoretical = how much of the promise is real
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-ink-muted">Formula: {audCompact(banked)} ÷ {audCompact(theoretical)}</p>
            <p className="mt-2 text-xs font-medium text-ink">
              When <strong>100%</strong>: the use case banked its entire promise.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
