import { reviewDate } from "@/lib/format";
import { status } from "@/styles/tokens";

type Tier = 1 | 2 | 3;
type Confidence = "High" | "Med" | "Low";

const tierWord: Record<Tier, string> = { 1: "Sourced", 2: "Derived", 3: "Modeled" };

/** Freshness dot: green ≤30d, amber 31–90d, grey >90d (design-system rule). */
function freshness(asOf: string): { color: string; label: string } {
  const days = Math.max(0, Math.round((Date.parse("2026-06-23") - Date.parse(asOf)) / 86_400_000));
  if (days <= 30) return { color: status.green.solid, label: `${days}d ago` };
  if (days <= 90) return { color: status.amber.solid, label: `${days}d ago` };
  return { color: status.grey.solid, label: `${days}d ago` };
}

/**
 * Provenance tag for an AI Ledger data module (design-system hard rule #5:
 * every Ledger number carries tier + confidence; data modules carry a freshness
 * dot). Applied to the real TAIL benchmark modules — NOT to the illustrative
 * Meridian figures, which are labelled as illustrative instead.
 */
export function ProvenancePill({
  tier,
  confidence,
  asOf,
  source = "The AI Ledger",
}: {
  tier: Tier;
  confidence: Confidence;
  asOf: string;
  source?: string;
}) {
  const fresh = freshness(asOf);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 gap-y-0.5 rounded-chip border border-border bg-surface-muted px-2.5 py-1 text-[11px] text-ink-muted">
      <span
        aria-hidden="true"
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ backgroundColor: fresh.color }}
        title={`Freshness: ${fresh.label}`}
      />
      <span className="font-medium text-ink">{source}</span>
      <span className="text-ink-faint">·</span>
      <span>Tier {tier} {tierWord[tier]}</span>
      <span className="text-ink-faint">·</span>
      <span>{confidence} confidence</span>
      <span className="text-ink-faint">·</span>
      <span>as of {reviewDate(asOf)}</span>
    </span>
  );
}
