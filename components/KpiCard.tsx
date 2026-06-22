import type { ReactNode } from "react";

/**
 * KPI card — one big tabular number + one line of context. The Control Room
 * headline strip is built from four of these (BUILD_SPEC §5.1).
 */
export function KpiCard({
  label,
  value,
  context,
  emphasis = "neutral",
}: {
  label: string;
  value: ReactNode;
  context: ReactNode;
  /** A restrained accent on the value for the one or two "watch this" cards. */
  emphasis?: "neutral" | "warn" | "alert";
}) {
  const valueColor =
    emphasis === "alert"
      ? "text-status-red-fg"
      : emphasis === "warn"
        ? "text-status-amber-fg"
        : "text-ink";
  return (
    <div className="flex flex-col rounded-card border border-border bg-surface p-5">
      <p className="text-sm text-ink-muted">{label}</p>
      <p className={`tabular mt-2 text-3xl font-semibold leading-none ${valueColor}`}>
        {value}
      </p>
      <p className="mt-3 text-sm leading-snug text-ink-faint">{context}</p>
    </div>
  );
}
