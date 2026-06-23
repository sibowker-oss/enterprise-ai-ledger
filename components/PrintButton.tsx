"use client";

/**
 * "Generate board pack" — opens the browser print dialog. The print stylesheet
 * (globals.css @media print) strips chrome to a one-page board artefact
 * (BUILD_SPEC §5.1 item 6). No server PDF needed.
 */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-2 rounded-control border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:border-border-strong hover:bg-surface-muted"
    >
      <svg aria-hidden="true" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M6 9V2h12v7" />
        <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
        <rect x="6" y="14" width="12" height="8" />
      </svg>
      Generate board pack
    </button>
  );
}
