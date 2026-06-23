"use client";

import { useState } from "react";
import type { Benchmarks } from "@/lib/types";
import { aud, audCompact, reviewDate } from "@/lib/format";
import { ProvenancePill } from "./ProvenancePill";

function Stat({ value, label, sub }: { value: string; label: string; sub?: string }) {
  return (
    <div className="rounded-card border border-border bg-paper/60 p-4">
      <p className="tabular text-2xl font-semibold text-ink">{value}</p>
      <p className="mt-1 text-sm font-medium text-ink">{label}</p>
      {sub && <p className="mt-0.5 text-xs leading-snug text-ink-faint">{sub}</p>}
    </div>
  );
}

/**
 * The differentiation layer (BUILD addendum — the site should draw on The AI
 * Ledger's proprietary market data for an economic view a generic adviser can't
 * reproduce). Uses REAL TAIL figures (data/ledger-benchmarks.json) to benchmark
 * Meridian and to run a subsidy-normalisation stress test — today's AI prices
 * are VC-subsidised, and only the AI Ledger quantifies the forward exposure.
 */
export function LedgerBenchmark({
  vendorPricedCost,
  audPerMTokens,
  benchmarks,
}: {
  vendorPricedCost: number;
  audPerMTokens: number;
  benchmarks: Benchmarks;
}) {
  const { subsidyEconomics: se, tokenEconomics: te, meta } = benchmarks;
  const maxMult = se.priceToCostRecoveryMultiple;
  const [mult, setMult] = useState(1);

  const stressedCost = Math.round(vendorPricedCost * mult);
  const exposure = stressedCost - vendorPricedCost;
  const atFullRecovery = Math.round(vendorPricedCost * maxMult);

  return (
    <section
      aria-label="AI Ledger market benchmark"
      className="rounded-card border border-accent/30 bg-accent-soft/40 p-5 sm:p-6"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
            Powered by The AI Ledger
          </p>
          <h2 className="mt-1 text-lg font-semibold text-ink">
            Benchmarked against the real market economics of AI
          </h2>
          <div className="mt-3">
            <ProvenancePill tier={2} confidence="Med" asOf={meta.asOf} />
          </div>
        </div>
        <a
          href={meta.sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-accent hover:underline"
        >
          {meta.source} · as at {reviewDate(meta.asOf)} →
        </a>
      </div>

      <p className="mt-3 max-w-3xl text-sm leading-relaxed text-ink-muted">
        These reference points come from The AI Ledger — Hepburn&rsquo;s market-level model of AI
        economics. A generic adviser sees Meridian&rsquo;s invoices; only the Ledger places them
        against what AI actually costs the market to provide.
      </p>

      {/* Real market stats */}
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <Stat
          value={`A$${audPerMTokens.toFixed(2)}`}
          label="Blended token rate / M tokens"
          sub="Realised price across inference gateways the Ledger tracks (incl. cheap open-weight traffic)."
        />
        <Stat
          value={`US$${se.subsidyPerRevenueDollar.toFixed(2)}`}
          label="VC subsidy per $1 of revenue"
          sub={`Industry customers pay US$${se.customerRevenueUsdB}B for AI that costs US$${se.systemCostUsdB}B to provide.`}
        />
        <Stat
          value={`${se.customerCostRecoveryPct}%`}
          label="Of true cost paid by customers"
          sub="The rest is subsidised — so today's token, inference and seat prices are below cost."
        />
      </div>

      {/* Stress test */}
      <div className="mt-5 rounded-card border border-border bg-surface p-5">
        <h3 className="text-base font-semibold text-ink">Subsidy-normalisation stress test</h3>
        <p className="mt-1 max-w-3xl text-sm text-ink-muted">
          Meridian&rsquo;s vendor-priced AI cost (licences + tokens + cloud) is{" "}
          <strong className="font-semibold text-ink">{aud(vendorPricedCost)}</strong> at today&rsquo;s
          subsidised prices. As vendor economics move toward cost-recovery, the same usage costs more.
          Drag to stress-test:
        </p>

        <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center">
          <input
            type="range"
            min={1}
            max={maxMult}
            step={0.01}
            value={mult}
            onChange={(e) => setMult(parseFloat(e.target.value))}
            aria-label="Price-normalisation multiple"
            className="h-2 w-full cursor-pointer accent-accent sm:max-w-sm"
          />
          <div className="tabular flex items-baseline gap-2">
            <span className="text-sm text-ink-faint">{mult.toFixed(2)}× today</span>
          </div>
        </div>
        <div className="mt-1 flex justify-between text-[11px] text-ink-faint sm:max-w-sm">
          <span>Today (1.0×)</span>
          <span>Full cost-recovery ({maxMult.toFixed(2)}×)</span>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-3">
          <div className="rounded-card border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">At {mult.toFixed(2)}× today</p>
            <p className="tabular text-2xl font-semibold text-ink">{audCompact(stressedCost)}</p>
          </div>
          <div className="rounded-card border border-border p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">Unbudgeted exposure</p>
            <p className="tabular text-2xl font-semibold text-status-red-fg">
              {exposure === 0 ? "—" : `+${audCompact(exposure)}`}
            </p>
          </div>
          <div className="rounded-card border border-status-red-solid/40 bg-status-red-soft/40 p-4">
            <p className="text-xs uppercase tracking-wide text-ink-faint">At full cost-recovery</p>
            <p className="tabular text-2xl font-semibold text-status-red-fg">{audCompact(atFullRecovery)}</p>
            <p className="tabular mt-0.5 text-xs text-ink-faint">+{audCompact(atFullRecovery - vendorPricedCost)} vs today</p>
          </div>
        </div>

        <p className="mt-4 text-xs leading-relaxed text-ink-faint">
          Illustrative scenario. The {maxMult.toFixed(2)}× ceiling is the AI Ledger&rsquo;s price-to-cost-recovery
          multiple (system cost ÷ customer revenue). This forward economic view — what your AI costs
          when the subsidy unwinds — is the kind of insight only The AI Ledger&rsquo;s data makes possible.
        </p>
      </div>
    </section>
  );
}
