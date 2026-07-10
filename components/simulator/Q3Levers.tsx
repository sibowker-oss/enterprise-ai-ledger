"use client";

import { useState } from "react";
import type { Levers } from "@/lib/simulator/engine";
import { QCard } from "./QCard";
import { Q3 } from "@/lib/simulator/labels";

interface LeverMeta {
  name: string;
  short: string;
  detail: string;
}

const META: Record<keyof Levers, LeverMeta> = {
  cache: { name: Q3.cacheName, short: Q3.cacheShort, detail: Q3.cacheDetail },
  batch: { name: Q3.batchName, short: Q3.batchShort, detail: Q3.batchDetail },
  route: { name: Q3.routeName, short: Q3.routeShort, detail: Q3.routeDetail },
};

function Lever({
  id,
  value,
  max,
  onChange,
  available = true,
  unavailableReason,
}: {
  id: keyof Levers;
  value: number;
  max: number;
  onChange: (v: number) => void;
  /** A lever that doesn't apply to this use case stays visible but disabled. */
  available?: boolean;
  unavailableReason?: string;
}) {
  // React-controlled disclosure (not native <details>) — the whole page
  // re-renders on every slider drag, and an uncontrolled <details open> trips a
  // hydration warning. This keeps the console clean.
  const [open, setOpen] = useState(false);
  const meta = META[id];
  const panelId = `lever-info-${id}`;
  return (
    <div className={available ? "" : "opacity-70"}>
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          {/* Proper term as the primary name; the plain "what's involved" is in the ⓘ. */}
          <label htmlFor={`lever-${id}`} className="text-[13px] font-semibold text-ink">
            {meta.name}
          </label>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex h-[18px] w-[18px] items-center justify-center rounded-chip border border-border text-[11px] font-semibold italic leading-none text-ink-faint hover:border-accent hover:text-accent-text"
          >
            <span aria-hidden="true">i</span>
            <span className="sr-only">
              {Q3.infoOpen}: {meta.name}
            </span>
          </button>
        </div>
        {available ? (
          <span className="tabular text-[13px] font-semibold text-accent-text">{value}%</span>
        ) : (
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">n/a</span>
        )}
      </div>
      <input
        id={`lever-${id}`}
        type="range"
        min={0}
        max={available ? max : 100}
        step={5}
        value={available ? value : 0}
        disabled={!available}
        aria-disabled={!available}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-1.5 w-full accent-accent disabled:cursor-not-allowed disabled:opacity-50"
      />
      <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
        {available ? meta.short : unavailableReason}
      </p>
      {open && (
        <p id={panelId} className="mt-1.5 rounded-tile bg-surface-muted p-2.5 text-[11.5px] leading-relaxed text-ink-muted">
          {meta.detail}
        </p>
      )}
    </div>
  );
}

/**
 * Q3 — the levers you control. Two families kept separate (library P6): the
 * SETUP slider (consumption — how much it reads/writes) lives on the left; these
 * are the BILLING levers (cheaper tokens) that multiply on top. Their combined
 * saving is capped to what the evidence supports for this workload, so they
 * can't double-count. Live recompute drives the cost box above.
 */
export function Q3Levers({
  levers,
  caps,
  clamped,
  onChange,
}: {
  levers: Levers;
  caps: Levers;
  clamped: boolean;
  onChange: (key: keyof Levers, value: number) => void;
}) {
  return (
    <QCard num="3" title={Q3.title}>
      <p className="mb-2 text-[15px] leading-relaxed text-ink-muted">{Q3.intro}</p>
      <p className="mb-4 rounded-tile border border-border bg-surface-muted p-3 text-[13px] leading-relaxed text-ink-muted">
        {Q3.familiesNote}
      </p>
      <div className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2">
        <Lever id="cache" value={levers.cache} max={caps.cache} onChange={(v) => onChange("cache", v)} />
        {/* Batching stays visible even when it doesn't apply — disabled, with the reason. */}
        <Lever
          id="batch"
          value={levers.batch}
          max={caps.batch}
          onChange={(v) => onChange("batch", v)}
          available={caps.batch > 0}
          unavailableReason={Q3.batchUnavailable}
        />
        <Lever id="route" value={levers.route} max={caps.route} onChange={(v) => onChange("route", v)} />
      </div>
      {clamped && (
        <p className="mt-3 rounded-tile border border-border bg-surface-muted p-2.5 text-[12.5px] leading-snug text-ink-muted">
          {Q3.clampNote}
        </p>
      )}
      <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">{Q3.footer}</p>
    </QCard>
  );
}
