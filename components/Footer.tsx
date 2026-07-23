import { CtaButton } from "./CtaButton";

/**
 * Persistent footer carrying the disclaimer and CTA. `disclaimer` is sourced from
 * the seed JSON's `meta.disclaimer` so the wording has a single source of truth.
 */
export function Footer({ disclaimer }: { disclaimer: string }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface px-4 py-8 sm:px-6 print:mt-8">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="max-w-2xl space-y-2">
          <p className="text-sm leading-relaxed text-ink-muted">{disclaimer}</p>
          <p className="text-sm leading-relaxed text-ink-muted">
            Meridian Financial Group's view is benchmarked against
            <strong className="font-medium text-ink"> The AI Ledger</strong> — Hepburn&rsquo;s
            proprietary market model of AI economics. The cost-to-outcome control is standard
            consulting; the market benchmarking and forward cost view are not — they need the Ledger.
          </p>
        </div>
        <div className="shrink-0 print:hidden">
          <CtaButton />
        </div>
      </div>
    </footer>
  );
}
