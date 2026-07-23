/**
 * § UX Change #8: Board-Pack Export Page
 *
 * Renders a complete, dated board pack from a Snapshot with all 8 sections (§7):
 * 1. Executive summary
 * 2. Coverage statement
 * 3. Current economics
 * 4. Scenarios & assumptions
 * 5. Decisions & exceptions
 * 6. Top controls & risk
 * 7. Actions / owners / dates
 * 8. Methodology & evidence appendix
 *
 * Exportable (PDF, print-friendly); includes dated export header block.
 * Customer-facing: Formula Versions and Reconciliation moved to /internal route.
 */

import { p0, p0Rollup } from "@/lib/seed-p0";
import { audCompact, pct } from "@/lib/format";
import { P0CoverageBanner } from "@/components/P0CoverageBanner";
import { P0FourValueLanes } from "@/components/P0FourValueLanes";
import { P0LifecycleDecisionAxis } from "@/components/P0LifecycleDecisionAxis";
import { P0DecisionActionLog } from "@/components/P0DecisionActionLog";
import { P0ControlPosture } from "@/components/P0ControlPosture";
import { PrintButton } from "@/components/PrintButton";

export default function P0BoardPackPage() {
  const snapshot = p0.snapshots[0];
  if (!snapshot) {
    return <div>No snapshot available</div>;
  }

  const coverage =
    snapshot.coverage_statement ||
    ({
      assessed_use_cases: 0,
      total_use_cases: 0,
      reconciled_spend_aud: 0,
      total_spend_aud: 0,
      pending_validations: 0,
      stale_evidence_count: 0,
      expired_tail_refs: 0,
    } as any);

  const takingDate = new Date(snapshot.taken_at);

  return (
    <>
      {/* Export Header Block (§6.4) */}
      <div className="border-b border-ink/10 bg-gradient-to-r from-ink-muted/5 to-transparent px-4 py-8 sm:px-6 print:hidden">
        <div className="mx-auto max-w-6xl space-y-2">
          <h1 className="text-2xl font-bold text-ink">Enterprise AI Ledger</h1>
          <h2 className="text-lg font-semibold text-ink-muted">
            {p0.clientInstance.client_name} — Board Pack
          </h2>
          <div className="flex flex-wrap gap-6 text-sm text-ink-muted mt-4">
            <div>
              <span className="font-semibold">Data Cut-off:</span>
              {takingDate.toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Engagement:</span>
              {p0.clientInstance.engagement_ref}
            </div>
            <div>
              <span className="font-semibold">Generated:</span>
              {takingDate.toLocaleDateString()}
            </div>
            <div>
              <span className="font-semibold">Residency:</span>
              {p0.clientInstance.data_residency}
            </div>
          </div>
          <p className="text-xs text-ink-muted italic mt-4">
            Confidential — For board review only.
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6">
        {/* Section 1: Executive Summary */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            1. Executive Summary
          </h2>
          <div className="rounded-card border border-accent/30 bg-accent-soft/40 p-6">
            <p className="text-lg text-ink-muted leading-relaxed">
              {p0.clientInstance.client_name} operates an AI estate across{" "}
              {p0.useCases.length} use cases and {p0.businessUnits.length} business units.
              Total annual spend: <strong>{audCompact(p0Rollup.totalAnnualSpendAud)}</strong>.
              Banked value: <strong>{audCompact(p0Rollup.bankedValueAud)}</strong>.
            </p>
            <p className="mt-4 text-sm text-ink-muted">
              This board pack covers Meridian's material use case economics, evidence trails, and control
              posture.
            </p>
          </div>
        </section>

        {/* Section 2: Coverage Statement */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            2. Coverage & Data Quality
          </h2>
          <P0CoverageBanner coverage={coverage} />
        </section>

        {/* Section 3: Current Economics (Four Lanes) */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            3. Current Economics
          </h2>
          <P0FourValueLanes
            theoretical={p0Rollup.theoreticalValueAud}
            observed={p0.useCases.reduce(
              (sum, uc) => sum + (uc.observed_operational_value || 0),
              0
            )}
            capacity={p0.useCases.reduce(
              (sum, uc) => sum + (uc.capacity_released_value || 0),
              0
            )}
            banked={p0Rollup.bankedValueAud}
            annual_cost={p0Rollup.totalAnnualSpendAud}
          />
        </section>

        {/* Section 4: Scenarios */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            4. Scenarios & Sensitivities
          </h2>
          <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
            <p className="text-sm text-ink-muted mb-4">
              No scenarios defined in this prototype. In production, price-stress scenarios
              would use live TAIL references with "Scenario, not forecast" caveats.
            </p>
          </div>
        </section>

        {/* Section 5: Decisions & Exceptions */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            5. Decisions & Exceptions
          </h2>
          <P0DecisionActionLog
            decisions={p0.decisions}
            actions={p0.actions}
          />
        </section>

        {/* Section 6: Top Controls & Risk */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            6. Controls & Risk
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {p0.useCases.map((uc) => {
              const riskAssessment = p0.riskControlAssessments.find(
                (r) => r.use_case_id === uc.id
              );
              if (!riskAssessment) return null;
              return (
                <div key={uc.id}>
                  <h3 className="mb-3 font-semibold text-ink">{uc.title}</h3>
                  <P0ControlPosture assessment={riskAssessment} />
                </div>
              );
            })}
          </div>
        </section>

        {/* Section 7: Actions */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            7. Open Actions (90-day)
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-accent/20">
                  <th className="text-left py-2 px-3 font-semibold">Use Case</th>
                  <th className="text-left py-2 px-3 font-semibold">Action</th>
                  <th className="text-left py-2 px-3 font-semibold">Owner</th>
                  <th className="text-left py-2 px-3 font-semibold">Due Date</th>
                  <th className="text-left py-2 px-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {p0.actions.map((action) => {
                  const uc = p0.useCases.find((u) => u.id === action.use_case_id);
                  return (
                    <tr key={action.id} className="border-b border-accent/10">
                      <td className="py-2 px-3">{uc?.title}</td>
                      <td className="py-2 px-3">{action.description}</td>
                      <td className="py-2 px-3">{action.owner}</td>
                      <td className="py-2 px-3">
                        {new Date(action.due_date).toLocaleDateString()}
                      </td>
                      <td className="py-2 px-3">
                        <span
                          className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${
                            action.status === "overdue"
                              ? "bg-status-red-soft text-status-red-fg"
                              : action.status === "in-progress"
                                ? "bg-status-amber-soft text-status-amber-fg"
                                : "bg-status-grey-soft text-status-grey-fg"
                          }`}
                        >
                          {action.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 8: Methodology & Evidence Appendix */}
        <section>
          <h2 className="mb-4 text-2xl font-bold text-ink">
            8. Methodology & Evidence Appendix
          </h2>
          <div className="space-y-4">
            <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
              <h3 className="font-semibold text-ink mb-3">Evidence Matrix</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-accent/20">
                      <th className="text-left py-2 px-2 font-semibold">Use Case</th>
                      <th className="text-left py-2 px-2 font-semibold">Banked?</th>
                      <th className="text-left py-2 px-2 font-semibold">Source Type</th>
                      <th className="text-left py-2 px-2 font-semibold">Validator</th>
                    </tr>
                  </thead>
                  <tbody>
                    {p0.benefitClaims.slice(0, 5).map((claim) => {
                      const evidence = p0.evidenceObjects.find(
                        (e) => e.id === claim.primary_evidence_id
                      );
                      const uc = p0.useCases.find(
                        (u) => u.id === claim.use_case_id
                      );
                      return (
                        <tr key={claim.id} className="border-b border-accent/10">
                          <td className="py-2 px-2">{uc?.title}</td>
                          <td className="py-2 px-2">
                            {claim.is_banked ? "✓ Yes" : "—"}
                          </td>
                          <td className="py-2 px-2">
                            {evidence?.source_type || "—"}
                          </td>
                          <td className="py-2 px-2">
                            {evidence?.validated_by || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="border-t border-ink/10 py-6 text-xs text-ink-muted print:hidden">
          <p>
            This board pack is generated from an immutable Snapshot and demonstrates the
            P0 canonical data model. All data is illustrative.
          </p>
        </div>
      </div>

      <div className="fixed bottom-4 right-4 print:hidden">
        <PrintButton />
      </div>
    </>
  );
}
