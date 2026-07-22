/**
 * § UX Change #5: Control Posture Panel
 *
 * Shows: data classification, autonomy level, human-approval gate, monitoring,
 * residual risk. Renders the risk assessment as structured data.
 */

import { RiskControlAssessment } from "@/lib/data-model";
import { RagChip } from "./StatusChip";

export function P0ControlPosture({
  assessment,
}: {
  assessment: RiskControlAssessment;
}) {
  return (
    <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-5">
      <h3 className="font-semibold text-ink mb-4">Control Posture</h3>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Data Classification
          </p>
          <p className="mt-1 text-sm font-medium text-ink">
            {assessment.data_classification}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Autonomy Level
          </p>
          <p className="mt-1 text-sm font-medium text-ink">
            {assessment.autonomy_level}
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Inherent Risk
          </p>
          <p className="mt-1">
            <RagChip rag={assessment.inherent_risk} />
          </p>
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-ink-muted">
            Residual Risk
          </p>
          <p className="mt-1">
            <RagChip rag={assessment.residual_risk} />
          </p>
        </div>
      </div>

      <div className="mt-4 border-t border-accent/20 pt-4 space-y-3">
        <div>
          <p className="text-xs font-semibold text-ink-muted">Approval Gate</p>
          <p className="text-sm text-ink mt-1">{assessment.human_approval_gate}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-muted">Monitoring</p>
          <p className="text-sm text-ink mt-1">{assessment.monitoring}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-muted">Key Controls</p>
          <p className="text-sm text-ink mt-1">{assessment.key_controls}</p>
        </div>

        <div>
          <p className="text-xs font-semibold text-ink-muted">Assessed By</p>
          <p className="text-sm text-ink mt-1">
            {assessment.assessed_by} on{" "}
            {new Date(assessment.assessed_at).toLocaleDateString()}
          </p>
        </div>
      </div>
    </div>
  );
}
