"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ARCHETYPES } from "@/lib/simulator/archetypes";
import { MODELS, model as resolveModel } from "@/lib/simulator/models";
import { forwardSignal, forwardSignalAsOf, tokenPrior } from "@/lib/simulator/data";
import {
  clampToEnvelope,
  inferenceCost,
  leverCaps,
  leverSaving,
  NO_LEVERS,
  type Levers,
} from "@/lib/simulator/engine";
import { budgetLine, clampRamp, type AdoptionRamp } from "@/lib/simulator/budget";
import { deriveCase } from "@/lib/simulator/derive";
import { currencyFactor } from "@/lib/simulator/derive";
import {
  defaultConfig,
  defaultState,
  parseState,
  serializeState,
  type Currency,
  type SimConfig,
  type SimState,
} from "@/lib/simulator/urlState";
import type { ScenarioImport } from "@/lib/simulator/scenario";
import { modelChangeAdvisory } from "@/lib/simulator/copy";
import { track } from "@/lib/simulator/analytics";
import { A11Y } from "@/lib/simulator/labels";
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
import { AssumptionsDrawer } from "@/components/simulator/AssumptionsDrawer";
import { PrintSummary } from "@/components/simulator/PrintSummary";
import { SimCta } from "@/components/simulator/SimCta";

