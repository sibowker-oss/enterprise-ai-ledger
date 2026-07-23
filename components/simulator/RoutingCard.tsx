"use client";

import type { RoutingOutcome } from "@/lib/simulator/types";
import { ROUTING } from "@/lib/simulator/labels";

/**
 * Routing card — one of three options (Gate / Diagnostic / Not-yet) or
 * the neutral "all three options" view when qualifier is skipped.
 */
export function RoutingCard({
  outcome,
  reasoning,
  sensitivityNote,
  onCTAClick,
}: {
  outcome: RoutingOutcome;
  reasoning: string;
  sensitivityNote: string;
  onCTAClick: () => void;
}) {
  // Tone (color, icon) by outcome
  const tones = {
    gate: {
      box: "border-status-green-fg/40 bg-status-green-soft",
      label: "text-status-green-fg",
      icon: "🚪",
      color: "bg-status-green-fg",
    },
    diagnostic: {
      box: "border-status-amber-fg/40 bg-status-amber-soft",
      label: "text-status-amber-fg",
      icon: "📊",
      color: "bg-status-amber-fg",
    },
    "not-yet": {
      box: "border-border bg-surface-muted",
      label: "text-ink-muted",
      icon: "⏳",
      color: "bg-ink-faint",
    },
    neutral: {
      box: "border-border bg-surface-muted",
      label: "text-ink-muted",
      icon: "→",
      color: "bg-ink-faint",
    },
  };

  const tone = tones[outcome] || tones.neutral;

  // Content by outcome
  const content = {
    gate: {
      title: ROUTING.gateTitle,
      description: ROUTING.gateDescription,
      whatYouGet: ROUTING.gateWhatYouGet,
    },
    diagnostic: {
      title: ROUTING.diagnosticTitle,
      description: ROUTING.diagnosticDescription,
      whatYouGet: ROUTING.diagnosticWhatYouGet,
    },
    "not-yet": {
      title: ROUTING.notYetTitle,
      description: ROUTING.notYetDescription,
      whatYouGet: undefined,
    },
    neutral: {
      title: ROUTING.neutralTitle,
      description: ROUTING.neutralDescription,
      whatYouGet: undefined,
    },
  };

  const current = content[outcome] || content.neutral;

  return (
    <section className="mt-6">
      <p className="eyebrow mb-2 mt-2 text-xs font-semibold text-ink-faint">Stage 4 — The right next step</p>
      <div className={`rounded-card border p-5 sm:p-6 ${tone.box}`}>
        {/* Header */}
        <div className={`flex items-center gap-2 text-xs font-bold uppercase tracking-wide ${tone.label}`}>
          <span className="text-lg">{tone.icon}</span>
          {current.title}
        </div>

        {/* Description */}
        <p className="mt-3 text-[15px] leading-relaxed text-ink">{current.description}</p>

        {/* Why (the reasoning from the routing engine) */}
        <div className="mt-4 rounded-tile border border-border bg-surface-muted p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint mb-1">
            Why you're seeing this
          </p>
          <p className="text-[13.5px] leading-relaxed text-ink">{reasoning}</p>
        </div>

        {/* What you get (deliverable) */}
        {current.whatYouGet && (
          <div className="mt-4">
            <p className="text-[10.5px] font-semibold uppercase tracking-wide text-ink-faint mb-1.5">
              What you get
            </p>
            <p className="text-[13.5px] leading-relaxed text-ink">{current.whatYouGet}</p>
          </div>
        )}

        {/* Cost of skipping (the sensitivity note) */}
        <div className="mt-4 rounded-tile border border-status-amber-fg/30 bg-status-amber-soft/20 p-3">
          <p className="text-[10.5px] font-semibold uppercase tracking-wide text-status-amber-fg mb-1">
            {ROUTING.costOfSkipping}
          </p>
          <p className="text-[13px] leading-relaxed text-ink">{sensitivityNote}</p>
        </div>

        {/* CTA */}
        <button
          onClick={onCTAClick}
          className={`mt-4 w-full rounded-control px-4 py-3 font-semibold text-white transition-colors ${tone.color} hover:opacity-90`}
        >
          {ROUTING.ctaText}
        </button>
      </div>
    </section>
  );
}
