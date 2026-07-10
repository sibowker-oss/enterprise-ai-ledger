/**
 * Investment-Case Simulator — engine reconciliation.
 *
 * Pins the selectors to the validated worked example (handoff §1, brief HARD
 * RULE): code-assistant, mid usage, before levers →
 *   $8,316 AI usage · $10,316 today · $52 per seat · $19,464 if prices rise ·
 *   $282 on the cheapest model · band ordering floor ≤ today ≤ repriced.
 * If a selector or a reference figure drifts, this fails — the point of the test.
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES, ARCHETYPE_BY_KEY } from "@/lib/simulator/archetypes";
import { MODEL_KEYS } from "@/lib/simulator/models";
import { tokenPrior } from "@/lib/simulator/data";
import {
  aiSharePct,
  AI_LED_THRESHOLD,
  costBand,
  DEFAULT_LEVERS,
  inferenceCost,
  maturityBand,
  NO_LEVERS,
  usage,
  valueRange,
  verdict,
} from "@/lib/simulator/engine";

const priorsFor = (priorKey: string) => {
  const p = tokenPrior(priorKey);
  return { input: p.input, output: p.output, fanOut: p.fanOut };
};

describe("maturity band (Q1 setup slider)", () => {
  it("interpolates high→low across five steps, mid at index 2", () => {
    expect(maturityBand({ low: 3000, mid: 6000, high: 12000 })).toEqual([
      12000, 9000, 6000, 4500, 3000,
    ]);
  });

  it("is monotonically non-increasing bloated → lean", () => {
    for (const a of ARCHETYPES) {
      const band = maturityBand(tokenPrior(a.priorKey).input);
      for (let i = 1; i < band.length; i++) {
        expect(band[i]).toBeLessThanOrEqual(band[i - 1]);
      }
    }
  });
});

describe("code-assistant worked example (before levers)", () => {
  const a = ARCHETYPE_BY_KEY.code_assistant;
  const units = 200;
  // The validated 18 Jun worked example runs at 60 uses/dev/day — now the
  // HEAVY end of the intensity slider, not the default (CTO review item 10).
  // Passing it explicitly keeps the worked example pinned while defaults
  // anchor at the library's typical rate (30/day).
  const u = usage(a, units, 2, priorsFor(a.priorKey), 60 * 21);

  it("sizes 200 devs to 1,512M input + 252M output tokens/month", () => {
    expect(u.monthlyTx).toBe(252_000);
    expect(u.inputM).toBeCloseTo(1512, 6);
    expect(u.outputM).toBeCloseTo(252, 6);
  });

  it("AI usage is $8,316 on Claude Sonnet 4.6", () => {
    expect(inferenceCost("claude_sonnet_4_6", u.inputM, u.outputM, NO_LEVERS)).toBeCloseTo(8316, 6);
  });

  it("reproduces the full band: $10,316 today, $19,464 repriced, $282 floor inference", () => {
    const band = costBand(a, "claude_sonnet_4_6", units, u.inputM, u.outputM, NO_LEVERS);
    expect(band.todayAiUsage).toBeCloseTo(8316, 6);
    expect(band.today).toBeCloseTo(10316, 6);
    expect(Math.round(band.today / units)).toBe(52); // $52 per seat
    expect(Math.round(band.repriced)).toBe(19464);
    expect(Math.round(band.repriced / units)).toBe(97); // $97 per seat repriced
    expect(Math.round(band.floorAiUsage)).toBe(282); // DeepSeek floor
    expect(band.buildAndRun).toBe(2000);
  });

  it("keeps band ordering floor ≤ today ≤ repriced", () => {
    const band = costBand(a, "claude_sonnet_4_6", units, u.inputM, u.outputM, NO_LEVERS);
    expect(band.floor).toBeLessThanOrEqual(band.today);
    expect(band.today).toBeLessThanOrEqual(band.repriced);
  });

  it("is inference-led (AI usage dominates today's cost)", () => {
    const band = costBand(a, "claude_sonnet_4_6", units, u.inputM, u.outputM, NO_LEVERS);
    expect(aiSharePct(band)).toBeGreaterThanOrEqual(AI_LED_THRESHOLD);
  });
});

describe("enterprise RAG (run-cost-dominated archetype)", () => {
  const a = ARCHETYPE_BY_KEY.rag_search;

  it("prices 1,000 seats to $2,856 inference on Gemini 2.5 Pro (worked example)", () => {
    const u = usage(a, 1000, 2, priorsFor(a.priorKey));
    expect(u.inputM).toBeCloseTo(1512, 6);
    expect(u.outputM).toBeCloseTo(134.4, 6);
    expect(inferenceCost("gemini_2_5_pro", u.inputM, u.outputM, null)).toBeCloseTo(2856, 6);
  });

  it("tells the opposite story to code-assistant: run-cost, not AI, dominates", () => {
    const u = usage(a, a.units, 2, priorsFor(a.priorKey));
    const band = costBand(a, a.defaultModelKey, a.units, u.inputM, u.outputM, NO_LEVERS);
    expect(aiSharePct(band)).toBeLessThan(AI_LED_THRESHOLD);
  });
});

describe("levers only cut cost (never increase it)", () => {
  it("optimised inference ≤ base inference for every archetype", () => {
    for (const a of ARCHETYPES) {
      const u = usage(a, a.units, 2, priorsFor(a.priorKey));
      const base = inferenceCost(a.defaultModelKey, u.inputM, u.outputM, null);
      const opt = inferenceCost(a.defaultModelKey, u.inputM, u.outputM, DEFAULT_LEVERS);
      expect(opt).toBeLessThanOrEqual(base + 1e-9);
    }
  });
});

describe("band ordering holds across all archetypes, models and lever states", () => {
  it("floor ≤ today ≤ repriced everywhere", () => {
    for (const a of ARCHETYPES) {
      const u = usage(a, a.units, 2, priorsFor(a.priorKey));
      for (const mk of MODEL_KEYS) {
        for (const levers of [NO_LEVERS, DEFAULT_LEVERS]) {
          const band = costBand(a, mk, a.units, u.inputM, u.outputM, levers);
          expect(band.floor).toBeLessThanOrEqual(band.today + 1e-9);
          expect(band.today).toBeLessThanOrEqual(band.repriced + 1e-9);
        }
      }
    }
  });
});

describe("Q4 value is always a range, and Q5 verdict is conditional", () => {
  it("returns bear < base < bull and never a single number", () => {
    for (const a of ARCHETYPES) {
      const u = usage(a, a.units, 2, priorsFor(a.priorKey));
      const v = valueRange(a, a.units, u.monthlyTx, {});
      expect(v.low).toBeLessThan(v.base);
      expect(v.base).toBeLessThan(v.high);
    }
  });

  it("verdict maps value vs band to one of three plain states", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    const u = usage(a, a.units, 2, priorsFor(a.priorKey));
    const band = costBand(a, a.defaultModelKey, a.units, u.inputM, u.outputM, DEFAULT_LEVERS);
    expect(verdict(band.repriced + 1, band, a).klass).toBe("good");
    expect(verdict((band.today + band.repriced) / 2, band, a).klass).toBe("conditional");
    expect(verdict(band.today - 1, band, a).klass).toBe("marginal");
  });
});
