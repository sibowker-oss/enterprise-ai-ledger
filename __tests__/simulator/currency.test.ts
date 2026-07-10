/**
 * The A$ toggle (original brief item 9, retained by update v2): one dated,
 * sourced RBA rate; the cost band converts ONCE in derive; value entries are
 * read in the display currency — so the verdict always compares like with like.
 */
import { describe, expect, it } from "vitest";
import { AUD_USD, USD_TO_AUD, fxAsOf, fxSourceUrl } from "@/lib/simulator/data";
import { currencyFactor, deriveCase } from "@/lib/simulator/derive";
import { defaultConfig } from "@/lib/simulator/urlState";

describe("the FX rate", () => {
  it("is dated, sourced, and derived — never stored twice", () => {
    expect(AUD_USD).toBeGreaterThan(0.3);
    expect(AUD_USD).toBeLessThan(1.5);
    expect(USD_TO_AUD).toBeCloseTo(1 / AUD_USD, 12);
    expect(fxAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(fxSourceUrl).toMatch(/rba\.gov\.au/);
  });

  it("currencyFactor is 1 for US$ and the derived rate for A$", () => {
    expect(currencyFactor("usd")).toBe(1);
    expect(currencyFactor("aud")).toBeCloseTo(USD_TO_AUD, 12);
  });
});

describe("derivation in A$", () => {
  const usd = deriveCase(defaultConfig("code_assistant"), "usd");
  const aud = deriveCase(defaultConfig("code_assistant"), "aud");

  it("scales the whole cost band by the dated rate", () => {
    expect(aud.band.today).toBeCloseTo(usd.band.today * USD_TO_AUD, 6);
    expect(aud.band.repriced).toBeCloseTo(usd.band.repriced * USD_TO_AUD, 6);
    expect(aud.band.monthlyFixed).toBeCloseTo(usd.band.monthlyFixed * USD_TO_AUD, 6);
    // Buckets still reconcile after conversion.
    expect(aud.band.today).toBeCloseTo(aud.band.todayAiUsage + aud.band.perUseRun + aud.band.monthlyFixed, 6);
  });

  it("value entries are read in the display currency (not converted)", () => {
    expect(aud.value.base).toBeCloseTo(usd.value.base, 6);
  });

  it("so the margin of safety moves the honest way — A$ value covers less US$-priced cost", () => {
    expect(aud.coverage).toBeCloseTo(usd.coverage * AUD_USD, 6);
    expect(aud.coverage).toBeLessThan(usd.coverage);
  });
});
