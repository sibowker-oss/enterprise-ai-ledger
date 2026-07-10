"use client";

import { useRef, useState } from "react";
import { TOOLBAR } from "@/lib/simulator/labels";
import { track } from "@/lib/simulator/analytics";
import { serializeState, type SimState } from "@/lib/simulator/urlState";
import { buildScenario, parseScenario, type ScenarioImport } from "@/lib/simulator/scenario";
import type { CaseSummary } from "@/lib/simulator/derive";
import type { BudgetLine } from "@/lib/simulator/budget";

/**
 * How a configured case leaves the browser: "Copy link" (URL — with the plain
 * note that the link contains the numbers you typed), "Save this case" (the
 * versioned scenario JSON — the future handoff record into the diagnostic),
 * "Open a saved case", and the print one-pager. The link is serialised from
 * LIVE state at click time — never read back from the address bar, which can
 * lag the debounced sync.
 */
export function SimToolbar({
  state,
  summary,
  line,
  onImport,
}: {
  state: SimState;
  summary: CaseSummary;
  line: BudgetLine;
  onImport: (result: ScenarioImport) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function liveUrl(): string {
    return `${window.location.origin}${window.location.pathname}?${serializeState(state)}`;
  }

  async function copyLink() {
    const url = liveUrl();
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      // Clipboard can be blocked (permissions, http) — fall back to the prompt.
      window.prompt("Copy this link:", url);
    }
    setCopied(true);
    track("sim_copy_link", { use_case: state.current.archetypeKey });
    window.setTimeout(() => setCopied(false), 2000);
  }

  function saveCase() {
    const scenario = buildScenario(state, summary, line, new Date().toISOString());
    const blob = new Blob([JSON.stringify(scenario, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `use-case-${state.current.archetypeKey}-${scenario.dataVersion}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    track("sim_save_case", { use_case: state.current.archetypeKey });
  }

  async function importCase(file: File) {
    const text = await file.text();
    const result = parseScenario(text);
    setImportError(result.ok ? null : result.error);
    if (result.ok) track("sim_import_case", { use_case: result.current.archetypeKey });
    onImport(result);
  }

  function printSummary() {
    track("sim_print_summary", { use_case: state.current.archetypeKey });
    window.print();
  }

  const btn =
    "inline-flex min-h-[44px] items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink";

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex flex-wrap items-center justify-end gap-2" role="group" aria-label="Share this case">
        <button type="button" onClick={copyLink} className={btn} aria-live="polite">
          {copied ? TOOLBAR.copied : `⎘ ${TOOLBAR.copyLink}`}
        </button>
        <button type="button" onClick={saveCase} className={btn} title={TOOLBAR.saveHint}>
          ⤓ {TOOLBAR.save}
        </button>
        <button type="button" onClick={() => fileRef.current?.click()} className={btn}>
          ⤒ {TOOLBAR.importLabel}
        </button>
        <button type="button" onClick={printSummary} className={btn} title={TOOLBAR.printHint}>
          ⎙ {TOOLBAR.print}
        </button>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          className="sr-only"
          aria-label={TOOLBAR.importLabel}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void importCase(f);
            e.target.value = "";
          }}
        />
      </div>
      <p className="text-[10.5px] text-ink-faint">{TOOLBAR.linkNote}</p>
      {importError && (
        <p role="alert" className="rounded-tile border border-status-red-fg/40 bg-status-red-soft px-2.5 py-1.5 text-[11.5px] text-status-red-fg">
          {importError}
        </p>
      )}
    </div>
  );
}
