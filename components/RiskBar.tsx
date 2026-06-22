import type { RAG } from "@/lib/types";
import { ragMeta } from "@/lib/labels";
import { status } from "@/styles/tokens";
import { aud, pct } from "@/lib/format";

const ORDER: RAG[] = ["green", "amber", "red"];
const solid: Record<RAG, string> = {
  green: status.green.solid,
  amber: status.amber.solid,
  red: status.red.solid,
};

/**
 * Risk concentration — a single stacked RAG bar by A$ with a labelled legend
 * (BUILD_SPEC §5.1 item 4). Each segment is labelled with value + share; the
 * red segment is the headline ("A$726K carries unmanaged risk").
 */
export function RiskBar({
  data,
  total,
}: {
  data: Record<RAG, number>;
  total: number;
}) {
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full" role="img" aria-label="Spend by risk rating">
        {ORDER.map((rag) => (
          <div
            key={rag}
            className="h-full"
            style={{ width: `${(data[rag] / total) * 100}%`, backgroundColor: solid[rag] }}
            title={`${ragMeta[rag].label}: ${aud(data[rag])} (${pct(data[rag], total)})`}
          />
        ))}
      </div>
      <ul className="mt-3 flex flex-wrap gap-x-6 gap-y-2">
        {ORDER.map((rag) => (
          <li key={rag} className="flex items-center gap-2 text-sm">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: solid[rag] }}
            />
            <span className="text-ink-muted">{ragMeta[rag].label}</span>
            <span className="tabular font-medium text-ink">{aud(data[rag])}</span>
            <span className="tabular text-ink-faint">{pct(data[rag], total)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
