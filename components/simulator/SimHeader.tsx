import Link from "next/link";
import { BRAND } from "@/lib/simulator/labels";

/**
 * Hepburn Advisory logo — a self-contained "H" monogram (no external asset, so
 * it survives static export + the CSP). Swap for the supplied brand artwork by
 * replacing this SVG.
 */
function HepburnLogo() {
  return (
    <span className="flex items-center gap-3">
      <span className="flex h-11 w-11 items-center justify-center rounded-[10px] bg-accent shadow-sm">
        <svg viewBox="0 0 32 32" className="h-6 w-6" fill="none" aria-hidden="true">
          <rect x="8" y="7" width="3.6" height="18" rx="1.4" fill="white" />
          <rect x="20.4" y="7" width="3.6" height="18" rx="1.4" fill="white" />
          <rect x="8" y="14.2" width="16" height="3.6" rx="1.4" fill="white" />
        </svg>
      </span>
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
      <h1 className="mt-1.5 text-[28px] font-bold leading-tight tracking-tight text-ink sm:text-[32px]">
        {BRAND.title}
      </h1>
      <p className="mt-2 max-w-2xl text-[15.5px] leading-relaxed text-ink-muted">{BRAND.subtitle}</p>
    </header>
  );
}
