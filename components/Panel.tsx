import type { ReactNode } from "react";

/** A framed content section with an optional title + subtitle + right slot. */
export function Panel({
  title,
  subtitle,
  right,
  children,
  className = "",
}: {
  title?: ReactNode;
  subtitle?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`rounded-card border border-border bg-surface p-5 sm:p-6 ${className}`}>
      {(title || right) && (
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            {title && <h2 className="text-base font-semibold text-ink">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-sm text-ink-faint">{subtitle}</p>}
          </div>
          {right && <div className="shrink-0">{right}</div>}
        </div>
      )}
      {children}
    </section>
  );
}
