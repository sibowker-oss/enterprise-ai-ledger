import Link from "next/link";
import { useCases, benchmarks } from "@/lib/seed";
import {
  portfolio,
  costMatrixByUseCase,
  costMatrixByBusinessUnit,
  blindSpots,
  vendorPricedCost,
  audPerMillionTokens,
  tokenUpliftByUseCase,
  costByVendor,
  seatsVsConsumption,
  futureMultiple,
} from "@/lib/portfolio";
import { aud, pct } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { CostLedger } from "@/components/CostLedger";
import { LedgerBenchmark } from "@/components/LedgerBenchmark";
import { LedgerForward } from "@/components/LedgerForward";

export default function CostPage() {
  const total = portfolio.totalAnnualSpendAud;
  const spots = blindSpots(useCases);
  const tokenSpots = spots.filter((s) => s.kind === "tokens");
  const reclaimSpots = spots.filter((s) => s.kind === "reclaimable");
  const tokens = portfolio.spendByCostType.tokens;
  const licences = portfolio.spendByCostType.licences;

  return (
    <>
      <PageHeader
        eyebrow="Cost Ledger"
        title="What AI actually costs"
        lead="The full cost stack — licences, tokens, cloud, integration and people — sliceable by use case and business unit, reconciled to the headline total."
        narrative={
          <>
            The hidden cost isn&rsquo;t licences. <strong className="font-semibold text-ink">Tokens are{" "}
            {aud(tokens)}</strong> — {pct(tokens, total)} of all AI spend and nearly as much as
            licences ({aud(licences)}) — yet most finance teams never see them broken out.
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-8 px-4 py-8 sm:px-6">
        <CostLedger
          byUseCase={costMatrixByUseCase(useCases)}
          byBusinessUnit={costMatrixByBusinessUnit(useCases)}
          spendByCostType={portfolio.spendByCostType}
          total={total}
          futureMultiple={futureMultiple}
        />

        <LedgerBenchmark
          vendorPricedCost={vendorPricedCost(useCases)}
          audPerMTokens={audPerMillionTokens(benchmarks)}
          benchmarks={benchmarks}
        />

        <LedgerForward
          tokenUplift={tokenUpliftByUseCase(useCases, benchmarks.subsidyEconomics.priceToCostRecoveryMultiple)}
          vendors={costByVendor(useCases)}
          seats={seatsVsConsumption(useCases)}
          benchmarks={benchmarks}
          multiple={benchmarks.subsidyEconomics.priceToCostRecoveryMultiple}
        />

        {/* Blind spots (deck slide 41) */}
        <section aria-label="Cost blind spots" className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-ink">Blind spots</h2>
            <p className="text-sm text-ink-faint">Where the cost model usually hides money — surfaced from the data.</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <Panel
              title="Hidden token cost"
              subtitle={`${aud(tokens)} of tokens (${pct(tokens, total)} of spend) — the line finance rarely sees`}
              className="border-l-4 border-l-cost-tokens"
            >
              <ul className="space-y-3">
                {tokenSpots.map((s) => (
                  <li key={s.useCaseId} className="text-sm">
                    <Link href={`/register/${s.useCaseId}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {s.useCaseName}
                    </Link>{" "}
                    <span className="tabular text-ink-muted">— {aud(s.amount)} in tokens</span>
                    <p className="mt-0.5 text-ink-faint">{s.detail}</p>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              title="Reclaimable spend"
              subtitle={`${aud(portfolio.reclaimableAnnualSpendAud)} sits in “stop” use cases`}
              className="border-l-4 border-l-status-amber-solid"
            >
              <ul className="space-y-3">
                {reclaimSpots.map((s) => (
                  <li key={s.useCaseId} className="text-sm">
                    <Link href={`/register/${s.useCaseId}`} className="font-medium text-ink hover:text-accent hover:underline">
                      {s.useCaseName}
                    </Link>{" "}
                    <span className="tabular text-ink-muted">— {aud(s.amount)}/yr</span>
                    <p className="mt-0.5 text-ink-faint">{s.detail}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </section>
      </div>
    </>
  );
}
