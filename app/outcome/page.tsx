import { useCases } from "@/lib/seed";
import { portfolio, value } from "@/lib/portfolio";
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
        lead="The return on every use case — cost against quantified annual benefit, net value and ROI, with evidence confidence as the trust signal. A CFO buys on return, not operational metrics."
        narrative={
          <>
            Turn on <strong className="font-semibold text-ink">&ldquo;evidence-backed only&rdquo;</strong> and the
            real picture appears: the {audCompact(value.evidenceBackedCostAud)} of evidence-backed spend returns{" "}
            <strong className="font-semibold text-ink">{audCompact(value.evidenceBackedBenefitAud)} ({value.evidenceBackedRoiPct}% ROI)</strong>.
            The rest is vendor claims and self-reported savings — currently underwater.
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <OutcomeLedger
          useCases={useCases}
          total={total}
          evidenceBackedCost={value.evidenceBackedCostAud}
          evidenceBackedBenefit={value.evidenceBackedBenefitAud}
          evidenceBackedRoi={value.evidenceBackedRoiPct}
          totalBenefit={value.totalAnnualBenefitAud}
          portfolioRoi={value.portfolioRoiPct}
        />
      </div>
    </>
  );
}
