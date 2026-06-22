"use client";

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { costTypeColor } from "@/styles/tokens";
import { costComponentLabel } from "@/lib/labels";
import { aud, audCompact, pct } from "@/lib/format";
import type { CostComponent } from "@/lib/types";

const ORDER: CostComponent[] = ["licences", "tokens", "cloud", "integration", "people"];

/**
 * Spend-by-cost-type donut (BUILD_SPEC §5.1). The "aha" is that tokens are
 * nearly as big as licences — so the legend states each value + share next to
 * the ring. Neutral ramp, NOT semantic colours.
 */
export function CostDonut({
  data,
  total,
}: {
  data: Record<CostComponent, number>;
  total: number;
}) {
  const slices = ORDER.map((key) => ({
    key,
    label: costComponentLabel[key],
    value: data[key],
    color: costTypeColor[key],
  }));

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:items-center">
      <div className="relative h-48 w-48 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={slices}
              dataKey="value"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={58}
              outerRadius={88}
              startAngle={90}
              endAngle={-270}
              stroke="#FFFFFF"
              strokeWidth={2}
              isAnimationActive={false}
            >
              {slices.map((s) => (
                <Cell key={s.key} fill={s.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: number, name) => [aud(value), name as string]}
              contentStyle={{
                borderRadius: 8,
                border: "1px solid #E3E1DB",
                fontSize: 13,
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-xs uppercase tracking-wide text-ink-faint">Total</span>
          <span className="tabular text-xl font-semibold text-ink">{audCompact(total)}</span>
        </div>
      </div>

      <ul className="w-full max-w-xs space-y-2">
        {slices.map((s) => (
          <li key={s.key} className="flex items-center gap-3 text-sm">
            <span
              aria-hidden="true"
              className="h-3 w-3 shrink-0 rounded-sm"
              style={{ backgroundColor: s.color }}
            />
            <span className="flex-1 text-ink">{s.label}</span>
            <span className="tabular font-medium text-ink">{aud(s.value)}</span>
            <span className="tabular w-10 text-right text-ink-faint">{pct(s.value, total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
