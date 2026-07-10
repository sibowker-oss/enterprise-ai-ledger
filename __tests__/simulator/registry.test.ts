/**
 * Assumptions registry + verification gate (CTO update v2, 0.1) and the
 * cheapest-you'd-consider floor (A4): no DRAFT/unverified data drives a
 * displayed default, unverified models are excluded from floor/routing but
 * stay selectable, and the floor recomputes honestly over the considered set.
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "@/lib/simulator/archetypes";
import {
  DATA_VERSION,
  isModelVerified,
  modelMeta,
  rawModelRecords,
  rawProviderFacts,
} from "@/lib/simulator/data";
import { MODEL_KEYS, MODELS, PICKER_PROVIDERS, VERIFIED_MODEL_KEYS, model } from "@/lib/simulator/models";
import { consideredFloorKey } from "@/lib/simulator/engine";

describe("the registry (0.1)", () => {
  it("carries a dataVersion and full provenance on every record", () => {
    expect(DATA_VERSION).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const key of Object.keys(rawModelRecords)) {
      const m = modelMeta(key);
      expect(m.sourceUrl, key).toMatch(/^https?:\/\//);
      expect(m.effectiveDate, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(["verified", "unverified", "historical"], key).toContain(m.verificationStatus);
    }
  });

  it("no DRAFT markers survive anywhere in the shipped records", () => {
    const json = JSON.stringify(rawModelRecords);
    expect(json).not.toMatch(/DRAFT/);
    expect(json).not.toMatch(/VERIFY against/);
  });

  it("every archetype DEFAULT model is verified (the build gate's core rule)", () => {
    for (const a of ARCHETYPES) {
      expect(isModelVerified(a.defaultModelKey), `${a.key} → ${a.defaultModelKey}`).toBe(true);
    }
  });

  it("unverified models stay selectable but are excluded from the floor set", () => {
    // Grok 3 / Grok 3 Mini: off xAI's current pricing page as of 2026-07-11.
    expect(MODEL_KEYS).toContain("grok_3");
    expect(model("grok_3").verified).toBe(false);
    expect(VERIFIED_MODEL_KEYS).not.toContain("grok_3");
    expect(VERIFIED_MODEL_KEYS).not.toContain("grok_3_mini");
    expect(VERIFIED_MODEL_KEYS.length).toBe(MODEL_KEYS.length - 2);
  });

  it("every picker provider has a facts record (jurisdiction + weights)", () => {
    for (const p of PICKER_PROVIDERS) {
      expect(rawProviderFacts[p as keyof typeof rawProviderFacts], p).toBeDefined();
    }
  });
});

describe("the cheapest-you'd-consider floor (A4)", () => {
  // Code-assistant worked-example mix: input-heavy 6:1.
  const inputM = 1512;
  const outputM = 252;

  it("picks the cheapest VERIFIED model at this mix", () => {
    expect(consideredFloorKey(inputM, outputM, [])).toBe("lfm2_24b_together");
  });

  it("recomputes when providers are excluded", () => {
    const withoutTogether = consideredFloorKey(inputM, outputM, ["together"]);
    expect(withoutTogether).toBe("mistral_small_3_2"); // next-cheapest verified at this mix
    const anzShortlist = consideredFloorKey(inputM, outputM, [
      "together",
      "deepseek",
      "zhipu",
      "moonshot",
      "minimax",
      "mistral",
      "xai",
    ]);
    // Only the tracked majors left — floor comes from one of them.
    expect(["gemini_2_5_flash", "claude_haiku_4_5", "gpt_5_5"]).toContain(anzShortlist);
  });

  it("returns null when nothing qualifies — the honest empty state", () => {
    expect(consideredFloorKey(inputM, outputM, PICKER_PROVIDERS)).toBeNull();
  });

  it("never picks an unverified model, even when it would be cheapest", () => {
    // Exclude everything except xAI: its models are unverified → null, not Grok.
    const onlyXai = PICKER_PROVIDERS.filter((p) => p !== "xai");
    expect(consideredFloorKey(inputM, outputM, onlyXai)).toBeNull();
  });

  it("verified floor candidates all resolve", () => {
    for (const k of VERIFIED_MODEL_KEYS) expect(MODELS.find((m) => m.key === k)).toBeDefined();
  });
});
