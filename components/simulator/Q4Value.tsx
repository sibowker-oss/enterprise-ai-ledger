import type { Archetype } from "@/lib/simulator/archetypes";
import { unitWord } from "@/lib/simulator/archetypes";
import type { ValueOverrides } from "@/lib/simulator/engine";
import type { ValueRange } from "@/lib/simulator/types";
import { QCard } from "./QCard";
import { RailWarning } from "./ConfigPanel";
import { Q4 } from "@/lib/simulator/labels";
import { haircutSentence, railWarning, typicalHint } from "@/lib/simulator/copy";
import { driverRail, rateRail, type InputRail } from "@/lib/simulator/data";
import { usdK, usdUnit } from "@/lib/simulator/format";

function ValueInput({
  id,
  label,
  value,
  step,
  rail,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step: number;
  rail: InputRail | null;
  onChange: (v: number) => void;
}) {
  return (
    <div className="min-w-[130px] flex-1">
      <label htmlFor={id} className="mb-1.5 block text-[11.5px] font-semibold text-ink-muted">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={0}
        step={step}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full rounded-control border border-border bg-surface-muted px-2.5 py-1.5 text-[13.5px] text-ink tabular"
      />
      {rail && <p className="mt-1 text-[10.5px] text-ink-faint">{typicalHint(rail)}</p>}
      {rail && <RailWarning text={railWarning(value, rail)} />}
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-tile border border-border bg-surface-muted p-3 text-center">
      <div className="text-[10.5px] uppercase tracking-wide text-ink-faint">{label}</div>
      <div className={`mt-1 text-[17px] font-bold tabular ${tone}`}>{value}</div>
    </div>
  );
}

/**
 * Q4 — what is it worth. The buyer supplies the driver; we structure it as a
 * Low/Likely/High range and visibly refuse to emit a single ROI number (D4).
 * The realisation slider then discounts the entered value BEFORE the verdict —
 * a haircut the tool applies against itself (CTO review item 3).
 */
export function Q4Value({
  a,
  overrides,
  onChange,
  value,
  counted,
  haircut,
  onHaircut,
  units,
}: {
  a: Archetype;
  overrides: ValueOverrides;
  onChange: (key: "driver" | "rate", value: number) => void;
  value: ValueRange;
  counted: ValueRange;
  haircut: number;
  onHaircut: (pct: number) => void;
  units: number;
}) {
  const v = a.value;
  return (
    <QCard num="4" title={Q4.title}>
      <p className="mb-3 text-[15px] leading-relaxed text-ink-muted">{Q4.intro}</p>

      {/* These inputs are the buyer's own to set — guide them to fill them in,
          don't label them "illustrative" (they're not a usage estimate). */}
      <p className="mb-2 inline-block rounded-chip bg-accent-soft px-2.5 py-1 text-[11px] font-semibold text-accent-text">
        ✎ {Q4.inputGuide}
      </p>
      <div className="flex flex-wrap items-start gap-3">
        <ValueInput
          id="val-driver"
          label={v.driverLabel}
          value={overrides.driver ?? v.driver}
          step={v.driverStep}
          rail={driverRail(a.key)}
          onChange={(n) => onChange("driver", n)}
        />
        {v.kind === "hours" && (
          <ValueInput
            id="val-rate"
            label={v.rateLabel}
            value={overrides.rate ?? v.rate}
            step={v.rateStep}
            rail={rateRail(a.key)}
            onChange={(n) => onChange("rate", n)}
          />
        )}
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2.5">
        <Stat label={Q4.low} value={`${usdK(value.low)}/mo`} tone="text-status-amber-fg" />
        <Stat label={Q4.likely} value={`${usdK(value.base)}/mo`} tone="text-ink" />
        <Stat label={Q4.high} value={`${usdK(value.high)}/mo`} tone="text-status-green-fg" />
      </div>
      {/* Unit economics on the value side too — per-seat/-claim value travels; totals don't. */}
      <p className="mt-2 text-[11.5px] tabular text-ink-faint">
        ≈ {usdUnit(value.base / Math.max(units, 1))} / {unitWord(a)} / mo entered
      </p>

      {/* The realisation slider — the discount we apply against ourselves. */}
      <div className="mt-4 rounded-tile border border-border bg-surface-muted p-3.5">
        <label htmlFor="val-haircut" className="block text-[13px] font-semibold text-ink">
          {Q4.haircutLabel}{" "}
          <span className="tabular font-semibold text-accent-text">({haircut}%)</span>
        </label>
        <input
          id="val-haircut"
          type="range"
          min={10}
          max={100}
          step={5}
          value={haircut}
          onChange={(e) => onHaircut(Number(e.target.value))}
          className="mt-1.5 w-full accent-accent"
          aria-valuetext={`${haircut}% of the entered value is counted`}
        />
        <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{Q4.haircutHint}</p>
        <p className="mt-2 text-[13px] leading-relaxed text-ink">
          <b className="font-semibold">{Q4.countedLabel}:</b>{" "}
          {haircutSentence(value.base, counted.base, haircut)}
        </p>
      </div>
    </QCard>
  );
}
