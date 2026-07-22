/**
 * "Save this case" (A1 — replaces in-simulator pin-and-compare): a versioned
 * UseCaseScenario JSON carrying all inputs, the computed outputs, and the
 * data/engine versions that produced them. This is the future handoff record
 * into the Ledger/diagnostic. Import re-derives everything from the inputs
 * through the same engine — outputs in the file are a record, never trusted.
 */
import type { CaseSummary } from "./derive";
import type { BudgetLine, AdoptionRamp } from "./budget";
import { clampRamp } from "./budget";
import { sanitiseConfig, type Currency, type SimConfig, type SimState } from "./urlState";
import { DATA_VERSION, ENGINE_VERSION } from "./versions";

export const SCENARIO_SCHEMA = "hepburn.investment-case.use-case-scenario";
export const SCENARIO_VERSION = "1.0";

function countUnverifiedInputs(config: SimConfig): number {
  let count = 0;
  if (config.confidenceTags.units !== "system") count++;
  if (config.confidenceTags.intensity !== "system") count++;
  if (config.confidenceTags.maturity !== "system") count++;
  if (config.confidenceTags.adoption !== "system") count++;
  if (config.confidenceTags.realisation !== "system") count++;
  if (config.confidenceTags.reliability !== "system") count++;
  return count;
}

export interface UseCaseScenario {
  schema: typeof SCENARIO_SCHEMA;
  version: string;
  engineVersion: string;
  dataVersion: string;
  /** Client-side timestamp at export (informational only). */
  exportedAt: string | null;
  currency: Currency;
  ramp: AdoptionRamp;
  inputs: SimConfig;
  readStatus: "triage";
  unverifiedInputCount: number;
  /** Computed at export time — a record for the reader, re-derived on import. */
  outputs: {
    useCase: string;
    costMonthly: { floor: number; today: number; priceRise: number; monthlyFixed: number; perUseRun: number };
    valueMonthly: { low: number; likely: number; high: number; countedPct: number; counted: number };
    verdict: { state: string; label: string };
    marginOfSafety: number;
    oneOffBuild: { low: number; mid: number; high: number };
    paybackMonth: number | null;
    firstYear: { cost: number; value: number };
  };
}

export function buildScenario(
  state: SimState,
  s: CaseSummary,
  line: BudgetLine,
  exportedAt: string | null,
): UseCaseScenario {
  const unverifiedCount = countUnverifiedInputs(state.current);
  return {
    schema: SCENARIO_SCHEMA,
    version: SCENARIO_VERSION,
    engineVersion: ENGINE_VERSION,
    dataVersion: DATA_VERSION,
    exportedAt,
    currency: state.currency,
    ramp: state.ramp,
    inputs: state.current,
    readStatus: "triage",
    unverifiedInputCount: unverifiedCount,
    outputs: {
      useCase: s.a.label,
      costMonthly: {
        floor: s.band.floor,
        today: s.band.today,
        priceRise: s.band.repriced,
        monthlyFixed: s.band.monthlyFixed,
        perUseRun: s.band.perUseRun,
      },
      valueMonthly: {
        low: s.value.low,
        likely: s.value.base,
        high: s.value.high,
        countedPct: s.countedPct,
        counted: s.counted.base,
      },
      verdict: { state: s.verdict.klass, label: s.verdict.label },
      marginOfSafety: s.coverage,
      oneOffBuild: line.build,
      paybackMonth: line.paybackMonth,
      firstYear: { cost: line.firstYearCost, value: line.firstYearValue },
    },
  };
}

/** Result of an import attempt — a sanitised state or a plain-language error. */
export type ScenarioImport =
  | { ok: true; current: SimConfig; ramp: AdoptionRamp; currency: Currency }
  | { ok: false; error: string };

/**
 * Parse a saved scenario. Inputs run through the same sanitiser as URL params
 * (clamped to reference-data bounds); outputs are ignored and re-derived.
 */
export function parseScenario(json: string): ScenarioImport {
  let raw: unknown;
  try {
    raw = JSON.parse(json);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  const s = raw as Partial<UseCaseScenario>;
  if (s.schema !== SCENARIO_SCHEMA) {
    return { ok: false, error: "That file isn't a saved case from this tool." };
  }
  if (typeof s.version !== "string" || s.version.split(".")[0] !== SCENARIO_VERSION.split(".")[0]) {
    return { ok: false, error: `That case was saved with an incompatible version (${s.version ?? "unknown"}).` };
  }
  const i = (s.inputs ?? {}) as Partial<SimConfig>;
  const current = sanitiseConfig({
    archetypeKey: typeof i.archetypeKey === "string" ? i.archetypeKey : null,
    units: typeof i.units === "number" ? i.units : null,
    intensity: typeof i.intensity === "number" ? i.intensity : null,
    maturity: typeof i.maturity === "number" ? i.maturity : null,
    modelKey: typeof i.modelKey === "string" ? i.modelKey : null,
    cache: typeof i.levers?.now?.cache === "number" ? i.levers.now.cache : null,
    batch: typeof i.levers?.now?.batch === "number" ? i.levers.now.batch : null,
    route: typeof i.levers?.now?.route === "number" ? i.levers.now.route : null,
    plannedCache: typeof i.levers?.planned?.cache === "number" ? i.levers.planned.cache : null,
    plannedBatch: typeof i.levers?.planned?.batch === "number" ? i.levers.planned.batch : null,
    plannedRoute: typeof i.levers?.planned?.route === "number" ? i.levers.planned.route : null,
    driver: typeof i.overrides?.driver === "number" ? i.overrides.driver : null,
    rate: typeof i.overrides?.rate === "number" ? i.overrides.rate : null,
    lowDriver: typeof i.overrides?.lowDriver === "number" ? i.overrides.lowDriver : null,
    highDriver: typeof i.overrides?.highDriver === "number" ? i.overrides.highDriver : null,
    adoption: typeof i.adoption === "number" ? i.adoption : null,
    realisation: typeof i.realisation === "number" ? i.realisation : null,
    reliability: typeof i.reliability === "number" ? i.reliability : null,
    buildOverride: typeof i.buildOverride === "number" ? i.buildOverride : null,
    // Legacy saved cases carried a single `haircut` — map it onto realisation.
    haircut: typeof (i as { haircut?: number }).haircut === "number" ? (i as { haircut: number }).haircut : null,
    excludedProviders: Array.isArray(i.excludedProviders)
      ? i.excludedProviders.filter((x): x is string => typeof x === "string")
      : null,
    confidenceUnits: typeof i.confidenceTags?.units === "string" ? i.confidenceTags.units : null,
    confidenceIntensity: typeof i.confidenceTags?.intensity === "string" ? i.confidenceTags.intensity : null,
    confidenceMaturity: typeof i.confidenceTags?.maturity === "string" ? i.confidenceTags.maturity : null,
    confidenceAdoption: typeof i.confidenceTags?.adoption === "string" ? i.confidenceTags.adoption : null,
    confidenceRealisation: typeof i.confidenceTags?.realisation === "string" ? i.confidenceTags.realisation : null,
    confidenceReliability: typeof i.confidenceTags?.reliability === "string" ? i.confidenceTags.reliability : null,
  });
  if (!current) {
    return { ok: false, error: "That case names a use case this version doesn't know." };
  }
  const ramp = clampRamp({
    startPct: typeof s.ramp?.startPct === "number" ? s.ramp.startPct : 50,
    fullMonth: typeof s.ramp?.fullMonth === "number" ? s.ramp.fullMonth : 4,
  });
  return { ok: true, current, ramp, currency: s.currency === "aud" ? "aud" : "usd" };
}
