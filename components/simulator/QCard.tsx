import type { ReactNode } from "react";

/**
 * One question card in the five-question walk: a numbered badge, a title, an
 * optional right-hand slot (the Q2 provenance chip), and the body. `accent`
 * gives Q2 its dominant left border.
 */
export function QCard({
  num,
  title,
  right,
  accent = false,
  children,
}: {
  num: string;
  title: string;
  right?: ReactNode;
  accent?: boolean;
  children: ReactNode;
}) {
  return (
    <section
      className={`rounded-card border border-border bg-surface p-5 sm:p-6 ${
        accent ? "border-l-2 border-l-accent" : ""
      }`}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <span
          aria-hidden="true"
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded-chip bg-accent text-xs font-bold text-white"
        >
          {num}
        </span>
        <h2 className="text-lg font-semibold tracking-tight text-ink">{title}</h2>
        {right && <div className="ml-auto shrink-0">{right}</div>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}
