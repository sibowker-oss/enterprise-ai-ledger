/**
 * CTO-review (2026-07-10) engine changes, pinned:
 *  - default usage intensity = TYPICAL (library mid), heavy end still reachable
 *  - perTx value priced per business event (fan-out no longer inflates value)
 *  - the realisation haircut applied before the verdict
 *  - the 4-state verdict (a clear no is a no)
 *  - break-even restated in human units
 *  - the new default-state snapshot (code assistant at 30 uses/dev/day)
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES, ARCHETYPE_BY_KEY, txWord, unitWord } from "@/lib/simulator/archetypes";
import { tokenPrior } from "@/lib/simulator/data";
import {
  applyHaircut,
  breakEvenHuman,
  costBand,
  intensityBand,
  NO_LEVERS,
  txPerUnitMonthFor,
  usage,
  valueRange,
  verdict,
} from "@/lib/simulator/engine";
import { deriveCase } from "@/lib/simulator/derive";
import { defaultConfig } from "@/lib/simulator/urlState";

const priorsFor = (priorKey: string) => {
  const p = tokenPrior(priorKey);
  return { input: p.input, output: p.output, fanOut: p.fanOut };
};

describe("usage intensity defaults to typical, heavy end reachable", () => {
  it("code assistant: band 10/30/80 per day; default tx = 30/day; slider top = worked example's 60", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    const band = intensityBand(a)!;
    expect([band.low, band.mid, band.high]).toEqual([10, 30, 80]);
    expect(band.period).toBe("day");
    expect(txPerUnitMonthFor(a, band.mid)).toBe(a.txPerUnitMonth); // default ≡ typical
    expect(txPerUnitMonthFor(a, 60)).toBe(60 * 21); // the 18 Jun worked example stays reachable
    expect(band.high).toBeGreaterThanOrEqual(60);
  });

  it("weekly archetypes convert per-week rates (deep research 8/wk → 32/mo)", () => {
    const a = ARCHETYPE_BY_KEY.deep_research;
    expect(txPerUnitMonthFor(a, 8)).toBe(32);
  });

  it("per-transaction archetypes have no intensity band (units ARE the volume)", () => {
    expect(intensityBand(ARCHETYPE_BY_KEY.claims)).toBeNull();
    expect(txPerUnitMonthFor(ARCHETYPE_BY_KEY.claims, null)).toBe(1);
  });

  it("every archetype's committed default equals its library typical rate", () => {
    for (const a of ARCHETYPES) {
      const band = intensityBand(a);
      if (band) expect(txPerUnitMonthFor(a, band.mid)).toBe(a.txPerUnitMonth);
    }
  });
});

describe("the new default state (code assistant, 30 uses/dev/day, before levers)", () => {
  const a = ARCHETYPE_BY_KEY.code_assistant;
  const u = usage(a, 200, 2, priorsFor(a.priorKey)); // default tx = 630/dev/mo

  it("sizes 200 devs to 126k requests, 756M input + 126M output tokens/month", () => {
    expect(u.monthlyTx).toBe(126_000);
    expect(u.inputM).toBeCloseTo(756, 6);
    expect(u.outputM).toBeCloseTo(126, 6);
  });

  it("costs $4,158 AI usage / $6,158 today / ~$10,732 repriced on Sonnet", () => {
    const band = costBand(a, "claude_sonnet_4_6", 200, u.inputM, u.outputM, NO_LEVERS);
    expect(band.todayAiUsage).toBeCloseTo(4158, 6);
    expect(band.today).toBeCloseTo(6158, 6);
    expect(Math.round(band.repriced)).toBe(10732);
    expect(Math.round(band.today / 200)).toBe(31); // ~$31/dev/mo at typical intensity
  });
});

describe("perTx value is priced per business event, not per model call", () => {
  it("contact-centre summaries: 800 agents × 840 calls × $0.25 = $168k (fan-out 2 must not double it)", () => {
    const a = ARCHETYPE_BY_KEY.summarisation;
    const businessTx = a.units * a.txPerUnitMonth; // 672,000 calls
    const v = valueRange(a, a.units, businessTx, {});
    expect(v.base).toBeCloseTo(168_000, 6);
  });

  it("claims: 40k claims × $4 = $160k (fan-out 2.5 must not inflate it)", () => {
    const a = ARCHETYPE_BY_KEY.claims;
    const v = valueRange(a, a.units, a.units * a.txPerUnitMonth, {});
    expect(v.base).toBeCloseTo(160_000, 6);
  });
});

describe("the realisation haircut", () => {
  it("scales the whole range and clamps to 0–100%", () => {
    const r = { low: 60, base: 100, high: 140 };
    expect(applyHaircut(r, 60)).toEqual({ low: 36, base: 60, high: 84 });
    expect(applyHaircut(r, 0).base).toBe(0);
    expect(applyHaircut(r, 250).base).toBe(100);
  });
});

describe("the 4-state verdict (CTO review item 6)", () => {
  const a = ARCHETYPE_BY_KEY.code_assistant;
  const u = usage(a, 200, 2, priorsFor(a.priorKey));
  const band = costBand(a, "claude_sonnet_4_6", 200, u.inputM, u.outputM, NO_LEVERS);

  it("keeps the two upper states", () => {
    expect(verdict(band.repriced + 1, band, a).klass).toBe("good");
    expect(verdict(band.today * 1.3, band, a).klass).toBe("conditional"); // 1.3× today < repriced here
  });

  it("splits the old low state at half of today's cost", () => {
    expect(verdict(band.today * 0.6, band, a).klass).toBe("marginal"); // too close to call
    expect(verdict(band.today * 0.5, band, a).klass).toBe("marginal"); // boundary inclusive
    expect(verdict(band.today * 0.49, band, a).klass).toBe("no");
    expect(verdict(0, band, a).klass).toBe("no"); // $0 of value is a no, not "close"
  });

  it("a thin pass just over today's cost reads as too close to call, not a confident yes", () => {
    expect(verdict(band.today * 1.05, band, a).klass).toBe("marginal");
    expect(verdict(band.today * 1.2, band, a).klass).toBe("conditional");
  });

  it("the no state is worded as a plain no", () => {
    const v = verdict(0, band, a);
    expect(v.label).toBe("Doesn't pay on these numbers");
  });
});

describe("break-even in human units (CTO review item 3)", () => {
  it("code assistant: ~14 minutes per developer per week at 60% counted (before levers)", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    const u = usage(a, 200, 2, priorsFor(a.priorKey));
    const band = costBand(a, "claude_sonnet_4_6", 200, u.inputM, u.outputM, NO_LEVERS);
    const be = breakEvenHuman(a, band, 200, 126_000, {}, 60);
    expect(be.kind).toBe("minutesPerWeek");
    if (be.kind === "minutesPerWeek") {
      // repriced/0.6 ÷ (200 devs × $90/h × 52/12 weeks) × 60
      expect(be.minutes).toBeCloseTo(13.76, 1);
      expect(be.unit).toBe("developer");
    }
  });

  it("perTx break-evens use the business-event noun, not the seat noun", () => {
    expect(txWord(ARCHETYPE_BY_KEY.summarisation)).toBe("call");
    expect(txWord(ARCHETYPE_BY_KEY.deep_research)).toBe("report");
    expect(txWord(ARCHETYPE_BY_KEY.meeting_intelligence)).toBe("meeting-hour");
    const a = ARCHETYPE_BY_KEY.summarisation;
    const s = deriveCase(defaultConfig(a.key));
    expect(s.breakEven.kind).toBe("perTx");
    expect(s.breakEven.unit).toBe("call");
  });

  it("knowledge search reads per person, not 'per staff using it'", () => {
    expect(unitWord(ARCHETYPE_BY_KEY.rag_search)).toBe("person");
  });
});

describe("three-point value (A2: low/likely/high individually editable)", () => {
  const a = ARCHETYPE_BY_KEY.code_assistant;

  it("defaults prefill at ×0.6 / ×1.4 around likely", () => {
    const v = valueRange(a, 200, 126_000, {});
    expect(v.low).toBeCloseTo(v.base * 0.6, 6);
    expect(v.high).toBeCloseTo(v.base * 1.4, 6);
  });

  it("each point is independently editable — no fixed spread", () => {
    // 3 h/wk likely, but the buyer's own low is 1 h/wk and high is 4 h/wk.
    const v = valueRange(a, 200, 126_000, { lowDriver: 1, highDriver: 4 });
    const perHour = (200 * 90 * 52) / 12;
    expect(v.low).toBeCloseTo(perHour * 1, 6);
    expect(v.base).toBeCloseTo(perHour * 3, 6);
    expect(v.high).toBeCloseTo(perHour * 4, 6);
  });

  it("the stress read uses the LOW counted value against the price-rise case", () => {
    const s = deriveCase(defaultConfig(a.key));
    expect(s.stressCoverage).toBeCloseTo(s.counted.low / s.band.repriced, 6);
    expect(s.stressCoverage).toBeLessThan(s.coverage);
  });
});

describe("A2 verdict wording", () => {
  it("the middle band says prove-it-with-a-pilot, not 'get usage down'", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    const u = usage(a, 200, 2, priorsFor(a.priorKey));
    const band = costBand(a, "claude_sonnet_4_6", 200, u.inputM, u.outputM, NO_LEVERS);
    const v = verdict(band.today * 0.8, band, a);
    expect(v.klass).toBe("marginal");
    expect(v.condition).toMatch(/pilot/i);
  });
});

describe("the default-state portfolio story holds", () => {
  it("after the value-realism discount, weak cases surface honestly (some don't pay at all)", () => {
    const spread: Record<string, string[]> = { good: [], conditional: [], marginal: [], no: [] };
    for (const a of ARCHETYPES) {
      const s = deriveCase(defaultConfig(a.key));
      spread[s.verdict.klass].push(a.key);
    }
    // With the counted value at ~31% (adoption×realisation×reliability) and the
    // intrinsic cache baked into agentic/deep-research "doing now", the two
    // run-cost-heavy, low-value-density cases don't clear their cost at all; the
    // rest pay, but MANY at thin 1.1–1.5× margins (agentic coding lands ~1.4×
    // once its intrinsic caching is priced correctly). Field-realistic (MIT 2025).
    expect([...spread.no].sort()).toEqual(["rag_search", "voice_agents"]);
    expect(spread.marginal).toEqual([]);
    expect(spread.conditional).toEqual([]);
    expect(spread.good).toHaveLength(14);
  });
});
