import type { Decision, RAG } from "@/lib/types";
import { decisionMeta, ragMeta, type Tone } from "@/lib/labels";

const toneClasses: Record<Tone, string> = {
  green: "bg-status-green-soft text-status-green-fg ring-status-green-fg/20",
  amber: "bg-status-amber-soft text-status-amber-fg ring-status-amber-fg/20",
  red: "bg-status-red-soft text-status-red-fg ring-status-red-fg/20",
  grey: "bg-status-grey-soft text-status-grey-fg ring-status-grey-fg/20",
};

const sizeClasses = {
  sm: "px-2 py-0.5 text-xs",
  md: "px-2.5 py-1 text-sm",
};

/**
 * Status chip — the single primitive for RAG risk and scale/fix/stop decision.
 * Always carries a text label and a distinct glyph as well as colour, so it is
 * legible without colour (BUILD_SPEC §7). `title`/`aria-label` carry the long
 * meaning for screen readers and tooltips.
 */
export function StatusChip({
  tone,
  label,
  glyph,
  title,
  size = "md",
}: {
  tone: Tone;
  label: string;
  glyph?: string;
  title?: string;
  size?: keyof typeof sizeClasses;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-chip font-medium ring-1 ring-inset ${toneClasses[tone]} ${sizeClasses[size]}`}
      title={title}
      aria-label={title ?? label}
    >
      {glyph && (
        <span aria-hidden="true" className="text-[0.85em] leading-none">
          {glyph}
        </span>
      )}
      {label}
    </span>
  );
}

export function DecisionChip({
  decision,
  size = "md",
  title,
}: {
  decision: Decision;
  size?: keyof typeof sizeClasses;
  title?: string;
}) {
  const m = decisionMeta[decision];
  return (
    <StatusChip
      tone={m.tone}
      label={m.label}
      glyph={m.glyph}
      size={size}
      title={title ?? `Decision: ${m.label}`}
    />
  );
}

export function RagChip({
  rag,
  size = "md",
  title,
}: {
  rag: RAG;
  size?: keyof typeof sizeClasses;
  title?: string;
}) {
  const m = ragMeta[rag];
  return (
    <StatusChip
      tone={m.tone}
      label={m.label}
      glyph={m.glyph}
      size={size}
      title={title ?? `Risk: ${m.label}`}
    />
  );
}
