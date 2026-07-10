import { describe, expect, it } from "vitest";
import { defaultConfig } from "@/lib/simulator/urlState";
import { deriveCase } from "@/lib/simulator/derive";
import { breakEvenSentence } from "@/lib/simulator/copy";
import { usdK } from "@/lib/simulator/format";

describe("verify claim: Q5 break-even tile vs sentence", () => {
  it("traces code_assistant defaults", () => {
    const cfg = defaultConfig("code_assistant");
    const c = deriveCase(cfg);
    console.log("haircut:", cfg.haircut);
    console.log("band.today:", c.band.today, "band.repriced:", c.band.repriced);
    console.log("tile shows:", `${usdK(c.band.repriced)}/mo`);
    console.log("entered value.base:", c.value.base, "counted.base:", c.counted.base);
    console.log("verdict:", c.verdict.klass, "-", c.verdict.label);
    console.log("breakEven:", JSON.stringify(c.breakEven));
    console.log("sentence:", breakEvenSentence(c.breakEven, cfg.haircut));
    console.log("entered value actually needed (repriced / f):", c.band.repriced / (cfg.haircut / 100));

    // Now simulate a user who targets the tile figure: enter exactly band.repriced
    // of value via the driver override. value kind for code_assistant?
    console.log("value kind:", c.a.value.kind, "driver:", c.a.value.driver, "rate:", (c.a.value as any).rate);
    // hours: base = units * h * r * 52 / 12  => h needed for base == band.repriced
    const rate = (c.a.value as any).rate;
    const hNeeded = c.band.repriced / (cfg.units * rate * (52 / 12));
    const cfg2 = { ...cfg, overrides: { ...cfg.overrides, driver: hNeeded } };
    const c2 = deriveCase(cfg2);
    console.log("--- user enters exactly the tile figure as value ---");
    console.log("entered:", c2.value.base, "counted:", c2.counted.base, "repriced:", c2.band.repriced);
    console.log("verdict:", c2.verdict.klass, "-", c2.verdict.label);

    // And a user who enters the sentence-implied value (repriced / f)
    const hNeeded3 = c.band.repriced / (cfg.haircut / 100) / (cfg.units * rate * (52 / 12));
    const c3 = deriveCase({ ...cfg, overrides: { ...cfg.overrides, driver: hNeeded3 } });
    console.log("--- user enters the sentence-implied value ---");
    console.log("entered:", c3.value.base, "counted:", c3.counted.base, "repriced:", c3.band.repriced);
    console.log("verdict:", c3.verdict.klass, "-", c3.verdict.label);
    console.log("minutes/week implied:", hNeeded3 * 60);
    expect(true).toBe(true);
  });
});
