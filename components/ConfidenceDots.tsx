import type { Confidence } from "@/lib/types";
import { confidenceMeta } from "@/lib/labels";

/**
 * Confidence shown as 4 filled/empty steps + a text label. The visual spine of
 * the Outcome Ledger (BUILD_SPEC §5.4) — the contrast between 4-step high and
 * 1-step low is the "you're flying blind on most of your spend" message.
 * Neutral ink fill (NOT semantic green/amber/red — confidence isn't RAG).
 */
export function ConfidenceDots({
  confidence,
  showLabel = true,
}: {
  confidence: Confidence;
  showLabel?: boolean;
}) {
  const { label, steps } = confidenceMeta[confidence];
  return (
    <span
      className="inline-flex items-center gap-2"
      title={`Outcome confidence: ${label}`}
      aria-label={`Outcome confidence: ${label}`}
    >
      <span aria-hidden="true" className="inline-flex items-center gap-1">
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={`h-2.5 w-2.5 rounded-full ${
              i < steps ? "bg-ink" : "bg-border-strong/50"
            }`}
          />
        ))}
      </span>
      {showLabel && <span className="text-sm text-ink-muted">{label}</span>}
    </span>
  );
}
