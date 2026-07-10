"use client";

import { useState } from "react";
import { TOOLBAR } from "@/lib/simulator/labels";
import { track } from "@/lib/simulator/analytics";

/**
 * "Copy link to this case" + "Print board summary" — the two ways a configured
 * case leaves the browser (CTO review item 5: the funnel job is to travel).
 * The link is whatever is in the address bar — the page keeps it in sync.
 */
export function SimToolbar({ useCaseKey }: { useCaseKey: string }) {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.href);
    } catch {
      // Clipboard can be blocked (permissions, http) — fall back to the prompt.
      window.prompt("Copy this link:", window.location.href);
    }
    setCopied(true);
    track("sim_copy_link", { use_case: useCaseKey });
    window.setTimeout(() => setCopied(false), 2000);
  }

  function printSummary() {
    track("sim_print_summary", { use_case: useCaseKey });
    window.print();
  }

  const btn =
    "inline-flex min-h-[36px] items-center gap-1.5 rounded-control border border-border bg-surface px-3 py-1.5 text-[12.5px] font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink";

  return (
    <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Share this case">
      <button type="button" onClick={copyLink} className={btn} aria-live="polite">
        {copied ? TOOLBAR.copied : `⎘ ${TOOLBAR.copyLink}`}
      </button>
      <button type="button" onClick={printSummary} className={btn} title={TOOLBAR.printHint}>
        ⎙ {TOOLBAR.print}
      </button>
    </div>
  );
}
