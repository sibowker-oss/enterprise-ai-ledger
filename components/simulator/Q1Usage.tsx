import type { Archetype } from "@/lib/simulator/archetypes";
import type { UsageBreakdown } from "@/lib/simulator/engine";
import { QCard } from "./QCard";
import { Q1 } from "@/lib/simulator/labels";
import { q1BandSentence, q1PerRequestSentence, q1SizingSentence } from "@/lib/simulator/copy";
import { asOfLabel, tokenCount } from "@/lib/simulator/format";
import { libraryAsOf } from "@/lib/simulator/data";

/**
 * Q1 — how much will you use. Sizes from business volume and shows a RANGE, not
 * a point (build brief): the honest lean→bloated usage band. The band IS the
 * tool's answer, so it's framed as our estimate — the "replace with your usage"
 * tag lives on the volume INPUT (in the config panel), not on this output.
 */
export function Q1Usage({ a, units, u }: { a: Archetype; units: number; u: UsageBreakdown }) {
  return (
    <QCard num="1" title={Q1.title}>
      {/* "You may mean the other one" signpost — IDE chat vs agentic coding differ
          by 50–100× in tokens, so a buyer must not cost the wrong product. */}
      {a.pairNote && (
        <p className="mb-3 rounded-tile border border-accent/30 bg-accent-soft px-3 py-2 text-[12.5px] leading-relaxed text-accent-text">
          {a.pairNote}
        </p>
      )}
      <p className="text-[15px] leading-relaxed text-ink-muted">{q1SizingSentence(a, units, u)}</p>

      {/* The usage band — this is the answer to the question, shown as a range. */}
      <div className="mt-4 rounded-tile border border-border bg-surface-muted p-4">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">
            {Q1.bandHeading}
          </span>
          <span className="rounded-chip bg-accent-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-accent-text">
            {Q1.estimateTag}
          </span>
        </div>
        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-xl font-bold tabular text-ink">
            {tokenCount(u.usageBandLow)} – {tokenCount(u.usageBandHigh)}
          </span>
          <span className="text-sm text-ink-faint">a month</span>
        </div>
        <p className="mt-2 text-[13.5px] leading-relaxed text-ink-faint">{q1BandSentence(u)}</p>
      </div>

      <p className="mt-4 text-[14.5px] leading-relaxed text-ink-muted">{q1PerRequestSentence(u)}</p>

      {/* Every rendered figure carries its as-of date (library rule #2). */}
      <p className="mt-3 text-[11px] text-ink-faint">Usage figures as of {asOfLabel(libraryAsOf)}.</p>
    </QCard>
  );
}
