/**
 * § UX Change #2: Evidence Drawer
 *
 * Shows the full evidence trail for any headline number:
 * source, method, source date, validator, confidence, expiry.
 * Appears on click/hover of headline KPIs.
 */

import { EvidenceObject, BenefitClaim } from "@/lib/data-model";

export function P0EvidenceDrawer({
  claim,
  evidence,
}: {
  claim: BenefitClaim;
  evidence: EvidenceObject | undefined;
}) {
  if (!evidence) {
    return (
      <div className="rounded-card border border-warn/30 bg-warn-soft/20 p-4">
        <p className="text-sm text-warn font-semibold">No evidence linked</p>
        <p className="text-xs text-ink-muted mt-1">
          This claim cannot be banked or headline without validated evidence.
        </p>
      </div>
    );
  }

  const isStale = evidence.is_stale;
  const isValidated = evidence.status === "validated";

  return (
    <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-4 space-y-3">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-semibold text-ink">Evidence Trail</p>
          <p className="text-xs text-ink-muted mt-1">{claim.benefit_status}</p>
        </div>
        <div className="flex gap-2">
          {isValidated && (
            <span className="inline-flex items-center rounded-full bg-success/20 px-2 py-1 text-xs font-medium text-success">
              Validated
            </span>
          )}
          {isStale && (
            <span className="inline-flex items-center rounded-full bg-warn/20 px-2 py-1 text-xs font-medium text-warn">
              Stale
            </span>
          )}
        </div>
      </div>

      <div className="space-y-2 border-t border-accent/20 pt-3">
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="font-medium text-ink-muted">Source Type</p>
            <p className="text-ink">{evidence.source_type}</p>
          </div>
          <div>
            <p className="font-medium text-ink-muted">Confidence</p>
            <p className="text-ink">{evidence.confidence}</p>
          </div>
        </div>

        <div>
          <p className="font-medium text-ink-muted text-xs">Method</p>
          <p className="text-sm text-ink">{evidence.method}</p>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="font-medium text-ink-muted">Source Date</p>
            <p className="text-ink">{evidence.source_date.split("T")[0]}</p>
          </div>
          <div>
            <p className="font-medium text-ink-muted">Measurement Period</p>
            <p className="text-ink">{evidence.measurement_period}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <p className="font-medium text-ink-muted">Attested By</p>
            <p className="text-ink">{evidence.attested_by}</p>
          </div>
          <div>
            <p className="font-medium text-ink-muted">Validated By</p>
            <p className="text-ink">{evidence.validated_by || "—"}</p>
          </div>
        </div>

        <div>
          <p className="font-medium text-ink-muted text-xs">Assumptions</p>
          <p className="text-sm text-ink">{evidence.assumptions}</p>
        </div>

        <div className="flex items-center justify-between text-xs pt-2 border-t border-accent/20">
          <p className="font-medium text-ink-muted">Expiry</p>
          <p className={`font-semibold ${isStale ? "text-warn" : "text-success"}`}>
            {evidence.expires_at.split("T")[0]}
            {isStale ? " (expired)" : ""}
          </p>
        </div>
      </div>
    </div>
  );
}
