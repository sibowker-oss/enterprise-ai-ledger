/**
 * The first-year budget line (CTO review item 2): one-off build band
 * integrity, the adoption ramp, cumulative cost vs value, payback month —
 * pinned on the code-assistant default state.
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "@/lib/simulator/archetypes";
import { adoptionRampDefault, oneOffBuild, oneOffBuildAsOf, rawOneOffBuildBands } from "@/lib/simulator/data";
import { adoptionAt, budgetLine, clampRamp, DEFAULT_RAMP } from "@/lib/simulator/budget";
import { deriveCase } from "@/lib/simulator/derive";
import { defaultConfig } from "@/lib/simulator/urlState";

describe("one-off build band integrity (no invented numbers in code)", () => {
  it("every archetype has a dated, ordered band", () => {
    expect(oneOffBuildAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const a of ARCHETYPES) {
      const b = oneOffBuild(a.key);
      expect(b.low, a.key).toBeGreaterThan(0);
      expect(b.low, a.key).toBeLessThanOrEqual(b.mid);
      expect(b.mid, a.key).toBeLessThanOrEqual(b.high);
    }
  });

  it("carries no bands for unknown archetypes (typo guard)", () => {
    const keys = new Set(ARCHETYPES.map((a) => a.key));
    for (const k of Object.keys(rawOneOffBuildBands)) {
      expect(keys.has(k), `stray one-off band: ${k}`).toBe(true);
    }
    expect(() => oneOffBuild("nope")).toThrow();
  });
});

describe("the adoption ramp", () => {
  it("default is 50% month 1 → 100% by month 4, from the reference data", () => {
    expect(adoptionRampDefault()).toEqual({ startPct: 50, fullMonth: 4 });
    expect(adoptionAt(1, DEFAULT_RAMP)).toBeCloseTo(0.5, 9);
    expect(adoptionAt(2, DEFAULT_RAMP)).toBeCloseTo(2 / 3, 9);
    expect(adoptionAt(3, DEFAULT_RAMP)).toBeCloseTo(5 / 6, 9);
    for (let m = 4; m <= 12; m++) expect(adoptionAt(m, DEFAULT_RAMP)).toBe(1);
  });

  it("degenerate ramps stay sane", () => {
    expect(adoptionAt(1, { startPct: 100, fullMonth: 4 })).toBe(1);
    expect(adoptionAt(1, { startPct: 30, fullMonth: 1 })).toBe(1);
    expect(clampRamp({ startPct: -20, fullMonth: 99 })).toEqual({ startPct: 0, fullMonth: 12 });
  });
});

describe("code-assistant default budget line (snapshot)", () => {
  const s = deriveCase(defaultConfig("code_assistant"));
  const line = budgetLine("code_assistant", s.band, s.counted, DEFAULT_RAMP);

  it("splits one-off build from monthly run", () => {
    expect(line.build).toEqual({ low: 5000, mid: 15000, high: 40000 });
    expect(line.monthlyRun).toBeCloseTo(s.band.today, 9);
  });

  it("cumulatives start at the mid build and rise monotonically", () => {
    expect(line.months).toHaveLength(12);
    expect(line.months[0].cumCost).toBeCloseTo(line.build.mid + line.months[0].cost, 9);
    for (let i = 1; i < 12; i++) {
      expect(line.months[i].cumCost).toBeGreaterThan(line.months[i - 1].cumCost);
      expect(line.months[i].cumValue).toBeGreaterThanOrEqual(line.months[i - 1].cumValue);
    }
  });

  it("the AI slice ramps with adoption; the run cost is carried in full", () => {
    const m1 = line.months[0];
    expect(m1.cost).toBeCloseTo(s.band.todayAiUsage * 0.5 + s.band.buildAndRun, 6);
  });

  it("pays back in month 1 on the default numbers (value dwarfs cost at 17× coverage)", () => {
    expect(line.paybackMonth).toBe(1);
    expect(Math.round(line.firstYearCost)).toBe(71266);
    expect(Math.round(line.firstYearValue)).toBe(1544400);
  });
});

describe("payback responds to the case, not just the ramp", () => {
  it("borderline cases don't pay back in year 1 (knowledge search at defaults)", () => {
    const s = deriveCase(defaultConfig("rag_search"));
    const line = budgetLine("rag_search", s.band, s.counted, DEFAULT_RAMP);
    expect(line.paybackMonth).toBeNull();
  });

  it("a faster ramp never delays payback", () => {
    for (const key of ["claims", "reconciliation", "legal_review"]) {
      const s = deriveCase(defaultConfig(key));
      const slow = budgetLine(key, s.band, s.counted, { startPct: 20, fullMonth: 8 });
      const fast = budgetLine(key, s.band, s.counted, { startPct: 100, fullMonth: 1 });
      if (slow.paybackMonth != null) {
        expect(fast.paybackMonth).not.toBeNull();
        expect(fast.paybackMonth!).toBeLessThanOrEqual(slow.paybackMonth);
      }
    }
  });
});
