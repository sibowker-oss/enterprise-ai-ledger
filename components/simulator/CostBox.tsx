import type { CostBand } from "@/lib/simulator/types";
import type { Archetype } from "@/lib/simulator/archetypes";
import { QCard } from "./QCard";
import { COST, SEAT } from "@/lib/simulator/labels";
import {
  costMixSentence,
  perUnitTag,
  seatIntroSentence,
  seatProductLine,
  seatStatusLabel,
  spreadSentence,
  unitEconSentence,
} from "@/lib/simulator/copy";
import { seatPricesAsOf, seatProductsFor } from "@/lib/simulator/data";
import { asOfLabel, usdK, usdUnit } from "@/lib/simulator/format";

type Tone = "floor" | "today" | "repriced";

function Segment({
  tone,
  label,
  total,
  aiUsage,
  buildRun,
  perUnit,
}: {
  tone: Tone;
  label: string;
  total: number;
  aiUsage: number;
  buildRun: number;
  /** Per-unit tag, e.g. "$52 / developer / mo" — unit economics travel, totals don't. */
  perUnit: string;
}) {
  const tone_ = {
    floor: { box: "bg-status-green-soft", val: "text-status-green-fg" },
    today: { box: "bg-surface-muted", val: "text-ink" },
    repriced: { box: "bg-status-red-soft", val: "text-status-red-fg" },
  }[tone];
  return (
    <div className={`flex-1 rounded-tile p-3.5 text-center ${tone_.box}`}>
      <div className="text-[11px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-1 text-lg font-bold tabular ${tone_.val}`}>
        {usdK(total)}
        <span className="text-xs font-medium text-ink-faint">/mo</span>
      </div>
      <div className="mt-0.5 text-[10.5px] font-semibold tabular text-ink-muted">{perUnit}</div>
      <div className="mt-1.5 text-[10.5px] leading-relaxed text-ink-faint">
        <span className={tone === "repriced" ? "text-status-red-fg" : "text-ink-muted"}>
          {COST.aiUsage} <b className="font-bold">{usdK(aiUsage)}</b>
        </span>
        <br />+ {COST.buildRun} <b className="font-bold text-ink-muted">{usdK(buildRun)}</b>
      </div>
    </div>
  );
}

/** "Buy the seat" comparison — public list prices, seat-shaped use cases only. */
function SeatComparison({ a, units }: { a: Archetype; units: number }) {
  const products = seatProductsFor(a.key);
  if (products.length === 0) return null;
  return (
    <div className="mt-4 rounded-tile border border-border bg-surface-muted p-3.5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <span className="text-[12px] font-semibold uppercase tracking-wide text-ink">{SEAT.title}</span>
        <span className="text-[10.5px] text-ink-faint">
          {SEAT.asOfPrefix} {asOfLabel(seatPricesAsOf)}
        </span>
      </div>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-ink-muted">{seatIntroSentence(a)}</p>
      <ul className="mt-2.5 space-y-1.5">
        {products.map((p) => (
          <li key={p.key} className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-[12.5px]">
            <span className="tabular text-ink">{seatProductLine(p, a, units)}</span>
            <span
              className={`rounded-chip px-1.5 py-0.5 text-[9.5px] font-semibold ${
                p.status === "reported"
                  ? "bg-status-amber-soft text-status-amber-fg"
                  : "bg-surface px-1.5 text-ink-faint"
              }`}
            >
              {seatStatusLabel(p.status)}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-snug text-ink-faint">
        {SEAT.segSub} — {usdUnit(Math.min(...products.map((p) => p.perSeatUsd)))}–
        {usdUnit(Math.max(...products.map((p) => p.perSeatUsd)))} a seat across these products.
      </p>
    </div>
  );
}

/**
 * The cost box — the same workload priced three ways, each split into AI usage
 * plus the constant build & run cost, so the mix (and what actually drives it)
 * is visible — now with per-unit economics on every column and, where a vendor
 * sells this as a seat product, the public seat price beside the build path.
 */
export function CostBox({
  a,
  band,
  units,
  countedValueBase,
}: {
  a: Archetype;
  band: CostBand;
  units: number;
  /** Counted (realisation-discounted) value — for the per-unit cost-vs-value line. */
  countedValueBase: number;
}) {
  return (
    <QCard num="$" title={COST.title}>
      <p className="text-[14.5px] leading-relaxed text-ink-muted">{COST.intro}</p>

      {/* Legend — spell out the two parts of every bar so the split reads clearly. */}
      <div className="mt-3 flex flex-col gap-1.5 text-[12px] text-ink-muted sm:flex-row sm:gap-5">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-accent" aria-hidden="true" />
          {COST.legendAi}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 rounded-[3px] bg-ink-faint/50" aria-hidden="true" />
          {COST.legendBuild}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <Segment
          tone="floor"
          label={COST.segFloor}
          total={band.floor}
          aiUsage={band.floorAiUsage}
          buildRun={band.buildAndRun}
          perUnit={perUnitTag(a, band.floor, units)}
        />
        <Segment
          tone="today"
          label={COST.segToday}
          total={band.today}
          aiUsage={band.todayAiUsage}
          buildRun={band.buildAndRun}
          perUnit={perUnitTag(a, band.today, units)}
        />
        <Segment
          tone="repriced"
          label={COST.segRepriced}
          total={band.repriced}
          aiUsage={band.repricedAiUsage}
          buildRun={band.buildAndRun}
          perUnit={perUnitTag(a, band.repriced, units)}
        />
      </div>

      <p className="mt-4 text-[13px] leading-relaxed text-ink-muted">
        The <b className="font-semibold text-ink">build &amp; run</b> cost is the same in all three (
        {usdK(band.buildAndRun)}/mo) — it&rsquo;s the <b className="font-semibold text-ink">AI usage</b> that
        moves. {spreadSentence(a, band, units)}
      </p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">{costMixSentence(band)}</p>
      {/* Unit economics — how this compares to a per-seat quote or loaded labour cost. */}
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">
        {unitEconSentence(a, band, countedValueBase, units)}
      </p>

      <SeatComparison a={a} units={units} />
    </QCard>
  );
}
