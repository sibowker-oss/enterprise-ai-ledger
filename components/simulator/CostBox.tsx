import type { CostBand } from "@/lib/simulator/types";
import type { Archetype } from "@/lib/simulator/archetypes";
import { QCard } from "./QCard";
import { CAPABILITY, COST, SEAT } from "@/lib/simulator/labels";
import {
  costMixSentence,
  floorModelSentence,
  perUnitTag,
  seatIntroSentence,
  seatProductLine,
  seatStatusLabel,
  spreadSentence,
  subscriptionReconcileSentence,
  unitEconSentence,
} from "@/lib/simulator/copy";
import { seatPricesAsOf, seatProductsFor } from "@/lib/simulator/data";
import { asOfLabel, usdK, usdUnit, type Cur } from "@/lib/simulator/format";

type Tone = "floor" | "today" | "repriced";

function Segment({
  tone,
  label,
  total,
  aiUsage,
  monthlyFixed,
  perUseRun,
  perUnit,
  cur,
}: {
  tone: Tone;
  label: string;
  total: number;
  aiUsage: number;
  monthlyFixed: number;
  perUseRun: number;
  /** Per-unit tag, e.g. "$52 / developer / mo" — unit economics travel, totals don't. */
  perUnit: string;
  cur: Cur;
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
        {usdK(total, cur)}
        <span className="text-xs font-medium text-ink-faint">/mo</span>
      </div>
      <div className="mt-0.5 text-[10.5px] font-semibold tabular text-ink-muted">{perUnit}</div>
      {/* The three plain buckets, reconciling to the total (update v2, 0.3). */}
      <div className="mt-1.5 text-[10.5px] leading-relaxed text-ink-faint">
        <span className={tone === "repriced" ? "text-status-red-fg" : "text-ink-muted"}>
          {COST.aiUsage} <b className="font-bold">{usdK(aiUsage, cur)}</b>
        </span>
        {perUseRun > 0 && (
          <>
            {" "}+ {COST.bucketPerUse} <b className="font-bold text-ink-muted">{usdK(perUseRun, cur)}</b>
          </>
        )}
        <br />+ {COST.bucketFixed} <b className="font-bold text-ink-muted">{usdK(monthlyFixed, cur)}</b>
      </div>
    </div>
  );
}

/** "Buy the seat" comparison — public list prices, seat-shaped use cases only. */
function SeatComparison({ a, units }: { a: Archetype; units: number }) {
  const products = seatProductsFor(a.key);
  if (products.length === 0) return null;
  // The headline range uses PUBLISHED prices only; reported figures appear in
  // the itemised rows with their flag, never folded into a "list price" range.
  const published = products.filter((p) => p.status !== "reported");
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
      {published.length > 0 && (
        <p className="mt-2 text-[11px] leading-snug text-ink-faint">
          {SEAT.segSub} — {usdUnit(Math.min(...published.map((p) => p.perSeatUsd)))}–
          {usdUnit(Math.max(...published.map((p) => p.perSeatUsd)))} a seat across the published prices.
        </p>
      )}
      {/* Subsidy warning (Fix 3): a seat price is a loss-leader too — don't read
          it as a stable cheap option any more than the API price. */}
      <p className="mt-2 rounded-tile bg-status-amber-soft px-2.5 py-1.5 text-[11px] leading-snug text-status-amber-fg">
        {SEAT.subsidyWarning}
      </p>
    </div>
  );
}

/**
 * The cost box — the same workload priced three ways, each reconciling to the
 * three plain buckets (AI usage + per-use + monthly fixed), with per-unit
 * economics on every column, the "cheapest you'd consider" floor (A4), and
 * the public seat-price comparison where a vendor sells this as a seat.
 */
export function CostBox({
  a,
  band,
  units,
  countedValueBase,
  cur,
}: {
  a: Archetype;
  band: CostBand;
  units: number;
  /** Counted (realisation-discounted) value — for the per-unit cost-vs-value line. */
  countedValueBase: number;
  cur: Cur;
}) {
  return (
    <QCard num="$" title={COST.title}>
      <p className="text-[14.5px] leading-relaxed text-ink-muted">{COST.intro}</p>

      {/* Legend — spell out the parts of every bar so the split reads clearly. */}
      <div className="mt-3 flex flex-col gap-1.5 text-[12px] text-ink-muted sm:flex-row sm:gap-5">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-accent" aria-hidden="true" />
          {COST.legendAi}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-2.5 shrink-0 rounded-[3px] bg-ink-faint/50" aria-hidden="true" />
          {COST.legendBuild}
        </span>
      </div>

      <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
        <Segment
          tone="floor"
          label={COST.segFloor}
          total={band.floor}
          aiUsage={band.floorAiUsage}
          monthlyFixed={band.monthlyFixed}
          perUseRun={band.perUseRun}
          perUnit={perUnitTag(a, band.floor, units, cur)}
          cur={cur}
        />
        <Segment
          tone="today"
          label={COST.segToday}
          total={band.today}
          aiUsage={band.todayAiUsage}
          monthlyFixed={band.monthlyFixed}
          perUseRun={band.perUseRun}
          perUnit={perUnitTag(a, band.today, units, cur)}
          cur={cur}
        />
        <Segment
          tone="repriced"
          label={COST.segRepriced}
          total={band.repriced}
          aiUsage={band.repricedAiUsage}
          monthlyFixed={band.monthlyFixed}
          perUseRun={band.perUseRun}
          perUnit={perUnitTag(a, band.repriced, units, cur)}
          cur={cur}
        />
      </div>

      {/* Which model the floor came from — or the honest empty state (A4). */}
      <p className="mt-2 text-[11.5px] leading-snug text-ink-faint">
        {floorModelSentence(band.floorModelKey)} {COST.floorHint}
      </p>
      {/* Capability caveat (Fix 4): "cheapest" ranks on price, not on whether the
          cheaper model can actually do the job — frontier is increasingly API-only. */}
      {band.floorModelKey && (
        <p className="mt-1.5 rounded-tile bg-status-amber-soft px-2.5 py-1.5 text-[11px] leading-snug text-status-amber-fg">
          {CAPABILITY.floorCaveat}
        </p>
      )}

      <p className="mt-3 text-[13px] leading-relaxed text-ink-muted">
        The <b className="font-semibold text-ink">{COST.bucketFixed}</b> floor is the same in all three (
        {usdK(band.monthlyFixed, cur)}/mo) — it&rsquo;s the{" "}
        <b className="font-semibold text-ink">{COST.aiUsage}</b> that moves.{" "}
        {spreadSentence(a, band, units, cur)}
      </p>
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">{costMixSentence(band)}</p>
      {/* Unit economics — how this compares to a per-seat quote or loaded labour cost. */}
      <p className="mt-2.5 text-[13px] leading-relaxed text-ink-muted">
        {unitEconSentence(a, band, countedValueBase, units, cur)}
      </p>

      {/* Subscription reality check — reconciles the metered-API estimate to what a
          real seat/subscription costs (Fix 3: makes the subsidy tangible). */}
      {subscriptionReconcileSentence(a, band, units, cur) && (
        <p className="mt-2.5 rounded-tile border border-border bg-surface-muted px-3 py-2 text-[13px] leading-relaxed text-ink">
          {subscriptionReconcileSentence(a, band, units, cur)}
        </p>
      )}

      <SeatComparison a={a} units={units} />
    </QCard>
  );
}
