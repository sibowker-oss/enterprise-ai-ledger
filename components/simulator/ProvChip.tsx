import type { ForwardSignal } from "@/lib/simulator/types";
import { tierLabel } from "@/lib/simulator/copy";
import { AiLedgerLink } from "./AiLedgerLink";

/**
 * The provenance chip on the Q2 forward-pricing panel. Colour + label state
 * where each figure comes from: audited accounts (green), our estimate
 * (accent), or example only / not tracked (grey). Text carries the meaning too
 * — never colour alone. When the figures are from The AI Ledger, the chip is a
 * link through to the Ledger, with its mark.
 */
export function ProvChip({ signal }: { signal: ForwardSignal }) {
  const base = "inline-flex items-center gap-1 rounded-chip px-2.5 py-1 text-[11px] font-semibold";

  if (!signal.tracked) {
    return <span className={`${base} bg-surface-muted text-ink-faint`}>Example only — not tracked</span>;
  }

  const style =
    signal.tier === "audited" ? "bg-status-green-soft text-status-green-fg" : "bg-accent-soft text-accent-text";
  return (
    <AiLedgerLink className={`${base} ${style} hover:brightness-110`}>
      The AI Ledger · {tierLabel(signal.tier)}
      <span aria-hidden="true">↗</span>
    </AiLedgerLink>
  );
}
