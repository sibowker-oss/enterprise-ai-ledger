"use client";

import { useState } from "react";
import type { LeverPlan, Levers } from "@/lib/simulator/engine";
import { QCard } from "./QCard";
import { Q3 } from "@/lib/simulator/labels";
import { leverSavingSentence, plannedTotalSentence } from "@/lib/simulator/copy";
import type { Cur } from "@/lib/simulator/format";
import { NumberField } from "./NumberField";

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

/** One slider + paired numeric field (A6) for a lever setting. */
function LeverControl({
  id,
  label,
  value,
  max,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  max: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-[80px] shrink-0 text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
        {label}
      </span>
      <input
        id={id}
        type="range"
        min={0}
        max={Math.max(max, 5)}
        step={5}
        value={value}
        aria-label={label}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-accent"
      />
      <NumberField
        id={`${id}-num`}
        label={label}
        value={value}
        min={0}
        max={max}
        step={5}
        compact
        onChange={onChange}
      />
    </div>
  );
}

/**
 * Q3 — the levers you control, split into what you're DOING NOW (defaults to
 * zero — the cost above runs on this) and what you're PLANNING (A3). Each
 * lever's planned saving is shown on its own, and the combined planned figure
 * is a separate line — never quietly baked into the headline cost.
 */
export function Q3Levers({
  levers,
  caps,
  clamped,
  savings,
  plannedCost,
  currentCost,
  cur,
  onChange,
}: {
  levers: LeverPlan;
  caps: Levers;
  clamped: boolean;
  /** Per-lever monthly saving at the PLANNED setting, computed alone. */
  savings: Record<keyof Levers, number>;
  /** Total monthly cost with all planned levers applied (envelope-clamped) vs now. */
  plannedCost: number;
  currentCost: number;
  cur: Cur;
  onChange: (which: "now" | "planned", key: keyof Levers, value: number) => void;
}) {
  const [open, setOpen] = useState<keyof Levers | null>(null);
  return (
    <QCard num="3" title={Q3.title}>
      <p className="mb-2 text-[15px] leading-relaxed text-ink-muted">{Q3.intro}</p>
      <p className="mb-2 rounded-tile border border-border bg-surface-muted p-3 text-[13px] leading-relaxed text-ink-muted">
        {Q3.familiesNote}
      </p>
      <p className="mb-4 text-[12.5px] leading-snug text-ink-faint">{Q3.nowHint}</p>

      <div className="space-y-5">
        {(Object.keys(META) as (keyof Levers)[]).map((key) => {
          const meta = META[key];
          const available = caps[key] > 0;
          const panelId = `lever-info-${key}`;
          return (
            <div key={key} className={available ? "" : "opacity-70"}>
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-semibold text-ink">{meta.name}</span>
                <button
                  type="button"
                  onClick={() => setOpen((o) => (o === key ? null : key))}
                  aria-expanded={open === key}
                  aria-controls={panelId}
                  className="flex h-[28px] w-[28px] items-center justify-center rounded-chip border border-border text-[11px] font-semibold italic leading-none text-ink-faint hover:border-accent hover:text-accent-text"
                >
                  <span aria-hidden="true">i</span>
                  <span className="sr-only">
                    {Q3.infoOpen}: {meta.name}
                  </span>
                </button>
                {available ? (
                  <span className="ml-auto text-right text-[11.5px] tabular leading-tight text-ink-faint">
                    {leverSavingSentence(savings[key], cur)}
                  </span>
                ) : (
                  <span className="ml-auto text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
                    n/a
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-[11.5px] leading-snug text-ink-faint">
                {available ? meta.short : key === "batch" ? Q3.batchUnavailable : Q3.unavailableHere}
              </p>
              {open === key && (
                <p
                  id={panelId}
                  className="mt-1.5 rounded-tile bg-surface-muted p-2.5 text-[11.5px] leading-relaxed text-ink-muted"
                >
                  {meta.detail}
                </p>
              )}
              {available && (
                <div className="mt-2 space-y-1.5">
                  <LeverControl
                    id={`lever-now-${key}`}
                    label={Q3.nowLabel}
                    value={levers.now[key]}
                    max={caps[key]}
                    onChange={(v) => onChange("now", key, v)}
                  />
                  <LeverControl
                    id={`lever-planned-${key}`}
                    label={Q3.plannedLabel}
                    value={levers.planned[key]}
                    max={caps[key]}
                    onChange={(v) => onChange("planned", key, v)}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <p className="mt-4 rounded-tile border border-accent/30 bg-accent-soft p-3 text-[13px] leading-relaxed text-ink">
        {plannedTotalSentence(plannedCost, currentCost, cur)}
      </p>
      {clamped && (
        <p className="mt-3 rounded-tile border border-border bg-surface-muted p-2.5 text-[12.5px] leading-snug text-ink-muted">
          {Q3.clampNote}
        </p>
      )}
      <p className="mt-4 text-[14px] leading-relaxed text-ink-muted">{Q3.footer}</p>
    </QCard>
  );
}
