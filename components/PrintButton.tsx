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
      className="inline-flex items-center gap-1.5 rounded-control border border-border bg-surface px-3.5 py-2 text-sm font-medium text-ink hover:border-border-strong hover:bg-surface-muted"
    >
      <span aria-hidden="true">⎙</span>
      Generate board pack
    </button>
  );
}
