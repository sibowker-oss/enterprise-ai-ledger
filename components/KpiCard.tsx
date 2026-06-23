import type { ReactNode } from "react";

/**
 * Metric tile (design system): 16px radius, coloured eyebrow label, large
 * tabular numeral, small meta. The Control Room headline strip is four of these
 * (BUILD_SPEC §5.1). Status colour is reserved for the warn/alert tiles whose
 * number is itself the warning.
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
  emphasis?: "neutral" | "warn" | "alert";
}) {
  const eyebrowColor =
    emphasis === "alert"
      ? "text-status-red-fg"
      : emphasis === "warn"
        ? "text-status-amber-fg"
        : "text-accent-text";
  const valueColor =
    emphasis === "alert"
      ? "text-status-red-fg"
      : emphasis === "warn"
        ? "text-status-amber-fg"
        : "text-ink";
  return (
    <div className="flex flex-col rounded-tile border border-border bg-surface p-6">
      <p className={`eyebrow text-[11px] font-semibold ${eyebrowColor}`}>{label}</p>
      <p className={`tabular mt-2.5 text-4xl font-semibold leading-none tracking-tight ${valueColor}`}>
        {value}
      </p>
      <p className="mt-3 text-[13px] leading-snug text-ink-faint">{context}</p>
    </div>
  );
}
