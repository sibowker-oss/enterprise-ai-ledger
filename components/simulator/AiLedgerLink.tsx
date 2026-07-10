import Link from "next/link";
import { AI_LEDGER_HREF } from "@/lib/simulator/labels";

/** The AI Ledger mark — the three-bar glyph (matches app/icon.svg), in currentColor. */
export function LedgerMark({ className = "h-3 w-3" }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" className={className} fill="currentColor" aria-hidden="true">
      <rect x="4" y="8" width="12" height="3.5" rx="1.75" />
      <rect x="4" y="14.25" width="24" height="3.5" rx="1.75" />
      <rect x="4" y="20.5" width="18" height="3.5" rx="1.75" />
    </svg>
  );
}

/** A clickable "The AI Ledger" lockup (logo + wordmark) linking to the Ledger home. */
export function AiLedgerLink({
  children,
  className = "",
  showMark = true,
}: {
  children: React.ReactNode;
  className?: string;
  showMark?: boolean;
}) {
  const internal = AI_LEDGER_HREF.startsWith("/");
  const inner = (
    <>
      {showMark && <LedgerMark />}
      {children}
    </>
  );
  // Internal → next/link so the project-path basePath is applied on GitHub Pages.
  if (internal) {
    return (
      <Link href={AI_LEDGER_HREF} className={`inline-flex items-center gap-1 ${className}`}>
        {inner}
      </Link>
    );
  }
  return (
    <a
      href={AI_LEDGER_HREF}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 ${className}`}
    >
      {inner}
    </a>
  );
}
