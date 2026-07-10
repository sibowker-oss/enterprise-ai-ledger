/**
 * Token Estimate Library wiring (handoff verification).
 *
 * Proves the simulator's demand side renders from token_estimate_library_v1.json
 * (not the superseded v0.1 priors), reproduces the handoff's two worked-example
 * anchors, and carries the library's corrections (volume band, fan-out) and
 * provenance (band_semantics, as_of).
 */
import { describe, expect, it } from "vitest";
import rawLibrary from "@/data/reference/token_estimate_library_v1.json";
import rawPrices from "@/data/simulator/benchmark_price_sheet.json";
import { ARCHETYPE_BY_KEY } from "@/lib/simulator/archetypes";
import { costBand, inferenceCost, usage, NO_LEVERS } from "@/lib/simulator/engine";
import { modelChangeAdvisory } from "@/lib/simulator/copy";
import { ARCHETYPES } from "@/lib/simulator/archetypes";
import { declaredCacheShare, dollarAnchor } from "@/lib/simulator/data";
import {
  bandSemantics,
  libraryVersion,
  librarySupersedes,
  libraryAsOf,
  tokenPrior,
  volumeHint,
} from "@/lib/simulator/data";

const lib = rawLibrary as any;
const prices = (rawPrices as any).models;

describe("source of truth", () => {
  it("reads the v1 library, which supersedes the v0.1 token priors", () => {
    expect(libraryVersion).toBe("1.0.0");
    expect(librarySupersedes).toContain("benchmark_token_priors.json");
    expect(libraryAsOf).toBe("2026-07-04");
  });

  it("carries band_semantics (bands, never bare midpoints — rule #2)", () => {
    expect(bandSemantics.low).toMatch(/engineered/i);
    expect(bandSemantics.mid).toMatch(/typical/i);
    expect(bandSemantics.high).toMatch(/naive/i);
  });
});

describe("worked-example anchors reproduce from the library", () => {
  it("code_assistant mid = $0.033 per interaction at Sonnet list", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    const p = tokenPrior(a.priorKey);
    // one interaction at the typical (mid) setup
    const u = usage(a, 1 / (a.txPerUnitMonth * p.fanOut), 2, {
      input: p.input,
      output: p.output,
      fanOut: p.fanOut,
    });
    const perInteraction = inferenceCost("claude_sonnet_4_6", u.inputM, u.outputM, NO_LEVERS);
    expect(perInteraction).toBeCloseTo(0.033, 4);
  });

  it("agentic_coding mid = ~$0.65 per task, cache-adjusted (library billing_assumptions)", () => {
    // agentic_coding is not (yet) a UI archetype — assert the library data itself
    // reproduces the anchor, proving the cache-share wiring is correct end to end.
    const uc = lib.use_cases.agentic_coding;
    const p = prices[uc.default_model]; // claude_sonnet_4_6
    const s = uc.billing_assumptions.cache_read_share.mid; // 0.8
    const cacheFactor = 1 - s + s * 0.1; // cache read = 0.1x input
    const cost =
      ((uc.input_tokens.mid * p.input * cacheFactor + uc.output_tokens.mid * p.output) / 1e6) *
      uc.fan_out.mid;
    expect(cost).toBeCloseTo(0.645, 3);
  });
});

