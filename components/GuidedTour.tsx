"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { audCompact } from "@/lib/format";
import { CtaButton } from "./CtaButton";

export interface TourFigures {
  total: number;
  reclaimable: number;
  evidenceBackedCost: number;
  evidenceBackedBenefit: number;
  evidenceBackedRoi: number;
  banked: number;
  bankedConversion: number;
  tokens: number;
}

/**
 * "Take the tour" — an optional, dismissible guided narrative (BUILD_SPEC §10),
 * so the prototype presents itself to a colleague or prospective client. Purely
 * additive: a button + modal; the default experience is unchanged. Numbers come
 * from the selectors (passed in), never hardcoded.
 */
export function GuidedTour({ figures: f }: { figures: TourFigures }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const steps: { title: string; body: React.ReactNode; link?: { href: string; label: string } }[] = [
    {
      title: "Nobody owns the economics",
      body: (
        <>
          Meridian runs <strong>{audCompact(f.total)}</strong> of AI spend across 10 use cases and 7
          business units — with no single owner of the cost-to-outcome picture. Start with the four
          cards at the top of this page.
        </>
      ),
    },
    {
      title: "Scale, fix or stop",
      body: (
        <>
          Half the spend is defensible (scale), a third needs fixing, and{" "}
          <strong>{audCompact(f.reclaimable)}</strong> should probably stop. The Scale / Fix / Stop
          band on this page is the punchline — and it now carries net value per column.
        </>
      ),
    },
    {
      title: "The return — not the operational metric",
      body: (
        <>
          A CFO buys on return. The <strong>{audCompact(f.evidenceBackedCost)}</strong> of
          evidence-backed AI returns <strong>{audCompact(f.evidenceBackedBenefit)}</strong> —{" "}
          <strong>{f.evidenceBackedRoi}% ROI</strong>. The unproven rest is underwater.
        </>
      ),
      link: { href: "/outcome", label: "Open the Outcome Ledger" },
    },
    {
      title: "Theoretical value vs what's actually banked",
      body: (
        <>
          The honest part: of all that theoretical value, only{" "}
          <strong>{audCompact(f.banked)}</strong> ({f.bankedConversion}%) has actually hit the P&amp;L.
          The rest is freed capacity, not cash. <em>Banking the gap is the engagement.</em>
        </>
      ),
      link: { href: "/outcome", label: "See theoretical vs banked" },
    },
    {
      title: "The hidden cost, benchmarked against The AI Ledger",
      body: (
        <>
          The hidden cost isn&rsquo;t licences — tokens are <strong>{audCompact(f.tokens)}</strong>.
          And benchmarked against The AI Ledger&rsquo;s market data, today&rsquo;s prices are subsidised:
          the stress test shows Meridian&rsquo;s forward exposure as that unwinds. Only Hepburn can show this.
        </>
      ),
      link: { href: "/cost", label: "Open the Cost Ledger" },
    },
    {
      title: "The board conversation, today",
      body: (
        <>
          UC-09 Collections Outreach: <strong>red risk</strong>, low evidence, unproven benefit, and
          conduct exposure on automated hardship outreach. That&rsquo;s a board conversation now.
        </>
      ),
      link: { href: "/register/UC-09", label: "Open UC-09" },
    },
    {
      title: "Your estate, powered by The AI Ledger",
      body: (
        <>
          This is a fictional template. The cost-to-outcome control is standard consulting; the market
          benchmarking and forward economics are not — they need The AI Ledger. Want this picture of
          your real estate?
        </>
      ),
    },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 rounded-control border border-accent/40 bg-accent-soft/60 px-3.5 py-2 text-sm font-medium text-accent hover:bg-accent-soft"
      >
        <span aria-hidden="true">▷</span>
        Take the tour
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4 backdrop-blur-sm sm:p-8"
          role="dialog"
          aria-modal="true"
          aria-label="Guided tour"
          onClick={() => setOpen(false)}
        >
          <div
            className="my-auto w-full max-w-lg rounded-card border border-border bg-surface shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-3">
              <p className="text-sm font-semibold uppercase tracking-[0.08em] text-accent">
                The 90-second story
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close tour"
                className="rounded-control px-2 py-1 text-ink-muted hover:bg-surface-muted hover:text-ink"
              >
                Close ✕
              </button>
            </div>

            <ol className="max-h-[70vh] space-y-5 overflow-y-auto px-5 py-5">
              {steps.map((s, i) => (
                <li key={i} className="flex gap-3">
                  <span className="tabular mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-white">
                    {i + 1}
                  </span>
                  <div>
                    <p className="font-semibold text-ink">{s.title}</p>
                    <p className="mt-0.5 text-sm leading-relaxed text-ink-muted">{s.body}</p>
                    {s.link && (
                      <Link
                        href={s.link.href}
                        onClick={() => setOpen(false)}
                        className="mt-1 inline-block text-sm text-accent hover:underline"
                      >
                        {s.link.label} →
                      </Link>
                    )}
                  </div>
                </li>
              ))}
            </ol>

            <div className="flex items-center justify-between gap-3 border-t border-border px-5 py-3">
              <span className="text-xs text-ink-faint">Illustrative demo · figures fictional</span>
              <CtaButton />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
