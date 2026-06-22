import Link from "next/link";
import { company, meta, useCases } from "@/lib/seed";
import {
  portfolio,
  buSpend,
  top5,
  businessUnitsCount,
  vendorsCount,
  evidenceBackedUseCases,
} from "@/lib/portfolio";
import { aud, audCompact, pct } from "@/lib/format";
import { PageHeader } from "@/components/PageHeader";
import { Panel } from "@/components/Panel";
import { KpiCard } from "@/components/KpiCard";
import { DecisionBand } from "@/components/DecisionBand";
import { CostDonut } from "@/components/CostDonut";
import { BuBarChart } from "@/components/BuBarChart";
import { RiskBar } from "@/components/RiskBar";
import { DecisionChip, RagChip } from "@/components/StatusChip";
import { ConfidenceDots } from "@/components/ConfidenceDots";
import { PrintButton } from "@/components/PrintButton";

export default function ControlRoom() {
  const total = portfolio.totalAnnualSpendAud;
  const evidenceBacked = evidenceBackedUseCases(useCases);

  return (
    <>
      <PageHeader
        eyebrow="Executive Control Room"
        title={company.name}
        lead={company.headlineQuestion}
        actions={<PrintButton />}
        narrative={
          <>
            <strong className="font-semibold text-ink">The 30-second read:</strong>{" "}
            {company.shortName} runs {audCompact(total)} of AI spend across{" "}
            {portfolio.useCaseCount} use cases and {businessUnitsCount} business
            units — and no one owns the economics. Half is defensible, a third needs fixing,
            and {audCompact(portfolio.reclaimableAnnualSpendAud)} should probably stop.
          </>
        }
      />

      <div className="mx-auto max-w-6xl space-y-8 px-6 py-8">
        {/* 1 — Headline KPI strip */}
        <section aria-label="Headline economics">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KpiCard
              label="Total annual AI spend"
              value={audCompact(total)}
              context={`Across ${portfolio.useCaseCount} use cases and ${businessUnitsCount} business units — no central economic owner.`}
            />
            <KpiCard
              label="Use cases · business units"
              value={`${portfolio.useCaseCount} · ${businessUnitsCount}`}
              context={`${vendorsCount} external AI vendors in production, pilot or rollout.`}
            />
            <KpiCard
              label="Sitting in “stop”"
              value={audCompact(portfolio.reclaimableAnnualSpendAud)}
              emphasis="warn"
              context="2 use cases where the vendor story beats the operating case — reclaimable."
            />
            <KpiCard
              label="Unmanaged-risk spend"
              value={audCompact(portfolio.atRiskUnmanagedSpendAud)}
              emphasis="alert"
              context="Carries red (unmanaged) risk — concentrated in financial-crime and collections."
            />
          </div>
        </section>

        {/* 2 — Decision summary: the punchline */}
        <section aria-label="Scale, fix or stop">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold text-ink">What should we scale, fix or stop?</h2>
            <Link href="/register" className="text-sm text-accent hover:underline print:hidden">
              Open the Register →
            </Link>
          </div>
          <DecisionBand useCases={useCases} />
        </section>

        {/* 3 — Two charts side by side */}
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel
            title="Where the money concentrates"
            subtitle="Annual spend by business unit"
          >
            <BuBarChart data={buSpend} />
          </Panel>
          <Panel
            title="The hidden cost mix"
            subtitle="Annual spend by cost type — tokens are nearly as big as licences"
          >
            <CostDonut data={portfolio.spendByCostType} total={total} />
          </Panel>
        </div>

        {/* 4 — Risk concentration */}
        <Panel title="Risk concentration" subtitle="Annual spend by RAG risk rating">
          <RiskBar data={portfolio.spendByRisk} total={total} />
          <p className="mt-4 text-sm text-ink-muted">
            <strong className="font-semibold text-status-red-fg">
              {aud(portfolio.atRiskUnmanagedSpendAud)}
            </strong>{" "}
            of spend carries unmanaged (red) risk — and only{" "}
            <strong className="font-semibold text-ink">
              {evidenceBacked.length} of {portfolio.useCaseCount}
            </strong>{" "}
            use cases are backed by high or medium-high outcome evidence.
          </p>
        </Panel>

        {/* 5 — Portfolio table preview (top 5 by spend) */}
        <Panel
          title="Largest use cases by spend"
          subtitle="Top 5 of 10 — click any row for the full record"
          right={
            <Link href="/register" className="text-sm text-accent hover:underline print:hidden">
              All 10 →
            </Link>
          }
        >
          <div className="-mx-2 overflow-x-auto">
            <table className="w-full min-w-[680px] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-ink-faint">
                  <th className="px-2 py-2 font-medium">Use case</th>
                  <th className="px-2 py-2 font-medium">Business unit</th>
                  <th className="px-2 py-2 text-right font-medium">Annual cost</th>
                  <th className="px-2 py-2 font-medium">Risk</th>
                  <th className="px-2 py-2 font-medium">Confidence</th>
                  <th className="px-2 py-2 font-medium">Decision</th>
                </tr>
              </thead>
              <tbody>
                {top5.map((uc) => (
                  <tr key={uc.id} className="border-b border-border/70 hover:bg-surface-muted/50">
                    <td className="px-2 py-2.5">
                      <Link href={`/register/${uc.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                        {uc.name}
                      </Link>
                      <span className="block text-xs text-ink-faint">{uc.id} · {uc.vendor}</span>
                    </td>
                    <td className="px-2 py-2.5 text-ink-muted">{uc.businessUnit}</td>
                    <td className="tabular px-2 py-2.5 text-right font-medium text-ink">
                      {aud(uc.cost.totalAnnual)}
                      <span className="block text-xs font-normal text-ink-faint">{pct(uc.cost.totalAnnual, total)}</span>
                    </td>
                    <td className="px-2 py-2.5"><RagChip rag={uc.risk.rag} size="sm" /></td>
                    <td className="px-2 py-2.5"><ConfidenceDots confidence={uc.outcome.confidence} showLabel={false} /></td>
                    <td className="px-2 py-2.5"><DecisionChip decision={uc.decision} size="sm" /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Panel>
      </div>
    </>
  );
}
