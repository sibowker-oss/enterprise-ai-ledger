/**
 * § UX Change #3: Lifecycle & Decision Shown as Separate Axes
 *
 * Renders "Lifecycle / Decision" (e.g., "Pilot / Fix") everywhere a use case appears.
 * These are two independent axes, not collapsed into one status.
 */

import { LifecycleStage, DecisionType } from "@/lib/data-model";

export function P0LifecycleDecisionAxis({
  lifecycle,
  decision,
}: {
  lifecycle: LifecycleStage;
  decision: DecisionType;
}) {
  const lifecycleLabel = lifecycle.charAt(0).toUpperCase() + lifecycle.slice(1);
  const decisionLabel = decision.charAt(0).toUpperCase() + decision.slice(1);

  const lifecycleColor: Record<LifecycleStage, string> = {
    idea: "bg-slate-100 text-slate-700",
    discover: "bg-blue-100 text-blue-700",
    validate: "bg-cyan-100 text-cyan-700",
    pilot: "bg-amber-100 text-amber-700",
    "controlled-production": "bg-green-100 text-green-700",
    scale: "bg-emerald-100 text-emerald-700",
    retire: "bg-gray-200 text-gray-700",
  };

  const decisionColor: Record<DecisionType, string> = {
    scale: "bg-emerald-100 text-emerald-700",
    "continue-with-conditions": "bg-yellow-100 text-yellow-700",
    fix: "bg-orange-100 text-orange-700",
    pause: "bg-red-100 text-red-700",
    stop: "bg-red-200 text-red-800",
    "return-to-discovery": "bg-slate-100 text-slate-700",
  };

  return (
    <div className="flex items-center gap-2">
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${lifecycleColor[lifecycle]}`}
      >
        {lifecycleLabel}
      </span>
      <span className="text-ink-muted">/</span>
      <span
        className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${decisionColor[decision]}`}
      >
        {decisionLabel}
      </span>
    </div>
  );
}