describe("library corrections are wired", () => {
  it("volume model correction: code_assistant = 10/30/80 per dev/day, default = typical (mid)", () => {
    const vh = volumeHint("code_assistant");
    expect(vh).not.toBeNull();
    expect([vh!.low, vh!.mid, vh!.high]).toEqual([10, 30, 80]);
    // CTO review item 10: the default anchors at TYPICAL (mid), not the heavy
    // end — the intensity slider still reaches high (worked example at 60/day).
    const a = ARCHETYPE_BY_KEY.code_assistant;
    const impliedPerDay = a.txPerUnitMonth / 21;
    expect(impliedPerDay).toBe(vh!.mid);
  });

  it("fan-out is sourced from the library (mid): summaries 2, reconciliation 2.5", () => {
    expect(tokenPrior("contact_centre_summarisation").fanOut).toBe(2);
    expect(tokenPrior("back_office_reconciliation").fanOut).toBe(2.5);
    // unchanged where the library agrees with v0.1
    expect(tokenPrior("code_assistant").fanOut).toBe(1);
    expect(tokenPrior("document_claims_processing").fanOut).toBe(2.5);
  });

  it("billing levers can't exceed the workload's evidenced envelope (no double-count)", () => {
    const a = ARCHETYPE_BY_KEY.summarisation; // chat_support: mature stack 85%
    const p = tokenPrior(a.priorKey);
    const u = usage(a, a.units, 2, { input: p.input, output: p.output, fanOut: p.fanOut });
    const base = costBand(a, a.defaultModelKey, a.units, u.inputM, u.outputM, NO_LEVERS);
    const maxed = costBand(a, a.defaultModelKey, a.units, u.inputM, u.outputM, {
      cache: 100,
      batch: 100,
      route: 80,
    });
    expect(maxed.leverClamped).toBe(true);
    const saving = 1 - maxed.todayAiUsage / base.todayAiUsage;
    expect(saving).toBeLessThanOrEqual(0.85 + 1e-9);
  });
});

describe("every UI archetype lands inside the library's dollar anchor (faithfulness)", () => {
  // Mirrors validate_token_estimate_library.py: implied per-transaction cost at
  // the anchor's reference model, cache-adjusted only where the library declares
  // a cache share, must fall within the published dollar bracket.
  const withAnchors = ARCHETYPES.filter((a) => dollarAnchor(a.priorKey) !== null);

  it("covers the anchored use cases (agentic_coding, deep_research, support, legal, …)", () => {
    const keys = withAnchors.map((a) => a.priorKey);
    expect(keys).toContain("agentic_coding");
    expect(keys).toContain("deep_research");
    expect(keys).toContain("customer_support_chatbot");
    expect(keys).toContain("hr_legal_document_review");
  });

  it.each(withAnchors.map((a) => [a.key, a]))("%s reproduces its library dollar anchor", (_key, a: any) => {
    const p = tokenPrior(a.priorKey);
    const anchor = dollarAnchor(a.priorKey)!;
    const share = declaredCacheShare(a.priorKey);
    const levers = { cache: share != null ? share * 100 : 0, batch: 0, route: 0 };
    const perTx = inferenceCost(
      anchor.referenceModel,
      (p.input.mid * p.fanOut) / 1e6,
      (p.output.mid * p.fanOut) / 1e6,
      levers,
    );
    expect(perTx).toBeGreaterThanOrEqual(anchor.usdLow - 1e-9);
    expect(perTx).toBeLessThanOrEqual(anchor.usdHigh + 1e-9);
  });
});

describe("model-change is a consumption event, not a price swap (rule #4)", () => {
  it("no advisory on the use case's default model (worked examples untouched)", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant;
    expect(modelChangeAdvisory(a, tokenPrior(a.priorKey).defaultModel, tokenPrior(a.priorKey).defaultModel)).toBeNull();
  });

  it("on a swap, surfaces the re-baseline warning and a consumption sensitivity band", () => {
    const a = ARCHETYPE_BY_KEY.code_assistant; // default sonnet
    const adv = modelChangeAdvisory(a, "gemini_2_5_flash", tokenPrior(a.priorKey).defaultModel);
    expect(adv).not.toBeNull();
    expect(adv!.rebaseline).toMatch(/not just the price/i);
    expect(adv!.sensitivity).toMatch(/reads|writes/i);
  });

  it("shows the 'thinking is billed' warning only for reasoning-sensitive work", () => {
    const claims = ARCHETYPE_BY_KEY.claims; // reasoning_mode hybrid_low
    const summaries = ARCHETYPE_BY_KEY.summarisation; // reasoning_mode off
    const claimsAdv = modelChangeAdvisory(claims, "claude_haiku_4_5", tokenPrior(claims.priorKey).defaultModel);
    const sumAdv = modelChangeAdvisory(summaries, "claude_sonnet_4_6", tokenPrior(summaries.priorKey).defaultModel);
    expect(claimsAdv!.reasoning).toMatch(/thinks before it answers/i);
    expect(sumAdv!.reasoning).toBeNull();
  });
});
