/**
 * Fixed-floor cost model (CTO update v2, 0.3): three plain buckets that
 * always reconcile, sane 1-unit deployments (the "$13/mo contact centre"
 * inversion is dead), and plural-safe copy ("You have 1 agent").
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES, ARCHETYPE_BY_KEY } from "@/lib/simulator/archetypes";
import { monthlyFixedFloor, rawMonthlyFixedFloorBands, tokenPrior } from "@/lib/simulator/data";
import { costBand, fixedFloorCost, NO_LEVERS, perUseRunCost, usage } from "@/lib/simulator/engine";
import { deriveCase } from "@/lib/simulator/derive";
import { defaultConfig } from "@/lib/simulator/urlState";
import { q1SizingSentence, unitsPhrase } from "@/lib/simulator/copy";

const priorsFor = (priorKey: string) => {
  const p = tokenPrior(priorKey);
  return { input: p.input, output: p.output, fanOut: p.fanOut };
};

describe("the three buckets reconcile on every archetype", () => {
  it.each(ARCHETYPES.map((a) => [a.key, a] as const))("%s", (_key, a) => {
    const u = usage(a, a.units, 2, priorsFor(a.priorKey));
    const band = costBand(a, a.defaultModelKey, a.units, u.inputM, u.outputM, NO_LEVERS);
    expect(band.today).toBeCloseTo(band.todayAiUsage + band.perUseRun + band.monthlyFixed, 6);
    expect(band.floor).toBeCloseTo(band.floorAiUsage + band.perUseRun + band.monthlyFixed, 6);
    expect(band.repriced).toBeCloseTo(band.repricedAiUsage + band.perUseRun + band.monthlyFixed, 6);
    expect(band.buildAndRun).toBeCloseTo(band.monthlyFixed + band.perUseRun, 6);
    expect(band.monthlyFixed).toBeGreaterThan(0);
  });

  it("every archetype has an ordered floor band, and none is stray", () => {
    const keys = new Set(ARCHETYPES.map((a) => a.key));
    for (const [k, b] of Object.entries(rawMonthlyFixedFloorBands)) {
      expect(keys.has(k), `stray floor band: ${k}`).toBe(true);
      expect(b.low).toBeGreaterThan(0);
      expect(b.low).toBeLessThanOrEqual(b.mid);
      expect(b.mid).toBeLessThanOrEqual(b.high);
    }
    for (const a of ARCHETYPES) expect(monthlyFixedFloor(a.key, "mid")).toBeGreaterThan(0);
  });
});

describe("a 1-unit deployment shows a sane fixed-floor cost (DONE-WHEN)", () => {
  it("contact-centre summaries at 1 agent carry the platform floor, not $13/mo", () => {
    const a = ARCHETYPE_BY_KEY.summarisation;
    const u = usage(a, 1, 2, priorsFor(a.priorKey));
    const band = costBand(a, a.defaultModelKey, 1, u.inputM, u.outputM, NO_LEVERS);
    expect(band.monthlyFixed).toBe(6000);
    expect(band.today).toBeGreaterThanOrEqual(6000);
  });

  it("scale economics run the right way now: cost per unit FALLS with scale", () => {
    for (const a of ARCHETYPES) {
      const perUnitAt = (units: number) => {
        const u = usage(a, units, 2, priorsFor(a.priorKey));
        const band = costBand(a, a.defaultModelKey, units, u.inputM, u.outputM, NO_LEVERS);
        return band.today / units;
      };
      expect(perUnitAt(1), a.key).toBeGreaterThan(perUnitAt(a.units));
    }
  });

  it("the worked example's build-and-run total is preserved (200 devs → $2,000/mo)", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    expect(fixedFloorCost(a) + perUseRunCost(a, 200)).toBe(2000);
  });
});

describe("pluralisation (0.3: 'You have 1 agents' is dead)", () => {
  it("singular units read as singular", () => {
    const a = ARCHETYPE_BY_KEY.summarisation;
    expect(unitsPhrase(a, 1)).toBe("1 agent");
    const u = usage(a, 1, 2, priorsFor(a.priorKey));
    expect(q1SizingSentence(a, 1, u)).toMatch(/^You have 1 agent\./);
  });

  it("per-transaction singulars carry their period", () => {
    expect(unitsPhrase(ARCHETYPE_BY_KEY.claims, 1)).toBe("1 claim a month");
    expect(unitsPhrase(ARCHETYPE_BY_KEY.voice_agents, 1)).toBe("1 call minute a month");
  });

  it("plurals are unchanged", () => {
    expect(unitsPhrase(ARCHETYPE_BY_KEY.summarisation, 800)).toBe("800 agents");
  });
});

describe("the budget line runs on the buckets", () => {
  it("month-1 cost = per-use share at half adoption + the full fixed floor", () => {
    const s = deriveCase(defaultConfig("code_assistant"));
    expect(s.band.monthlyFixed).toBe(1000);
    // (AI + per-use) × 50% + fixed, from the default ramp's month 1.
    const expected = (s.band.todayAiUsage + s.band.perUseRun) * 0.5 + s.band.monthlyFixed;
    expect(expected).toBeGreaterThan(s.band.monthlyFixed);
  });
});
