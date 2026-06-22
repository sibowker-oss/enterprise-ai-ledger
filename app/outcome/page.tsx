import { useCases } from "@/lib/seed";
import { portfolio, evidenceBackedSpend } from "@/lib/portfolio";
import { audCompact } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { OutcomeLedger } from "@/components/OutcomeLedger";

export default function OutcomePage() {
  const total = portfolio.totalAnnualSpendAud;
  const backed = evidenceBackedSpend(useCases);

  return (
    <>
      <PageHeader
        eyebrow="Outcome Ledger"
        title="Whether AI earns back"
        lead="The evidence standard — baseline, target, evidence and confidence for every use case. Confidence is the spine: most spend is not backed by hard outcome evidence."
        narrative={
          <>
            Turn on <strong className="font-semibold text-ink">&ldquo;evidence-backed spend&rdquo;</strong> and
            the picture sharpens: only <strong className="font-semibold text-ink">{audCompact(backed)} of {audCompact(total)}</strong>{" "}
            is backed by high or medium-high outcome evidence. The rest is vendor claims and self-reported time savings.
          </>
        }
      />
      <div className="mx-auto max-w-6xl px-6 py-8">
        <OutcomeLedger useCases={useCases} total={total} />
      </div>
    </>
  );
}
