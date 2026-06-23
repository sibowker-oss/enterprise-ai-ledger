import Link from "next/link";
import type { Decision, UseCase } from "@/lib/types";
import { decisionMeta, type Tone } from "@/lib/labels";
import { aud, audCompact, pct } from "@/lib/format";
import { DECISIONS, netValue } from "@/lib/portfolio";

const headerTone: Record<Tone, string> = {
  green: "border-t-status-green-solid",
  amber: "border-t-status-amber-solid",
  red: "border-t-status-red-solid",
  grey: "border-t-status-grey-solid",
};

const verb: Record<Decision, string> = {
  scale: "Defensible — economics support a larger rollout",
  fix: "Promising — but readiness, data or controls are weak",
  stop: "Vendor story beats the operating case",
};

/**
 * Scale / Fix / Stop three-column band — the punchline of the whole product
 * (BUILD_SPEC §5.1 item 2). Count + A$ + the use cases in each column, each
 * linking into the Register. Built to be visually dominant.
 */
export function DecisionBand({ useCases }: { useCases: UseCase[] }) {
  const total = useCases.reduce((s, uc) => s + uc.cost.totalAnnual, 0);

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {DECISIONS.map((decision) => {
        const items = useCases
          .filter((uc) => uc.decision === decision)
          .sort((a, b) => b.cost.totalAnnual - a.cost.totalAnnual);
        const spend = items.reduce((s, uc) => s + uc.cost.totalAnnual, 0);
        const net = items.reduce((s, uc) => s + netValue(uc), 0);
        const m = decisionMeta[decision];
        return (
          <section
            key={decision}
            className={`min-w-0 rounded-card border border-border border-t-4 bg-surface p-5 ${headerTone[m.tone]}`}
            aria-label={`${m.label} — ${items.length} use cases, ${aud(spend)}`}
          >
            <div className="flex items-baseline justify-between">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-ink">
                <span aria-hidden="true">{m.glyph}</span>
                {m.label}
              </h3>
              <span className="tabular text-sm text-ink-faint">
                {items.length} · {pct(spend, total)}
              </span>
            </div>
            <p className="tabular mt-1 text-2xl font-semibold text-ink">{audCompact(spend)}</p>
            <p className="tabular mt-1 text-sm font-medium">
              <span className={net >= 0 ? "text-status-green-fg" : "text-status-red-fg"}>
                {net >= 0 ? "+" : "−"}
                {audCompact(Math.abs(net))} net value
              </span>
            </p>
            <p className="mt-1 text-xs leading-snug text-ink-faint">{verb[decision]}</p>
            <ul className="mt-4 space-y-1.5 border-t border-border pt-3">
              {items.map((uc) => (
                <li key={uc.id}>
                  <Link
                    href={`/register/${uc.id}`}
                    className="group flex items-baseline justify-between gap-3 py-1 text-sm hover:text-accent"
                  >
                    <span className="min-w-0 truncate text-ink group-hover:text-accent group-hover:underline">
                      {uc.name}
                    </span>
                    <span className="tabular shrink-0 text-ink-muted">{aud(uc.cost.totalAnnual)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
