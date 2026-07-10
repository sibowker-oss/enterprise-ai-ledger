"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ARCHETYPES } from "@/lib/simulator/archetypes";
import { MODELS, model as resolveModel } from "@/lib/simulator/models";
import { forwardSignal, forwardSignalAsOf, tokenPrior } from "@/lib/simulator/data";
import { type Levers } from "@/lib/simulator/engine";
import { budgetLine, clampRamp, type AdoptionRamp } from "@/lib/simulator/budget";
import { deriveCase } from "@/lib/simulator/derive";
import {
  defaultConfig,
  defaultState,
  parseState,
  serializeState,
  PIN_LIMIT,
  type SimConfig,
  type SimState,
} from "@/lib/simulator/urlState";
import { modelChangeAdvisory } from "@/lib/simulator/copy";
import { track } from "@/lib/simulator/analytics";
import { SimHeader } from "@/components/simulator/SimHeader";
import { SimFooter } from "@/components/simulator/SimFooter";
import { SimToolbar } from "@/components/simulator/SimToolbar";
import { ConfigPanel } from "@/components/simulator/ConfigPanel";
import { Q1Usage } from "@/components/simulator/Q1Usage";
import { Q2ForwardPricing } from "@/components/simulator/Q2ForwardPricing";
import { CostBox } from "@/components/simulator/CostBox";
import { Q3Levers } from "@/components/simulator/Q3Levers";
import { Q4Value } from "@/components/simulator/Q4Value";
import { Q5Verdict } from "@/components/simulator/Q5Verdict";
import { BudgetCard } from "@/components/simulator/BudgetCard";
import { PinTray } from "@/components/simulator/PinTray";
import { PrintSummary } from "@/components/simulator/PrintSummary";
import { SimCta } from "@/components/simulator/SimCta";
import { leverCaps } from "@/lib/simulator/engine";

const sameConfig = (a: SimConfig, b: SimConfig) => JSON.stringify(a) === JSON.stringify(b);

