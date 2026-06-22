import Link from "next/link";
import type { UseCase } from "@/lib/types";
import { aiRoleCategory, COST_COMPONENTS } from "@/lib/portfolio";
import { aud, pct, reviewDate } from "@/lib/format";
import { costComponentLabel, confidenceMeta } from "@/lib/labels";
import { costTypeColor } from "@/styles/tokens";
import { DecisionChip, RagChip } from "./StatusChip";
import { ConfidenceDots } from "./ConfidenceDots";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="mt-0.5 text-sm text-ink">{children}</dd>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="text-sm font-semibold uppercase tracking-wide text-accent">{children}</h2>;
}

/** Full use-case record (BUILD_SPEC §5.2 detail), deep-linkable at /register/:id. */
export function UseCaseDetail({ uc }: { uc: UseCase }) {
  const total = uc.cost.totalAnnual;

  return (
    <article className="space-y-8">
      {/* Header */}
      <div>
        <Link href="/register" className="text-sm text-accent hover:underline print:hidden">
          ← Back to Register
        </Link>
        <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="tabular text-sm text-ink-faint">{uc.id}</p>
            <h1 className="text-2xl font-semibold text-ink sm:text-3xl">{uc.name}</h1>
            <p className="mt-1 text-ink-muted">{uc.businessUnit}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <RagChip rag={uc.risk.rag} />
            <DecisionChip decision={uc.decision} />
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Identity & purpose */}
        <section className="space-y-4 rounded-card border border-border bg-surface p-5 lg:col-span-2">
          <SectionTitle>Identity &amp; purpose</SectionTitle>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Owner">{uc.owner}</Field>
            <Field label="Vendor / model">
              {uc.vendor}
              <span className="block text-ink-muted">{uc.model}</span>
            </Field>
            <Field label="User group">{uc.userGroup}</Field>
            <Field label="AI role">
              {aiRoleCategory(uc)} <span className="text-ink-faint">— {uc.aiRole}</span>
            </Field>
            <Field label="Current state">{uc.currentState}</Field>
            <Field label="Workflow">{uc.workflow}</Field>
          </dl>
        </section>

        {/* Cost breakdown */}
        <section className="space-y-3 rounded-card border border-border bg-surface p-5">
          <div className="flex items-baseline justify-between">
            <SectionTitle>Annual cost</SectionTitle>
            <Link href="/cost" className="text-xs text-accent hover:underline print:hidden">
              Cost Ledger →
            </Link>
          </div>
          <p className="tabular text-2xl font-semibold text-ink">{aud(total)}</p>
          <ul className="space-y-2 border-t border-border pt-3">
            {COST_COMPONENTS.map((c) => (
              <li key={c}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-ink-muted">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-2.5 rounded-sm"
                      style={{ backgroundColor: costTypeColor[c] }}
                    />
                    {costComponentLabel[c]}
                  </span>
                  <span className="tabular font-medium text-ink">{aud(uc.cost[c])}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-surface-muted">
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${total ? (uc.cost[c] / total) * 100 : 0}%`, backgroundColor: costTypeColor[c] }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Outcome */}
        <section className="space-y-4 rounded-card border border-border bg-surface p-5 lg:col-span-2">
          <div className="flex items-baseline justify-between">
            <SectionTitle>Outcome &amp; evidence</SectionTitle>
            <Link href="/outcome" className="text-xs text-accent hover:underline print:hidden">
              Outcome Ledger →
            </Link>
          </div>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field label="Primary metric">{uc.outcome.primaryMetric}</Field>
            <Field label="Confidence">
              <ConfidenceDots confidence={uc.outcome.confidence} />
            </Field>
            <Field label="Baseline">{uc.outcome.baseline}</Field>
            <Field label="Target">{uc.outcome.target}</Field>
          </dl>
          <Field label="Evidence">{uc.outcome.evidence}</Field>
          <p className="text-xs text-ink-faint">
            Next review: {reviewDate(uc.outcome.reviewDate)} ·{" "}
            {confidenceMeta[uc.outcome.confidence].label} confidence
          </p>
        </section>

        {/* Risk + decision */}
        <section className="space-y-4 rounded-card border border-border bg-surface p-5">
          <SectionTitle>Risk &amp; decision</SectionTitle>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <RagChip rag={uc.risk.rag} size="sm" />
            </div>
            <p className="text-sm text-ink-muted">{uc.risk.notes}</p>
          </div>
          <div className="space-y-2 border-t border-border pt-3">
            <div className="flex items-center gap-2">
              <DecisionChip decision={uc.decision} size="sm" />
            </div>
            <Field label="Next action">{uc.nextAction}</Field>
          </div>
        </section>
      </div>
    </article>
  );
}
