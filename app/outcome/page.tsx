import { useCases } from "@/lib/seed";
import { portfolio, value, futureMultiple } from "@/lib/portfolio";
import { audCompact } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { OutcomeLedger } from "@/components/OutcomeLedger";

export default function OutcomePage() {
  const total = portfolio.totalAnnualSpendAud;

  return (
    <>
      <PageHeader
        eyebrow="Outcome Ledger"
        title="Whether AI earns back"
        lead="The return on every use case — separating theoretical value from what has actually been banked in the P&L. A CFO trusts cash that has hit the books, not modeled capacity."
        narrative={
          <>
            The model says {audCompact(value.totalAnnualBenefitAud)} of value — but only{" "}
            <strong className="font-semibold text-ink">{audCompact(value.totalBankedValueAud)} ({value.bankedConversionPct}%) is actually banked</strong>{" "}
            in the P&amp;L. The rest is freed capacity and projected savings that need deliberate cost-out or
            revenue conversion. <em>Banking it is the engagement.</em>
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <OutcomeLedger useCases={useCases} total={total} value={value} futureMultiple={futureMultiple} />
      </div>
    </>
  );
}