export default function InvestmentCaseSimulator() {
  const [state, setState] = useState<SimState>(defaultState);
  const hydratedFromUrl = useRef(false);

  const config = state.current;

  /* ------------------------------------------------------------------ *
   * URL state: read once on mount, then keep the address bar in sync so
   * "Copy link to this case" always captures the full configuration.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (window.location.search.length > 1) {
      setState(parseState(window.location.search));
    }
    hydratedFromUrl.current = true;
  }, []);

  useEffect(() => {
    if (!hydratedFromUrl.current) return;
    const t = window.setTimeout(() => {
      const qs = serializeState(state);
      window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [state]);

  /* ------------------------------------------------------------------ *
   * Updaters.
   * ------------------------------------------------------------------ */
  const patchConfig = (patch: Partial<SimConfig>) =>
    setState((prev) => ({ ...prev, current: { ...prev.current, ...patch } }));

  function selectArchetype(key: string) {
    // Selecting a use case resets the scenario to its illustrative defaults —
    // including the library-sourced starting levers and TYPICAL intensity.
    setState((prev) => ({ ...prev, current: defaultConfig(key) }));
    track("sim_use_case_switch", { use_case: key });
  }

  function selectModel(key: string) {
    patchConfig({ modelKey: key });
    track("sim_model_switch", { model: key, use_case: config.archetypeKey });
  }

  const valueEditTimer = useRef<number | null>(null);
  function editValue(key: "driver" | "rate", value: number) {
    patchConfig({ overrides: { ...config.overrides, [key]: value } });
    // Debounced: a typed figure fires one event, not one per keystroke. The
    // event carries WHICH field changed, never the number itself.
    if (valueEditTimer.current) window.clearTimeout(valueEditTimer.current);
    valueEditTimer.current = window.setTimeout(() => {
      track("sim_value_edit", { field: key, use_case: config.archetypeKey });
    }, 800);
  }

  function pinCurrent() {
    setState((prev) => {
      if (prev.pins.length >= PIN_LIMIT) return prev;
      if (prev.pins.some((p) => sameConfig(p, prev.current))) return prev;
      return { ...prev, pins: [...prev.pins, prev.current] };
    });
    track("sim_pin_case", { use_case: config.archetypeKey });
  }

  /* ------------------------------------------------------------------ *
   * Derivation — one path for the page, the pins and the print summary.
   * ------------------------------------------------------------------ */
  const derived = useMemo(() => {
    const s = deriveCase(config);
    const priors = tokenPrior(s.a.priorKey);
    const m = resolveModel(config.modelKey);
    const signal = forwardSignal(m.provider);
    const advisory = modelChangeAdvisory(s.a, config.modelKey, priors.defaultModel);
    const line = budgetLine(s.a.key, s.band, s.counted, state.ramp);
    return { s, m, signal, advisory, line };
  }, [config, state.ramp]);

  // The verdict STATE is a funnel signal — fire once per distinct state reached.
  const lastVerdict = useRef<string | null>(null);
  useEffect(() => {
    const klass = derived.s.verdict.klass;
    if (lastVerdict.current !== klass) {
      lastVerdict.current = klass;
      track("sim_verdict_state", { verdict: klass, use_case: config.archetypeKey });
    }
  }, [derived.s.verdict.klass, config.archetypeKey]);

  const isPinned = state.pins.some((p) => sameConfig(p, config));

  return (
    <div className="min-h-screen bg-paper text-ink">
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {/* One-page board summary — print only; the walk below is screen only. */}
        <PrintSummary s={derived.s} line={derived.line} pins={state.pins} />

        <div className="print:hidden">
          <SimHeader />

          <div className="mt-4 flex justify-end">
            <SimToolbar useCaseKey={config.archetypeKey} />
          </div>

          <div className="mt-4 grid grid-cols-1 gap-6 lg:grid-cols-[320px_1fr] lg:items-start">
            <ConfigPanel
              archetypes={ARCHETYPES}
              a={derived.s.a}
              onSelectArchetype={selectArchetype}
              units={config.units}
              onUnits={(n) => patchConfig({ units: n })}
              intensity={config.intensity}
              onIntensity={(n) => patchConfig({ intensity: n })}
              maturity={config.maturity}
              onMaturity={(n) => patchConfig({ maturity: n })}
              models={MODELS}
              modelKey={config.modelKey}
              onModel={selectModel}
              modelAdvisory={derived.advisory}
            />

            <main className="space-y-4">
              <Q1Usage a={derived.s.a} units={config.units} u={derived.s.u} />
              <Q2ForwardPricing
                signal={derived.signal}
                providerLabel={derived.m.providerLabel}
                asOf={forwardSignalAsOf}
              />
              <CostBox
                a={derived.s.a}
                band={derived.s.band}
                units={config.units}
                countedValueBase={derived.s.counted.base}
              />
              <Q3Levers
                levers={config.levers}
                caps={leverCaps(derived.s.a)}
                clamped={derived.s.band.leverClamped}
                onChange={(key, value) =>
                  patchConfig({ levers: { ...config.levers, [key]: value } as Levers })
                }
              />
              <Q4Value
                a={derived.s.a}
                overrides={config.overrides}
                onChange={editValue}
                value={derived.s.value}
                counted={derived.s.counted}
                haircut={config.haircut}
                onHaircut={(pct) => patchConfig({ haircut: pct })}
                units={config.units}
              />
              <BudgetCard
                line={derived.line}
                ramp={state.ramp}
                onRamp={(ramp: AdoptionRamp) =>
                  setState((prev) => ({ ...prev, ramp: clampRamp(ramp) }))
                }
              />
              <Q5Verdict
                verdict={derived.s.verdict}
                band={derived.s.band}
                valueBase={derived.s.counted.base}
                breakEven={derived.s.breakEven}
                haircut={config.haircut}
                paybackMonth={derived.line.paybackMonth}
                onPin={pinCurrent}
                pinDisabled={state.pins.length >= PIN_LIMIT}
                isPinned={isPinned}
              />
              <SimCta useCaseKey={config.archetypeKey} verdictKlass={derived.s.verdict.klass} />
            </main>
          </div>

          <PinTray
            pins={state.pins}
            onRemove={(i) =>
              setState((prev) => ({ ...prev, pins: prev.pins.filter((_, j) => j !== i) }))
            }
            onLoad={(i) => setState((prev) => ({ ...prev, current: prev.pins[i] }))}
          />

          <SimFooter asOf={forwardSignalAsOf} />
        </div>
      </div>
    </div>
  );
}
