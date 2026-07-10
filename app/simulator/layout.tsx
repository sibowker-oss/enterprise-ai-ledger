import type { Metadata } from "next";
import Script from "next/script";
import { GA_MEASUREMENT_ID } from "@/lib/simulator/analytics";

export const metadata: Metadata = {
  title: "The Investment-Case Simulator — Hepburn Advisory",
  description:
    "Is an AI use case worth doing — and will it stay worth doing when prices move and usage grows? A plain-language, five-question simulator. A sister tool to The AI Ledger by Hepburn Advisory. Illustrative demo.",
};

/**
 * The Investment-Case Simulator surface. It owns its own chrome (SimHeader /
 * demo ribbon / SimFooter, in the page) rather than the Enterprise AI Ledger
 * shell — it is a distinct sister product. This layout carries metadata plus
 * the GA4 tag (TAIL analytics-instrumentation pattern, 2026-07-02 brief) that
 * lib/simulator/analytics.ts fires its funnel events into.
 */
export default function SimulatorLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
        strategy="afterInteractive"
      />
      <Script id="ga4-init" strategy="afterInteractive">
        {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}gtag("js",new Date());gtag("config","${GA_MEASUREMENT_ID}");`}
      </Script>
      {children}
    </>
  );
}
