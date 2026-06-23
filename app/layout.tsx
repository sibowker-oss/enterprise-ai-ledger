import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { company, meta } from "@/lib/seed";
import { AppShell } from "@/components/AppShell";
import { Footer } from "@/components/Footer";

// Inter for the data-first UI; self-hosted at build time (works with export).
const inter = Inter({ subsets: ["latin"], variable: "--font-sans", display: "swap" });

export const metadata: Metadata = {
  title: "Enterprise AI Ledger — Meridian Financial Group (illustrative demo)",
  description:
    "An interactive prototype of the Enterprise AI Ledger: what AI costs, where it earns back, and what to scale, fix or stop — shown on a fictional financial-services company. By Hepburn Advisory.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-AU" className={inter.variable}>
      <body className="min-h-screen antialiased">
        <AppShell companyName={company.name} period={meta.period}>
          {children}
          <Footer disclaimer={meta.disclaimer} />
        </AppShell>
      </body>
    </html>
  );
}
