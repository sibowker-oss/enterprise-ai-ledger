"use client";

import { aud, pct } from "@/lib/format";
import { palette } from "@/styles/tokens";
import type { BusinessUnitSpend } from "@/lib/portfolio";

/**
 * Spend-by-business-unit horizontal bars (BUILD_SPEC §5.1). Hand-rolled SVG-free
 * bars (div widths) keep it plain, labelled and dependency-light — every bar
 * carries its A$ value and share. Shows where the money concentrates.
 */
export function BuBarChart({ data }: { data: BusinessUnitSpend[] }) {
  const max = Math.max(...data.map((d) => d.spend), 1);
  const total = data.reduce((s, d) => s + d.spend, 0);

  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.businessUnit} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1">
          <div className="flex items-baseline justify-between gap-2 col-span-2">
            <span className="truncate text-sm text-ink">{d.businessUnit}</span>
            <span className="tabular shrink-0 text-sm font-medium text-ink">
              {aud(d.spend)}
              <span className="ml-2 text-ink-faint">{pct(d.spend, total)}</span>
            </span>
          </div>
          <div
            className="col-span-2 h-2 overflow-hidden rounded-full bg-surface-muted"
            role="img"
            aria-label={`${d.businessUnit}: ${aud(d.spend)}, ${pct(d.spend, total)} of portfolio`}
          >
            <div
              className="h-full rounded-full"
              style={{ width: `${(d.spend / max) * 100}%`, backgroundColor: palette.accent }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
