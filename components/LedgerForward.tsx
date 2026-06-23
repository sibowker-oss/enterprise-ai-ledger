import type { Benchmarks } from "@/lib/types";
import type { TokenUpliftRow, VendorCost } from "@/lib/portfolio";
import { aud, audCompact } from "@/lib/format";
import { costTypeColor, palette, status } from "@/styles/tokens";
import { ProvenancePill } from "./ProvenancePill";

function StatTile({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-card border border-border bg-paper/60 p-4">
      <p className="tabular text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-xs leading-snug text-ink-faint">{label}</p>
    </div>
  );
}

/**
 * The AI Ledger forward view (BUILD addendum — Simon: deepen the Ledger data to
 * truly distinguish this). Two proprietary, forward-looking lenses a generic
 * adviser can't produce:
 *   1. Token-price uplift across use cases (the subsidy unwinds).
 *   2. Seats → consumption shift per vendor (what the Ledger predicts).
 * Anchored by the Ledger's real token-volume trajectory (~2x/year).
 */
export function LedgerForward({
  tokenUplift,
  vendors,
  seats,
  benchmarks,
  multiple,
}: {
  tokenUplift: TokenUpliftRow[];
  vendors: VendorCost[];
  seats: { seats: number; consumption: number; seatsPct: number };
  benchmarks: Benchmarks;
  multiple: number;
}) {
  const tt = benchmarks.tokenTrajectory;
  const years = Object.keys(tt.perDayTrillions);
  const maxTraj = Math.max(...Object.values(tt.perDayTrillions));
  const tokensToday = tokenUplift.reduce((s, r) => s + r.tokensToday, 0);
  const tokensUplifted = tokenUplift.reduce((s, r) => s + r.tokensUplifted, 0);
  const maxUplift = Math.max(...tokenUplift.map((r) => r.tokensUplifted), 1);
  const maxVendor = Math.max(...vendors.map((v) => v.seats + v.consumption), 1);

  return (
    <section
      aria-label="The AI Ledger forward view"
      className="space-y-6 rounded-card border border-accent/30 bg-accent-soft/40 p-5 sm:p-6"
    >
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
          The AI Ledger forward view
        </p>
        <h2 className="mt-1 text-lg font-semibold text-ink">Where your AI bill is going — not just what it is today</h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-ink-muted">
          A generic adviser models today&rsquo;s invoice. The Ledger models the trajectory — and your bill
          rides two forces it tracks: <strong className="font-medium text-ink">token prices rising</strong> as
          the subsidy unwinds, and <strong className="font-medium text-ink">consumption exploding</strong> as
          vendors move you off fixed seats onto metered usage.
        </p>
        <div className="mt-3">
          <ProvenancePill tier={3} confidence="Med" asOf={benchmarks.meta.asOf} />
        </div>
      </div>

      {/* Trajectory anchor */}
      <div className="grid gap-3 sm:grid-cols-3">
        <StatTile value="~2× / year" label="Global token consumption growth the Ledger projects (310 → 8,499 T tokens/day, 2025-30)" />
        <StatTile value={`${tt.yoyInferenceGrowthPct2025}%`} label="2025 YoY inference-volume growth (measured by the Ledger)" />
        <StatTile value={`US$${tt.notionalRateUsdPerMOutputTokens.toFixed(2)}`} label="Notional cost per million output tokens (Ledger model)" />
      </div>
      {/* Mini trajectory bars */}
      <div>
        <div className="flex items-end gap-2" style={{ height: 64 }} aria-hidden="true">
          {years.map((y) => (
            <div key={y} className="flex flex-1 flex-col items-center justify-end gap-1">
              <div
                className="w-full rounded-t-sm"
                style={{ height: `${(tt.perDayTrillions[y] / maxTraj) * 56}px`, backgroundColor: palette.accent }}
              />
              <span className="text-[10px] text-ink-faint">{y}</span>
            </div>
          ))}
        </div>
        <p className="mt-1 text-[11px] text-ink-faint">Trillion tokens / day, global — The AI Ledger forward token model.</p>
      </div>

      {/* Part A — token-price uplift by use case */}
      <div className="rounded-card border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-ink">1 · Token-price uplift, by use case</h3>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          At today&rsquo;s subsidised prices Meridian&rsquo;s token bill is <strong className="font-semibold text-ink">{aud(tokensToday)}</strong>.
          At the Ledger&rsquo;s price-to-cost-recovery multiple ({multiple.toFixed(2)}×) that becomes{" "}
          <strong className="font-semibold text-status-red-fg">{aud(tokensUplifted)}</strong> — and the agentic,
          token-heavy use cases carry almost all of the increase.
        </p>
        <ul className="mt-4 space-y-2.5">
          {tokenUplift.map((r) => (
            <li key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3">
              <div className="col-span-2 flex items-baseline justify-between gap-2 text-sm">
                <span className="truncate text-ink">
                  {r.name} <span className="text-ink-faint">· {r.vendor}</span>
                </span>
                <span className="tabular shrink-0 text-ink-muted">
                  {aud(r.tokensToday)} → <span className="font-medium text-ink">{aud(r.tokensUplifted)}</span>
                </span>
              </div>
              <div className="col-span-2 flex h-2.5 overflow-hidden rounded-full bg-surface-muted">
                <div className="h-full" style={{ width: `${(r.tokensToday / maxUplift) * 100}%`, backgroundColor: costTypeColor.tokens }} />
                <div className="h-full" style={{ width: `${(r.delta / maxUplift) * 100}%`, backgroundColor: status.red.solid }} />
              </div>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] text-ink-faint">
          <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: costTypeColor.tokens }} />Token cost today</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: status.red.solid }} />Uplift at cost-recovery</span>
        </p>
      </div>

      {/* Part B — seats → consumption by vendor */}
      <div className="rounded-card border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-ink">2 · Seats → consumption, by vendor</h3>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          <strong className="font-semibold text-ink">{seats.seatsPct}%</strong> of Meridian&rsquo;s licence-and-token spend is
          fixed per-seat licences today ({aud(seats.seats)} seats vs {aud(seats.consumption)} consumption). The Ledger&rsquo;s
          signal: vendors are repricing seats to <strong className="font-medium text-ink">metered consumption</strong> — where
          prices are subsidised and volumes double yearly. Each vendor&rsquo;s exposure:
        </p>
        <ul className="mt-4 space-y-4">
          {vendors.map((v) => {
            const p = benchmarks.providers[v.vendor];
            const w = v.seats + v.consumption;
            return (
              <li key={v.vendor}>
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 text-sm">
                  <span className="font-medium text-ink">
                    {v.vendor}
                    {p?.arrUsdB != null && <span className="ml-2 font-normal text-ink-faint">US${p.arrUsdB}B ARR{p.growth ? ` · ${p.growth}` : ""}</span>}
                    {p?.arrUsdB == null && p?.growth && <span className="ml-2 font-normal text-ink-faint">{p.growth}</span>}
                  </span>
                  <span className="tabular shrink-0 text-ink-muted">
                    {aud(v.seats)} seats · {v.consumption > 0 ? aud(v.consumption) : "no"} consumption
                  </span>
                </div>
                <div className="mt-1 flex h-3 overflow-hidden rounded-full bg-surface-muted" style={{ width: `${Math.max((w / maxVendor) * 100, 12)}%` }} role="img" aria-label={`${v.vendor}: ${aud(v.seats)} seats, ${aud(v.consumption)} consumption`}>
                  <div className="h-full" style={{ width: `${(v.seats / w) * 100}%`, backgroundColor: costTypeColor.licences }} />
                  <div className="h-full" style={{ width: `${(v.consumption / w) * 100}%`, backgroundColor: costTypeColor.tokens }} />
                </div>
                {p?.note && <p className="mt-1 text-xs text-ink-faint">Ledger view: {p.note}.</p>}
              </li>
            );
          })}
        </ul>
        <p className="mt-3 text-[11px] text-ink-faint">
          <span className="mr-3 inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: costTypeColor.licences }} />Per-seat licences</span>
          <span className="inline-flex items-center gap-1.5"><span className="inline-block h-2.5 w-2.5 rounded-sm align-middle" style={{ backgroundColor: costTypeColor.tokens }} />Metered consumption</span>
        </p>
        <p className="mt-3 border-t border-border pt-3 text-sm text-ink-muted">{tt.implication}</p>
      </div>
    </section>
  );
}
