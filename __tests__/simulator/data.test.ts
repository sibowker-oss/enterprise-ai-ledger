/**
 * Reference-data integrity for the forward-pricing engine (Q2).
 *
 * Guards the two things that must never silently drift:
 *  - the repricing multiples recompute from true cost ÷ customer revenue, and
 *  - no forward-pricing figure is ever emitted without a provenance tier.
 */
import { describe, expect, it } from "vitest";
import repricing from "@/data/simulator/benchmark_repricing_multiples.json";
import {
  forwardSignal,
  forwardStateForProvider,
  rawForwardProviders,
  rawMultiples,
  repricingMultiple,
} from "@/lib/simulator/data";

const VALID_TIERS = new Set(["audited", "derived", "illustrative"]);

describe("repricing multiples recompute from validation targets", () => {
  const cases: Array<[string, number]> = [
    ["openai", 2.6],
    ["anthropic", 2.1],
    ["google", 2.78],
    ["iaas", 2.0],
  ];
  it.each(cases)("%s multiple = true cost ÷ customer revenue", (key, expected) => {
    const m = (rawMultiples as Record<string, { true_cost_usd_b: number; customer_revenue_usd_b: number; repricing_multiple: number }>)[key];
    expect(m.true_cost_usd_b / m.customer_revenue_usd_b).toBeCloseTo(expected, 1);
    expect(m.repricing_multiple).toBeCloseTo(expected, 2);
  });
});

describe("no forward-pricing figure without provenance", () => {
  it("every tracked provider carries a valid tier", () => {
    for (const [name, p] of Object.entries(rawForwardProviders)) {
      expect(VALID_TIERS.has(p.tier), `${name} tier`).toBe(true);
    }
  });

  it("the untracked default is tagged illustrative", () => {
    expect(repricing.forward_signal.untracked_default.tier).toBe("illustrative");
    expect(repricing.forward_signal.untracked_default.tracked).toBe(false);
  });
});

describe("forward signal ↔ multiples consistency", () => {
  it("the Q2 rise multiplier matches the derived multiple for tracked providers", () => {
    for (const provider of ["openai", "anthropic", "google"]) {
      const signal = forwardSignal(provider);
      expect(signal.repricingMultiple).toBeCloseTo(rawMultiples[provider].repricing_multiple, 6);
      expect(repricingMultiple(provider)).toBeCloseTo(rawMultiples[provider].repricing_multiple, 6);
    }
  });

  it("untracked OPEN-WEIGHTS providers get the run-in-house read (update v2, 0.2)", () => {
    expect(forwardStateForProvider("deepseek")).toBe("open");
    const signal = forwardSignal("deepseek");
    expect(signal.state).toBe("open");
    expect(signal.tracked).toBe(false);
    expect(signal.tier).toBe("illustrative");
    expect(signal.reason).toMatch(/run in-house/i);
    expect(repricingMultiple("deepseek")).toBeCloseTo(1.1, 6);
    // Untracked read exposes no provider financials.
    expect(signal.costRecoveryPct).toBeNull();
    expect(signal.underwaterPct).toBeNull();
  });

  it("untracked HOSTED providers get the neutral state — no risk rating either way (the Grok fix)", () => {
    expect(forwardStateForProvider("xai")).toBe("neutral");
    const signal = forwardSignal("xai");
    expect(signal.state).toBe("neutral");
    expect(signal.tracked).toBe(false);
    expect(signal.direction).toBe("Not tracked");
    expect(signal.reason).not.toMatch(/open.source|in-house|low risk/i);
    expect(signal.costRecoveryPct).toBeNull();
  });

  it("tracked read exposes cost-recovery and headroom", () => {
    const anthropic = forwardSignal("anthropic");
    expect(anthropic.tracked).toBe(true);
    expect(anthropic.costRecoveryPct).toBe(48);
    expect(anthropic.repricingMultiple).toBeCloseTo(2.1, 6);
  });
});
