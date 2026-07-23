/**
 * § UX Change #6: Decision & Action Log
 *
 * Renders decisions and actions (open + in-progress + overdue) in a timeline/log format.
 */

import { Decision, Action } from "@/lib/data-model";

export function P0DecisionActionLog({
  decisions,
  actions,
}: {
  decisions: Decision[];
  actions: Action[];
}) {
  const recentDecisions = decisions.slice(0, 5);
  const openActions = actions.filter((a) =>
    ["open", "in-progress", "overdue"].includes(a.status)
  );

  return (
    <div className="space-y-6">
      {/* Decisions */}
      <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-5">
        <h3 className="font-semibold text-ink mb-4">Decisions</h3>
        <div className="space-y-4">
          {recentDecisions.length === 0 ? (
            <p className="text-sm text-ink-muted">No decisions recorded</p>
          ) : (
            recentDecisions.map((decision) => (
              <div
                key={decision.id}
                className="border-l-4 border-accent pl-4 py-2"
              >
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-ink text-sm">
                    {decision.decision.charAt(0).toUpperCase() +
                      decision.decision.slice(1)}
                  </p>
                  <p className="text-xs text-ink-muted">
                    {new Date(decision.decided_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-sm text-ink-muted">{decision.rationale}</p>
                <p className="text-xs text-ink-muted mt-1">
                  Decided by {decision.decided_by}
                </p>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="rounded-card border border-amber/20 bg-amber-soft/10 p-5">
        <h3 className="font-semibold text-ink mb-4">Open & In-Progress Actions</h3>
        <div className="space-y-3">
          {openActions.length === 0 ? (
            <p className="text-sm text-ink-muted">No open actions</p>
          ) : (
            openActions.map((action) => (
              <div
                key={action.id}
                className="flex items-start justify-between rounded-sm bg-surface p-3 border border-border"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-ink">
                    {action.description}
                  </p>
                  <div className="mt-1 flex gap-4 text-xs text-ink-muted">
                    <span>Owner: {action.owner}</span>
                    <span>Type: {action.action_type}</span>
                  </div>
                </div>
                <div className="ml-4 flex flex-col items-end gap-1">
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
                  <span className="text-xs text-ink-muted">
                    Due: {new Date(action.due_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
