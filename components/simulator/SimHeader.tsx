import Link from "next/link";
import { BRAND, TRIAGE } from "@/lib/simulator/labels";

/**
 * The Hepburn Advisory sparkle mark — the INVERSE rendition (white tile,
 * ink sparkle) from the design system's canonical set (assets/
 * logo-icon-inverse.svg), for the dark Ledger surface. Inlined so it
 * survives static export + the CSP, per the system's copy-don't-reference
 * rule. Geometry is verbatim from the asset — do not redraw it.
 */
function HepburnLogo() {
  return (
    <span className="flex items-center gap-3">
      <svg viewBox="0 0 100 100" className="h-11 w-11 shadow-sm" fill="none" aria-hidden="true">
        <rect width="100" height="100" rx="18" fill="#FFFFFF" />
        <path
          d="M50 12 C52 38, 62 48, 88 50 C62 52, 52 62, 50 88 C48 62, 38 52, 12 50 C38 48, 48 38, 50 12Z"
          fill="#0A0A0A"
        />
      </svg>
      <span className="flex flex-col leading-none">
        <span className="text-[19px] font-bold tracking-tight text-ink sm:text-[21px]">Hepburn</span>
        <span className="text-[12px] font-medium uppercase tracking-[0.18em] text-ink-faint">
          Advisory
        </span>
      </span>
    </span>
  );
}

/** The simulator header, led by the Hepburn Advisory logo. */
export function SimHeader() {
  return (
    <header className="border-b border-border pb-6 pt-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <HepburnLogo />
        <Link
          href="/"
          className="text-[11px] text-ink-faint underline-offset-2 hover:text-ink hover:underline"
        >
          ← Enterprise AI Ledger
        </Link>
      </div>
      <p className="mt-6 text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
        {BRAND.eyebrow}
      </p>
      <div className="mt-1.5 flex items-center gap-3">
        <h1 className="text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">
          {BRAND.title}
        </h1>
        <span className="inline-flex rounded-full bg-warning-light px-3 py-1 text-[12px] font-semibold text-warning">
          {TRIAGE.chip}
        </span>
      </div>
      <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-muted">{BRAND.subtitle}</p>
    </header>
  );
}
