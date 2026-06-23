import type { ReactNode } from "react";

/**
 * Consistent page header: eyebrow + title + lead, with optional right-aligned
 * controls and an optional "narrative" helper line (the on-screen guided story,
 * BUILD_SPEC §10).
 */
export function PageHeader({
  eyebrow,
  title,
  lead,
  narrative,
  actions,
}: {
  eyebrow?: string;
  title: string;
  lead?: ReactNode;
  narrative?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="border-b border-border bg-surface px-4 pb-6 pt-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            {eyebrow && (
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-accent">
                {eyebrow}
              </p>
            )}
            <h1 className="mt-1 text-2xl font-semibold text-ink sm:text-3xl">{title}</h1>
            {lead && <p className="mt-2 max-w-2xl text-ink-muted">{lead}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2 print:hidden">{actions}</div>}
        </div>
        {narrative && (
          <p className="mt-4 max-w-3xl rounded-card border border-border bg-surface-muted/60 px-4 py-3 text-sm leading-relaxed text-ink-muted print:hidden">
            {narrative}
          </p>
        )}
      </div>
    </header>
  );
}
