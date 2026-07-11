import type { Archetype } from "@/lib/simulator/archetypes";
import { unitWord } from "@/lib/simulator/archetypes";
import { driverPoints, type ValueOverrides } from "@/lib/simulator/engine";
import type { ValueRange } from "@/lib/simulator/types";
import { QCard } from "./QCard";
import { RailWarning } from "./ConfigPanel";
import { NumberField } from "./NumberField";
import { Q4 } from "@/lib/simulator/labels";
import { haircutSentence, railWarning, typicalHint } from "@/lib/simulator/copy";
import { driverRail, rateRail } from "@/lib/simulator/data";
import { usdK, usdUnit, type Cur } from "@/lib/simulator/format";

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-tile border border-border bg-surface-muted p-3 text-center">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-1 text-[17px] font-bold tabular ${tone}`}>{value}</div>
    </div>
  );
}

/** One value-realism factor: a slider + numeric field + its evidence hint. */
function FactorSlider({
  id,
  label,
  hint,
  value,
  onChange,
}: {
  id: string;
  label: string;
  hint: string;
  value: number;
  onChange: (n: number) => void;
}) {
  return (
    <div>
      <label htmlFor={id} className="flex items-baseline justify-between gap-2 text-[12.5px] font-semibold text-ink">
        <span>{label}</span>
        <span className="tabular font-semibold text-accent-text">{value}%</span>
      </label>
      <div className="mt-1 flex items-center gap-3">
        <input
          id={id}
          type="range"
          min={10}
          max={100}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full accent-accent"
          aria-valuetext={`${value}%`}
        />
        <NumberField id={`${id}-num`} label={label} value={value} min={10} max={100} step={5} compact onChange={onChange} />
      </div>
      <p className="mt-0.5 text-[10.5px] leading-snug text-ink-faint">{hint}</p>
    </div>
  );
}

/**
 * Q4 — what is it worth. The buyer supplies all THREE points of the range —
 * low / likely / high are individually editable (A2 replaced the fixed
 * ×0.6/×1.4 spread) — and we still visibly refuse a single ROI number. The
 * realisation slider then discounts the entered value BEFORE the verdict — a
 * discount the tool applies against itself.
 */
export function Q4Value({
  a,
  overrides,
  onChange,
  value,
  counted,
  countedPct,
  adoption,
  realisation,
  reliability,
  onFactor,
  units,
  cur,
}: {
  a: Archetype;
  overrides: ValueOverrides;
  onChange: (key: keyof ValueOverrides, value: number) => void;
  value: ValueRange;
  counted: ValueRange;
  countedPct: number;
  adoption: number;
  realisation: number;
  reliability: number;
  onFactor: (key: "adoption" | "realisation" | "reliability", pct: number) => void;
  units: number;
  cur: Cur;
}) {
  const v = a.value;
  const points = driverPoints(a, overrides);
  const dRail = driverRail(a.key);
  return (
    <QCard num="4" title={Q4.title}>
      <p className="mb-3 text-[15px] leading-relaxed text-ink-muted">{Q4.intro}</p>

      {/* These inputs are the buyer's own to set — guide them to fill them in,
          don't label them "illustrative" (they're not a usage estimate). */}
      <p className="mb-2 inline-block rounded-chip bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-text">
        ✎ {Q4.inputGuide}
      </p>

      <fieldset className="rounded-tile border border-border p-3">
        <legend className="px-1 text-[11.5px] font-semibold text-ink-muted">{v.driverLabel}</legend>
        <div className="flex flex-wrap items-start gap-3">
          <NumberField
            id="val-driver-low"
            label={Q4.low}
            value={Math.round(points.low * 100) / 100}
            step={v.driverStep}
            min={0}
            onChange={(n) => onChange("lowDriver", n)}
          />
          <NumberField
            id="val-driver"
            label={Q4.likely}
            value={points.likely}
            step={v.driverStep}
            min={0}
            onChange={(n) => onChange("driver", n)}
          />
          <NumberField
            id="val-driver-high"
            label={Q4.high}
            value={Math.round(points.high * 100) / 100}
            step={v.driverStep}
            min={0}
            onChange={(n) => onChange("highDriver", n)}
          />
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-ink-faint">
          {Q4.rangeGuide}
          {dRail ? ` ${typicalHint(dRail)} (likely).` : ""}
        </p>
        <RailWarning text={dRail ? railWarning(points.likely, dRail) : null} />
      </fieldset>

      {v.kind === "hours" && (
        <div className="mt-3 max-w-[240px]">
          <NumberField
            id="val-rate"
            label={v.rateLabel}
            value={overrides.rate ?? v.rate}
            step={v.rateStep}
            min={0}
            onChange={(n) => onChange("rate", n)}
          />
          {rateRail(a.key) && (
            <p className="mt-1 text-[10.5px] text-ink-faint">{typicalHint(rateRail(a.key)!)}</p>
          )}
          <RailWarning text={rateRail(a.key) ? railWarning(overrides.rate ?? v.rate, rateRail(a.key)!) : null} />
        </div>
      )}

      <div className="mt-4 grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        <Stat label={Q4.low} value={`${usdK(value.low, cur)}/mo`} tone="text-status-amber-fg" />
        <Stat label={Q4.likely} value={`${usdK(value.base, cur)}/mo`} tone="text-ink" />
        <Stat label={Q4.high} value={`${usdK(value.high, cur)}/mo`} tone="text-status-green-fg" />
      </div>
      {/* Unit economics on the value side too — per-seat/-claim value travels; totals don't. */}
      <p className="mt-2 text-[11.5px] tabular text-ink-faint">
        ≈ {usdUnit(value.base / Math.max(units, 1), cur)} / {unitWord(a)} / mo entered
      </p>

      {/* The three value-realism factors — the discount we apply against ourselves,
          split into its real, independent parts (A/E). Each is a paired slider +
          numeric field (A6). The verdict counts the three multiplied. */}
      <div className="mt-4 rounded-tile border border-border bg-surface-muted p-3.5">
        <p className="text-[13px] font-semibold text-ink">{Q4.realismHeading}</p>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{Q4.realismIntro}</p>
        <div className="mt-3 space-y-3">
          <FactorSlider
            id="f-adoption"
            label={Q4.adoptionLabel}
            hint={Q4.adoptionHint}
            value={adoption}
            onChange={(n) => onFactor("adoption", n)}
          />
          <FactorSlider
            id="f-realisation"
            label={Q4.realisationLabel}
            hint={Q4.realisationHint}
            value={realisation}
            onChange={(n) => onFactor("realisation", n)}
          />
          <FactorSlider
            id="f-reliability"
            label={Q4.reliabilityLabel}
            hint={Q4.reliabilityHint}
            value={reliability}
            onChange={(n) => onFactor("reliability", n)}
          />
        </div>
        <p className="mt-3 border-t border-border pt-2.5 text-[13px] leading-relaxed text-ink">
          <b className="font-semibold">
            {Q4.countedLabel} ({Math.round(countedPct)}%):
          </b>{" "}
          {haircutSentence(value.base, counted.base, countedPct, cur)}
        </p>
      </div>
    </QCard>
  );
}
