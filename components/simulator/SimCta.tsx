"use client";

import { CTA, SIM_CTA_HREF } from "@/lib/simulator/labels";
import { track } from "@/lib/simulator/analytics";
import type { VerdictClass } from "@/lib/simulator/types";

/** The single call-to-action — the one next step, into the Hepburn contact/diagnostic. */
export function SimCta({
  useCaseKey,
  verdictKlass,
}: {
  useCaseKey: string;
  verdictKlass: VerdictClass;
}) {
  return (
    <div className="rounded-card border border-border bg-nav-bg p-6 sm:p-7">
      <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="max-w-2xl">
          <p className="text-[15px] leading-relaxed text-ink">{CTA.body}</p>
          <p className="mt-3 border-l-2 border-accent/50 pl-3 text-[12.5px] leading-relaxed text-ink-faint">
            {CTA.gated}
          </p>
        </div>
        <a
          href={SIM_CTA_HREF}
          target="_blank"
          rel="noopener noreferrer"
          onClick={() => track("sim_cta_click", { use_case: useCaseKey, verdict: verdictKlass })}
          className="inline-flex min-h-[44px] shrink-0 items-center justify-center rounded-control bg-accent px-5 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {CTA.button}
        </a>
      </div>
    </div>
  );
}
