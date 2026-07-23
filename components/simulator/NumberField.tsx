"use client";

import { useEffect, useState } from "react";
import type { ConfidenceLevel } from "@/lib/simulator/types";
import { ConfidenceToggle } from "./ConfidenceToggle";

/**
 * A number input with INLINE validation instead of silent clamping (A6): the
 * buyer sees why an entry doesn't apply, the engine never receives garbage,
 * and the field can be cleared and retyped freely. The last valid value keeps
 * driving the numbers until a new valid one lands.
 */
export function NumberField({
  id,
  label,
  value,
  step = 1,
  min,
  max,
  hint,
  compact = false,
  confidenceLevel,
  onConfidenceChange,
  onChange,
}: {
  id: string;
  label: string;
  value: number;
  step?: number;
  /** Hard bounds — outside them the entry shows an error and is not applied. */
  min?: number;
  max?: number;
  hint?: string;
  /** Small inline variant (paired with sliders / in the ramp row). */
  compact?: boolean;
  confidenceLevel?: ConfidenceLevel;
  onConfidenceChange?: (level: ConfidenceLevel) => void;
  onChange: (v: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [error, setError] = useState<string | null>(null);

  // Follow external changes (use-case switch, slider pairing, import).
  useEffect(() => {
    setText((prev) => (Number(prev) === value ? prev : String(value)));
    setError(null);
  }, [value]);

  function handle(raw: string) {
    setText(raw);
    if (raw.trim() === "") {
      setError("Enter a number.");
      return;
    }
    const n = Number(raw);
    if (!Number.isFinite(n)) {
      setError("That's not a number.");
      return;
    }
    if (min != null && n < min) {
      setError(`Needs to be at least ${min}.`);
      return;
    }
    if (max != null && n > max) {
      setError(`Needs to be ${max} or less.`);
      return;
    }
    setError(null);
    onChange(n);
  }

  return (
    <div className={compact ? "inline-flex flex-col" : "min-w-[130px] flex-1"}>
      <label
        htmlFor={id}
        className={
          compact
            ? "sr-only"
            : "mb-1.5 block text-[11.5px] font-semibold text-ink-muted"
        }
      >
        {label}
      </label>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        step={step}
        min={min}
        max={max}
        value={text}
        aria-invalid={error != null}
        aria-describedby={error ? `${id}-error` : undefined}
        onChange={(e) => handle(e.target.value)}
        className={`rounded-control border bg-surface-muted text-ink tabular ${
          error ? "border-status-red-fg/60" : "border-border"
        } ${compact ? "min-h-[44px] w-24 px-2 py-1.5 text-[13px]" : "min-h-[44px] w-full px-2.5 py-1.5 text-[13.5px]"}`}
      />
      {hint && !error && <p className="mt-1 text-[10.5px] text-ink-faint">{hint}</p>}
      {error && (
        <p id={`${id}-error`} role="alert" className="mt-1 text-[11px] font-medium text-status-red-fg">
          {error}
        </p>
      )}
      {confidenceLevel && onConfidenceChange && (
        <ConfidenceToggle value={confidenceLevel} onChange={onConfidenceChange} />
      )}
    </div>
  );
}
