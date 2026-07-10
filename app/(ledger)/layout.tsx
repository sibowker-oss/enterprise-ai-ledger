import { company, meta } from "@/lib/seed";
import { AppShell } from "@/components/AppShell";
import { Footer } from "@/components/Footer";

/**
 * The Enterprise AI Ledger (Meridian) shell. Lives in the (ledger) route group
 * so it wraps the Ledger surfaces (Control Room, Register, Cost, Outcome) but
 * NOT the Investment-Case Simulator, which owns its own chrome. Route groups do
 * not affect URLs — "/", "/cost", "/outcome", "/register" are unchanged.
 */
export default function LedgerLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell companyName={company.name} period={meta.period}>
      {children}
      <Footer disclaimer={meta.disclaimer} />
    </AppShell>
  );
}
