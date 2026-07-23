"use client";

import type { ConfidenceLevel } from "@/lib/simulator/types";
import { TRIAGE } from "@/lib/simulator/labels";

/**
 * Per-input confidence self-tag (A3): lets the user mark each input as
 * "from a system" / "an estimate" / "a guess". Integrated with number inputs.
 */
export function ConfidenceToggle({
  value,
  onChange,
}: {
  value: ConfidenceLevel;
  onChange: (level: ConfidenceLevel) => void;
}) {
  const options: Array<{ level: ConfidenceLevel; label: string; title: string }> = [
    { level: "system", label: "System", title: TRIAGE.systemTag },
    { level: "estimate", label: "Estimate", title: TRIAGE.estimateTag },
    { level: "guess", label: "Guess", title: TRIAGE.guessTag },
  ];

  return (
    <div className="mt-2 flex gap-1">
      {options.map((opt) => (
        <button
          key={opt.level}
          type="button"
          onClick={() => onChange(opt.level)}
          title={opt.title}
          className={`rounded-chip px-2 py-1 text-[10px] font-semibold uppercase tracking-wide transition-colors ${
            value === opt.level
              ? "bg-accent text-white"
              : "border border-border bg-surface-muted text-ink-muted hover:bg-surface hover:text-ink"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
