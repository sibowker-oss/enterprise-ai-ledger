/**
 * Q2 state regression (CTO update v2, 0.2 DONE-WHEN): EVERY model in the
 * price sheet resolves to exactly one of the three states — tracked-provider
 * read / open-weights read / neutral — and the "can be run in-house / low
 * jump risk" reading renders ONLY when the provider's weights are open.
 * This is the class-level fix for the Grok 3 "open-source" misread.
 */
import { describe, expect, it } from "vitest";
import { MODEL_KEYS, model } from "@/lib/simulator/models";
import { forwardSignal, forwardStateForProvider, providerFacts } from "@/lib/simulator/data";
import { provChipText } from "@/lib/simulator/copy";

const IN_HOUSE = /in-house|open.?source|low risk/i;

describe("every model has exactly one tested Q2 state", () => {
  it.each(MODEL_KEYS.map((k) => [k]))("%s", (key) => {
    const m = model(key);
    const state = forwardStateForProvider(m.provider);
    const signal = forwardSignal(m.provider);
    expect(["tracked", "open", "neutral"]).toContain(state);
    expect(signal.state).toBe(state);

    const facts = providerFacts(m.provider);
    expect(facts, `${m.provider} must have a provider_facts record`).not.toBeNull();

    if (state === "tracked") {
      expect(signal.tracked).toBe(true);
      expect(signal.costRecoveryPct).not.toBeNull();
    } else {
      expect(signal.tracked).toBe(false);
      expect(signal.costRecoveryPct).toBeNull();
      // The in-house / low-jump-risk reading ONLY on open weights.
      if (facts!.openWeights) {
        expect(state).toBe("open");
        expect(signal.reason).toMatch(IN_HOUSE);
      } else {
        expect(state).toBe("neutral");
        expect(signal.reason).not.toMatch(IN_HOUSE);
        expect(signal.direction).toBe("Not tracked");
      }
    }
  });

  it("Grok 3 — the live bug — is neutral, never 'open-source, run in-house'", () => {
    const signal = forwardSignal("xai");
    expect(signal.state).toBe("neutral");
    expect(signal.reason).not.toMatch(IN_HOUSE);
    expect(provChipText(signal)).toBe("Not tracked — no forecast available");
  });

  it("the chip names the state in the buyer's words", () => {
    expect(provChipText(forwardSignal("anthropic"))).toMatch(/The AI Ledger/);
    expect(provChipText(forwardSignal("deepseek"))).toMatch(/open weights/i);
    expect(provChipText(forwardSignal("xai"))).toMatch(/no forecast/i);
  });
});
