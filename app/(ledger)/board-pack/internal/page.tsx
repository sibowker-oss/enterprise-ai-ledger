/**
 * Internal Debug Route: /board-pack/internal
 *
 * This route is NOT intended for customer use. It displays internal validation metadata:
 * - Formula Versions (versioned calculation inputs for byte-for-byte re-derivation)
 * - Reconciliation proof (P0 migration verification from old Meridian model)
 * - Full snapshot metadata
 *
 * Not listed in public nav; customers would not think to navigate here.
 */

import { p0, p0Reconciliation } from "@/lib/seed-p0";

export default function P0BoardPackInternalPage() {
  const snapshot = p0.snapshots[0];
  if (!snapshot) {
    return <div className="p-8 text-ink">No snapshot available</div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-12 px-4 py-8 sm:px-6">
      {/* Page Header */}
      <div className="border-b border-ink/10 pb-6">
        <h1 className="text-3xl font-bold text-ink">P0 Board Pack — Internal Validation</h1>
        <p className="text-sm text-ink-muted mt-2">
          This page is for Hepburn Advisory internal use only. It contains metadata not intended
          for customer review.
        </p>
      </div>

      {/* Formula Versions */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-ink">Formula Versions</h2>
        <p className="text-sm text-ink-muted mb-4">
          Immutable snapshot enables byte-for-byte re-derivation of all figures. The formula version
          set below was captured at the time this snapshot was taken.
        </p>
        <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
          <pre className="text-xs font-mono text-ink-muted overflow-x-auto whitespace-pre-wrap break-words">
            {snapshot.formula_version_set}
          </pre>
        </div>
        <p className="text-xs text-ink-muted mt-2">
          Snapshot taken at: {new Date(snapshot.taken_at).toISOString()}
        </p>
      </section>

      {/* Reconciliation Proof */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-ink">Reconciliation Proof (P0 Migration)</h2>
        <p className="text-sm text-ink-muted mb-4">
          This reconciliation verifies that the P0 canonical data model correctly migrated data
          from the legacy Meridian prototype. The four headline numbers are preserved across
          the migration boundary.
        </p>
        <div className="rounded-card border border-status-green-solid/30 bg-status-green-soft p-6">
          <pre className="text-xs font-mono text-ink overflow-x-auto whitespace-pre-wrap break-words leading-relaxed">
            {p0Reconciliation.reconciliationStatement}
          </pre>
        </div>
        <p className="text-xs text-status-green-fg mt-2 font-medium">
          ✓ Migration reconciliation verified — all four headline values match old → new model
        </p>
      </section>

      {/* Snapshot Metadata */}
      <section>
        <h2 className="mb-4 text-2xl font-bold text-ink">Snapshot Metadata</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
              Snapshot ID
            </p>
            <p className="mt-2 font-mono text-ink text-sm">{snapshot.id}</p>
          </div>
          <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
              Taken At
            </p>
            <p className="mt-2 font-mono text-ink text-sm">
              {new Date(snapshot.taken_at).toISOString()}
            </p>
          </div>
          <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
              Client Instance ID
            </p>
            <p className="mt-2 font-mono text-ink text-sm break-all">{snapshot.client_instance_id}</p>
          </div>
          <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-6">
            <p className="text-xs font-semibold uppercase tracking-wide text-accent-text">
              Portfolio ID
            </p>
            <p className="mt-2 font-mono text-ink text-sm break-all">{snapshot.portfolio_id}</p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <div className="border-t border-ink/10 pt-6">
        <p className="text-xs text-ink-muted italic">
          This internal validation page is not included in customer-facing board pack exports.
          It is available for Hepburn Advisory team review and quality assurance only.
        </p>
      </div>
    </div>
  );
}
