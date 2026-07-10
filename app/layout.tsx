import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Inter for the data-first UI; self-hosted at build time (works with export).
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Hepburn Advisory — AI Ledger tools",
  description:
    "Interactive prototypes by Hepburn Advisory: the Enterprise AI Ledger and the Investment-Case Simulator, sister tools to The AI Ledger. Illustrative demos.",
};

/**
 * Root layout is deliberately thin: it owns <html>/<body>, the font, and the
 * global stylesheet — nothing product-specific. Each surface supplies its own
 * chrome via a route-group layout:
 *   app/(ledger)/layout.tsx  → the Enterprise AI Ledger (Meridian) shell
 *   app/simulator/layout.tsx → the Investment-Case Simulator shell
 * That separation is what lets the two sister products live in one static
 * export without sharing a nav or brand block.
 */
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={inter.variable}>
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