export default function InvestmentCaseSimulator() {
  const [state, setState] = useState<SimState>(defaultState);
  // URL hydration must complete before the sync effect writes or analytics
  // latch a verdict — a shared link's numbers, not the defaults, are the case.
  const [hydrated, setHydrated] = useState(false);

  const config = state.current;

  /* ------------------------------------------------------------------ *
   * URL state: read once on mount, then keep the address bar in sync so
   * a copied link (serialised live in the toolbar) matches what's shown.
   * ------------------------------------------------------------------ */
  useEffect(() => {
    if (window.location.search.length > 1) {
      setState(parseState(window.location.search));
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    const t = window.setTimeout(() => {
      const qs = serializeState(state);
      window.history.replaceState(null, "", `${window.location.pathname}?${qs}`);
    }, 250);
    return () => window.clearTimeout(t);
  }, [state, hydrated]);

  /* ------------------------------------------------------------------ *
   * Updaters.
   * ------------------------------------------------------------------ */
  const patchConfig = (patch: Partial<SimConfig>) =>
    setState((prev) => ({ ...prev, current: { ...prev.current, ...patch } }));

  function selectArchetype(key: string) {
    // Selecting a use case resets the scenario to its illustrative defaults —
    // levers-now at zero, planned at the library-informed settings, TYPICAL intensity.
    setState((prev) => ({ ...prev, current: defaultConfig(key) }));
    track("sim_use_case_switch", { use_case: key });
  }

  function selectModel(key: string) {
    patchConfig({ modelKey: key });
    track("sim_model_switch", { model: key, use_case: config.archetypeKey });
  }

  function toggleProvider(provider: string) {
    setState((prev) => {
      const list = prev.current.excludedProviders;
      const next = list.includes(provider) ? list.filter((p) => p !== provider) : [...list, provider];
      return { ...prev, current: { ...prev.current, excludedProviders: next } };
    });
    track("sim_provider_excluded", { provider, use_case: config.archetypeKey });
  }

  function setCurrency(currency: Currency) {
    setState((prev) => ({ ...prev, currency }));
    track("sim_currency_switch", { currency });
  }

  const valueEditTimer = useRef<number | null>(null);
  function editValue(key: "driver" | "rate" | "lowDriver" | "highDriver", value: number) {
    patchConfig({ overrides: { ...config.overrides, [key]: value } });
    // Debounced: a typed figure fires one event, not one per keystroke. The
    // event carries WHICH field changed, never the number itself.
    if (valueEditTimer.current) window.clearTimeout(valueEditTimer.current);
    valueEditTimer.current = window.setTimeout(() => {
      track("sim_value_edit", { field: key, use_case: config.archetypeKey });
    }, 800);
  }

  function editLever(which: "now" | "planned", key: keyof Levers, value: number) {
    setState((prev) => ({
      ...prev,
      current: {
        ...prev.current,
        levers: {
          ...prev.current.levers,
          [which]: { ...prev.current.levers[which], [key]: value },
        },
      },
    }));
  }

  function handleImport(result: ScenarioImport) {
    if (!result.ok) return; // the toolbar shows the plain-language error
    setState({ current: result.current, ramp: result.ramp, currency: result.currency });
  }

  /* ------------------------------------------------------------------ *
   * Derivation — one path for the page, the print summary and the export.
   * ------------------------------------------------------------------ */
  const derived = useMemo(() => {
    const s = deriveCase(config, state.currency);
    const priors = tokenPrior(s.a.priorKey);
    const m = resolveModel(config.modelKey);
    const signal = forwardSignal(m.provider);
    const advisory = modelChangeAdvisory(s.a, config.modelKey, priors.defaultModel);
    const line = budgetLine(s.a.key, s.band, s.counted, state.ramp);
    // Per-lever savings + the combined planned figure (A3), in display currency.
    const f = currencyFactor(state.currency);
    const savings = {
      cache: leverSaving(config.modelKey, s.u.inputM, s.u.outputM, "cache", config.levers.planned.cache, s.a.workloadClass, s.band.floorModelKey) * f,
      batch: leverSaving(config.modelKey, s.u.inputM, s.u.outputM, "batch", config.levers.planned.batch, s.a.workloadClass, s.band.floorModelKey) * f,
      route: leverSaving(config.modelKey, s.u.inputM, s.u.outputM, "route", config.levers.planned.route, s.a.workloadClass, s.band.floorModelKey) * f,
    };
    const baseL1 = inferenceCost(config.modelKey, s.u.inputM, s.u.outputM, NO_LEVERS);
    const plannedRaw = inferenceCost(config.modelKey, s.u.inputM, s.u.outputM, config.levers.planned, s.band.floorModelKey);
    const plannedL1 = clampToEnvelope(baseL1, plannedRaw, s.a.workloadClass).cost;
    const plannedCost = plannedL1 * f + s.band.perUseRun + s.band.monthlyFixed;
    return { s, m, signal, advisory, line, savings, plannedCost };
  }, [config, state.ramp, state.currency]);

  // The verdict STATE is a funnel signal — fire once per distinct state
  // reached, and only after URL hydration (a shared link's verdict, not the default's).
  const lastVerdict = useRef<string | null>(null);
  useEffect(() => {
    if (!hydrated) return;
    const klass = derived.s.verdict.klass;
    if (lastVerdict.current !== klass) {
      lastVerdict.current = klass;
      track("sim_verdict_state", { verdict: klass, use_case: config.archetypeKey });
    }
  }, [derived.s.verdict.klass, config.archetypeKey, hydrated]);

  return (
    <div className="min-h-screen bg-paper text-ink">
      {/* Skip link (A6) — the verdict is what a keyboard user came for. */}
      <a
        href="#bottom-line"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-accent focus:px-4 focus:py-2 focus:text-white"
      >
        {A11Y.skipToVerdict}
      </a>
      <div className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        {/* One-page board summary — print only; the walk below is screen only. */}
        <PrintSummary s={derived.s} line={derived.line} />

        <div className="print:hidden">
          <SimHeader />

          <div className="mt-4 flex justify-end">
            <SimToolbar state={state} summary={derived.s} line={derived.line} onImport={handleImport} />
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
              excludedProviders={config.excludedProviders}
              onToggleProvider={toggleProvider}
              currency={state.currency}
              onCurrency={setCurrency}
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
                cur={state.currency}
              />
              <Q3Levers
                levers={config.levers}
                caps={leverCaps(derived.s.a)}
                clamped={derived.s.band.leverClamped}
                savings={derived.savings}
                plannedCost={derived.plannedCost}
                currentCost={derived.s.band.today}
                cur={state.currency}
                onChange={editLever}
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
                cur={state.currency}
              />
              <BudgetCard
                line={derived.line}
                ramp={state.ramp}
                cur={state.currency}
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
                coverage={derived.s.coverage}
                stressCoverage={derived.s.stressCoverage}
                cur={state.currency}
              />
              <SimCta useCaseKey={config.archetypeKey} verdictKlass={derived.s.verdict.klass} />
            </main>
          </div>

          <AssumptionsDrawer />
          <SimFooter asOf={forwardSignalAsOf} />
        </div>
      </div>
    </div>
  );
}
