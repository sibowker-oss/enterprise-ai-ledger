/**
 * § UX Change #7: Scenario Panel
 *
 * Shows price-stress and other scenarios with:
 * - Live TAIL reference (never hard-coded)
 * - "Scenario, not forecast" caveat on price-stress
 * - Assumptions and multipliers
 * - TAIL as-of + expiry dates
 */

import { Scenario, TailReference } from "@/lib/data-model";
import { audCompact } from "@/lib/format";

export function P0ScenarioPanel({
  scenarios,
  tailRefs,
}: {
  scenarios: Scenario[];
  tailRefs: Map<string, TailReference>;
}) {
  return (
    <div className="rounded-card border border-accent/20 bg-accent-soft/10 p-5">
      <h3 className="font-semibold text-ink mb-4">Scenarios & Sensitivities</h3>

      {scenarios.length === 0 ? (
        <p className="text-sm text-ink-muted">No scenarios defined</p>
      ) : (
        <div className="space-y-4">
          {scenarios.map((scenario) => {
            const tail = scenario.tail_reference_id
              ? tailRefs.get(scenario.tail_reference_id)
              : null;
            const hasCaveat =
              scenario.scenario_type === "price-stress" || tail?.scenario_only;

            return (
              <div
                key={scenario.id}
                className="rounded-sm border border-accent/20 bg-white p-4"
              >
                {hasCaveat && (
                  <div className="mb-3 rounded-sm bg-amber-50 border border-amber-200 p-2">
                    <p className="text-xs font-semibold text-amber-900">
                      ⚠ Scenario, not forecast
                    </p>
                    {tail && (
                      <p className="text-xs text-amber-800 mt-1">
                        TAIL as-of {tail.as_of_date.split("T")[0]}, expires{" "}
                        {tail.expires_at.split("T")[0]}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-ink">{scenario.name}</p>
                    <p className="text-xs text-ink-muted mt-1">
                      Type: {scenario.scenario_type}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-sm font-semibold text-ink">
                      {audCompact(scenario.scenario_cost || 0)}
                    </p>
                    <p className="text-xs text-ink-muted">
                      Multiplier: {scenario.scenario_multiplier}x
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <p className="text-ink-muted">Fixed Cost</p>
                    <p className="font-medium text-ink">
                      {audCompact(scenario.fixed_cost)}
                    </p>
                  </div>
                  <div>
                    <p className="text-ink-muted">Variable Cost</p>
                    <p className="font-medium text-ink">
                      {audCompact(scenario.variable_cost)}
                    </p>
                  </div>
                </div>

                {scenario.assumptions && (
                  <div className="mt-3 border-t border-accent/20 pt-3">
                    <p className="text-xs font-semibold text-ink-muted">
                      Assumptions
                    </p>
                    <p className="text-sm text-ink mt-1">
                      {scenario.assumptions}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
