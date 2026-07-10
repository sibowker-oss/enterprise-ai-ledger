/**
 * "Save this case" (A1): the exported UseCaseScenario JSON round-trips —
 * inputs are re-sanitised through the same gate as URL params, outputs are a
 * record (never trusted), and junk files fail with a plain-language error.
 */
import { describe, expect, it } from "vitest";
import { budgetLine } from "@/lib/simulator/budget";
import { deriveCase } from "@/lib/simulator/derive";
import {
  buildScenario,
  parseScenario,
  SCENARIO_SCHEMA,
  SCENARIO_VERSION,
} from "@/lib/simulator/scenario";
import { defaultConfig, type SimState } from "@/lib/simulator/urlState";
import { DATA_VERSION, ENGINE_VERSION } from "@/lib/simulator/versions";

function makeState(): SimState {
  return {
    current: {
      ...defaultConfig("legal_review"),
      units: 55,
      intensity: 25,
      overrides: { driver: 4.5, rate: 150, lowDriver: 2, highDriver: 8 },
      haircut: 40,
      excludedProviders: ["deepseek"],
    },
    ramp: { startPct: 30, fullMonth: 6 },
    currency: "aud",
  };
}

describe("the exported scenario", () => {
  const state = makeState();
  const s = deriveCase(state.current, state.currency);
  const line = budgetLine(s.a.key, s.band, s.counted, state.ramp);
  const scenario = buildScenario(state, s, line, "2026-07-11T00:00:00.000Z");

  it("is versioned and stamped (engine + data versions)", () => {
    expect(scenario.schema).toBe(SCENARIO_SCHEMA);
    expect(scenario.version).toBe(SCENARIO_VERSION);
    expect(scenario.engineVersion).toBe(ENGINE_VERSION);
    expect(scenario.dataVersion).toBe(DATA_VERSION);
  });

  it("carries the computed outputs as a record", () => {
    expect(scenario.outputs.useCase).toBe("Contract / policy review");
    expect(scenario.outputs.costMonthly.today).toBeCloseTo(s.band.today, 6);
    expect(scenario.outputs.valueMonthly.counted).toBeCloseTo(s.counted.base, 6);
    expect(scenario.outputs.verdict.state).toBe(s.verdict.klass);
    expect(scenario.outputs.paybackMonth).toBe(line.paybackMonth);
  });

  it("round-trips: export → JSON → import reproduces the exact state (DONE-WHEN)", () => {
    const result = parseScenario(JSON.stringify(scenario));
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.current).toEqual(state.current);
      expect(result.ramp).toEqual(state.ramp);
      expect(result.currency).toBe("aud");
      // Re-deriving from the imported inputs reproduces the recorded outputs.
      const re = deriveCase(result.current, result.currency);
      expect(re.band.today).toBeCloseTo(scenario.outputs.costMonthly.today, 6);
      expect(re.verdict.klass).toBe(scenario.outputs.verdict.state);
    }
  });
});

describe("imports fail safely, in plain language", () => {
  it("rejects non-JSON", () => {
    const r = parseScenario("not json at all {");
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/isn't valid JSON/);
  });

  it("rejects a foreign JSON file", () => {
    const r = parseScenario(JSON.stringify({ hello: "world" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/isn't a saved case/);
  });

  it("rejects an incompatible major version", () => {
    const r = parseScenario(JSON.stringify({ schema: SCENARIO_SCHEMA, version: "9.0" }));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/incompatible version/);
  });

  it("sanitises hostile inputs through the same gate as URL params", () => {
    const state = makeState();
    const s = deriveCase(state.current, state.currency);
    const line = budgetLine(s.a.key, s.band, s.counted, state.ramp);
    const scenario = buildScenario(state, s, line, null);
    const tampered = {
      ...scenario,
      inputs: {
        ...scenario.inputs,
        units: -5,
        maturity: 99,
        modelKey: "fake_model",
        levers: { now: { cache: 999, batch: 999, route: 999 }, planned: { cache: 0, batch: 0, route: 0 } },
      },
    };
    const r = parseScenario(JSON.stringify(tampered));
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.current.units).toBe(1);
      expect(r.current.maturity).toBe(4);
      expect(r.current.modelKey).toBe("claude_sonnet_4_6");
      expect(r.current.levers.now.cache).toBeLessThanOrEqual(100);
    }
  });
});
