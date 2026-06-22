import { CtaButton } from "./CtaButton";

/**
 * Persistent footer carrying the fictional-company disclaimer (hard requirement,
 * BUILD_SPEC §3) and the CTA. `disclaimer` is sourced from the seed JSON's
 * `meta.disclaimer` so the wording has a single source of truth.
 */
export function Footer({ disclaimer }: { disclaimer: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface px-6 py-8 print:mt-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm font-medium text-ink">
            Illustrative demo — fictional company
          </p>
          <p className="text-sm leading-relaxed text-ink-muted">{disclaimer}</p>
          <p className="text-xs text-ink-faint">
            A concept prototype by Hepburn Advisory illustrating the Enterprise AI
            Ledger. Not the live product; no real customer data.
          </p>
        </div>
        <div className="shrink-0 print:hidden">
          <CtaButton />
        </div>
      </div>
    </footer>
  );
}
