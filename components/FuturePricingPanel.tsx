import Link from "next/link";
import type { FutureRollup } from "@/lib/portfolio";
import { aud, audCompact } from "@/lib/format";
import { ProvenancePill } from "./ProvenancePill";

function CompareRow({
  label,
  today,
  future,
  worse,
}: {
  label: string;
  today: string;
  future: string;
  worse?: boolean;
}) {
  return (
    <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] items-baseline gap-x-2 py-2 sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-3">
      <span className="text-sm text-ink-muted">{label}</span>
      <span className="tabular whitespace-nowrap text-right text-sm font-medium text-ink">{today}</span>
      <span className={`tabular whitespace-nowrap text-right text-sm font-semibold ${worse ? "text-status-red-fg" : "text-ink"}`}>
        {future}
      </span>
    </div>
  );
}

/**
 * "Will it survive future pricing?" (BUILD addendum — Simon: use cases that
 * survive today's pricing might not survive future pricing). Stress-tests the
 * whole portfolio against the AI Ledger's price-to-cost-recovery multiple and
 * surfaces the use cases that flip from net-positive to underwater.
 */
export function FuturePricingPanel({
  future,
  evidenceBackedTodayRoi,
  asOf,
}: {
  future: FutureRollup;
  evidenceBackedTodayRoi: number;
  asOf: string;
}) {
  return (
    <section aria-label="Future pricing stress test" className="rounded-card border border-border bg-surface p-5 sm:p-6">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold text-ink">Will it survive future pricing?</h2>
        <span className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">Powered by The AI Ledger</span>
      </div>
      <div className="mt-3">
        <ProvenancePill tier={3} confidence="Med" asOf={asOf} />
      </div>
      <p className="mt-1 max-w-3xl text-sm text-ink-muted">
        Today&rsquo;s token prices are subsidised. Stress the portfolio against the Ledger&rsquo;s
        price-to-cost-recovery multiple ({future.multiple.toFixed(2)}×) and the economics shift — some use
        cases that pay their way today no longer do.
      </p>

      <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
        {/* Comparison */}
        <div>
          <div className="grid grid-cols-[minmax(0,1fr)_4.5rem_4.5rem] gap-x-2 border-b border-border pb-1 text-xs font-medium uppercase tracking-wide text-ink-faint sm:grid-cols-[minmax(0,1fr)_5.5rem_5.5rem] sm:gap-x-3">
            <span></span>
            <span className="text-right">Today</span>
            <span className="text-right">Future</span>
          </div>
          <CompareRow label="Annual AI cost" today={audCompact(future.todayCost)} future={audCompact(future.futureCost)} worse />
          <CompareRow
            label="Net value (theoretical)"
            today={audCompact(future.todayNetValue)}
            future={audCompact(future.futureNetValue)}
            worse
          />
          <CompareRow label="Portfolio ROI" today={`${future.todayRoiPct}%`} future={`${future.futureRoiPct}%`} worse />
          <CompareRow
            label="Use cases net-positive"
            today={`${future.survivingToday} of 10`}
            future={`${future.survivingFuture} of 10`}
            worse
          />
          <p className="mt-3 text-xs text-ink-faint">
            Even the evidence-backed core compresses — {evidenceBackedTodayRoi}% →{" "}
            {future.evidenceBackedFutureRoiPct}% ROI — but it survives. The margin is in the marginal use cases.
          </p>
        </div>

        {/* Flippers */}
        <div className="rounded-card border border-status-red-solid/30 bg-status-red-soft/30 p-4">
          <p className="text-sm font-medium text-ink">Survives today — not future pricing</p>
          {future.flippers.length === 0 ? (
            <p className="mt-2 text-sm text-ink-muted">No use cases flip at this multiple.</p>
          ) : (
            <ul className="mt-2 space-y-3">
              {future.flippers.map((f) => (
                <li key={f.id} className="text-sm">
                  <Link href={`/register/${f.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                    {f.name}
                  </Link>
                  <p className="tabular mt-0.5 text-ink-muted">
                    <span className="text-status-green-fg">+{aud(f.todayNet)}</span> today →{" "}
                    <span className="font-semibold text-status-red-fg">−{aud(Math.abs(f.futureNet))}</span> under future pricing
                  </p>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-xs leading-snug text-ink-faint">
            These are the use cases to pressure-test now — the economic case depends on prices that the Ledger
            shows are temporary.
          </p>
        </div>
      </div>
    </section>
  );
}
