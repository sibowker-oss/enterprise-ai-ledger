"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { navItems, futureNavItems, isActivePath } from "@/lib/nav";
import { CtaButton } from "./CtaButton";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname() ?? "/";
  return (
    <nav className="space-y-1" aria-label="Primary">
      {navItems.map((item) => {
        const active = isActivePath(pathname, item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? "page" : undefined}
            className={`block rounded-control px-3 py-2 ${
              active
                ? "bg-accent-soft text-accent-text ring-1 ring-inset ring-accent/30"
                : "text-ink-muted hover:bg-surface-muted hover:text-ink"
            }`}
          >
            <span className="block text-sm font-medium">{item.label}</span>
            <span className="block text-xs text-ink-faint">{item.blurb}</span>
          </Link>
        );
      })}

      <div className="!mt-4 border-t border-border pt-4">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          Sister tool
        </p>
        <Link
          href="/simulator"
          onClick={onNavigate}
          className="block rounded-control border border-accent/30 bg-accent-soft px-3 py-2 transition-colors hover:border-accent/60 hover:bg-accent-soft/80"
        >
          <span className="flex items-center gap-1.5 text-sm font-semibold text-accent-text">
            Investment-Case Simulator
            <span aria-hidden="true">→</span>
          </span>
          <span className="block text-xs text-ink-muted">Is one use case worth doing? · public</span>
        </Link>
      </div>

      <div className="!mt-4 border-t border-border pt-4">
        <p className="px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-ink-faint">
          Future modules
        </p>
        {futureNavItems.map((item) => (
          <div
            key={item.label}
            className="flex cursor-not-allowed items-center justify-between rounded-control px-3 py-2 opacity-60"
            title="Coming in platform — not part of this prototype"
            aria-disabled="true"
          >
            <span className="text-sm text-ink-muted">{item.label}</span>
            <span className="rounded-chip bg-surface-muted px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-ink-faint">
              Soon
            </span>
          </div>
        ))}
      </div>
    </nav>
  );
}

/**
 * Persistent shell: left sidebar on desktop, collapsible top nav on mobile.
 * Carries the brand block, primary nav, the two disabled future modules, and
 * the persistent CTA (BUILD_SPEC §4).
 */
export function AppShell({
  companyName,
  period,
  children,
}: {
  companyName: string;
  period: string;
  children: React.ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);

  const Brand = (
    <Link href="/" className="block" onClick={() => setMenuOpen(false)}>
      <span className="block text-[11px] font-semibold uppercase tracking-[0.08em] text-accent">
        Enterprise AI Ledger
      </span>
      <span className="block text-lg font-semibold leading-tight text-ink">{companyName}</span>
    </Link>
  );

  return (
    <>
      {/* Persistent demo ribbon — labelling is a hard requirement (§3/§4). */}
      <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-0.5 border-b border-border bg-nav-bg px-4 py-1.5 text-center text-[11px] text-ink-muted print:hidden">
        <span className="eyebrow font-semibold text-accent-text">Illustrative prototype</span>
        <span className="text-ink-faint">·</span>
        <span>{companyName} is a fictional company — all figures illustrative</span>
      </div>

      <div className="min-h-screen lg:grid lg:grid-cols-[16rem_1fr]">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen flex-col border-r border-border bg-nav-bg px-4 py-6 lg:flex">
        <div className="px-3">{Brand}</div>
        <div className="mt-8 flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="mt-6 space-y-3 border-t border-border px-3 pt-4">
          <CtaButton className="w-full justify-center" />
          <p className="text-[11px] leading-snug text-ink-faint">
            Illustrative demo · figures fictional · {period}
          </p>
        </div>
      </aside>

      <div className="flex min-h-screen flex-col">
        {/* Mobile top bar */}
        <header className="sticky top-0 z-20 flex items-center justify-between gap-3 border-b border-border bg-nav-bg/95 px-4 py-3 backdrop-blur lg:hidden">
          <div className="min-w-0">{Brand}</div>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            className="inline-flex min-h-[44px] items-center rounded-control border border-border px-4 text-sm font-medium text-ink active:bg-surface-muted"
          >
            {menuOpen ? "Close" : "Menu"}
          </button>
        </header>
        {menuOpen && (
          <div id="mobile-nav" className="border-b border-border bg-nav-bg px-4 py-4 lg:hidden">
            <NavLinks onNavigate={() => setMenuOpen(false)} />
            <div className="mt-4">
              <CtaButton className="w-full justify-center" />
            </div>
          </div>
        )}

        <main className="flex-1">{children}</main>
      </div>
      </div>
    </>
  );
}
