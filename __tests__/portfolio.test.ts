/**
 * Selector ↔ roll-up reconciliation (BUILD_SPEC §6, Phase 1 acceptance:
 * "Done when tests pass").
 *
 * The portfolio selectors recompute the roll-up from the line items; this test
 * asserts the result equals the `portfolioRollup` block baked into
 * data/seed-data.json. If a line item or a selector ever drifts, this fails —
 * which is the whole point: charts and the JSON can never silently disagree.
 */
import { describe, expect, it } from "vitest";
import { useCases, declaredRollup, declaredValueRollup, benchmarks } from "@/lib/seed";
import {
  computeValueRollup,
  netValue,
  roiPct,
  paybackMonths,
  bankedValue,
  bankedConversionPct,
  vendorPricedCost,
  subsidyAdjustedVendorCost,
  audPerMillionTokens,
  findUseCase,
  primaryVendor,
  costByVendor,
  tokenUpliftByUseCase,
  seatsVsConsumption,
} from "@/lib/portfolio";
import {
  computePortfolioRollup,
  totalAnnualSpend,
  spendByDecision,
  countByDecision,
  spendByRisk,
  countByRisk,
  spendByCostType,
  reclaimableSpend,
  atRiskUnmanagedSpend,
  evidenceBackedSpend,
  evidenceBackedUseCases,
  costComponentsReconcile,
  businessUnitGroup,
  spendByBusinessUnit,
  businessUnitCount,
  externalVendors,
  vendorCount,
  topUseCasesBySpend,
} from "@/lib/portfolio";

describe("portfolio selectors reproduce the JSON roll-up", () => {
  const derived = computePortfolioRollup(useCases);

  it("total annual spend = A$3,713,000", () => {
    expect(totalAnnualSpend(useCases)).toBe(3_713_000);
    expect(derived.totalAnnualSpendAud).toBe(declaredRollup.totalAnnualSpendAud);
  });

  it("use-case count = 10", () => {
    expect(derived.useCaseCount).toBe(10);
    expect(derived.useCaseCount).toBe(declaredRollup.useCaseCount);
  });

  it("spend by decision = scale 2,066,000 / fix 1,121,000 / stop 526,000", () => {
    expect(spendByDecision(useCases)).toEqual({
      scale: 2_066_000,
      fix: 1_121_000,
      stop: 526_000,
    });
    expect(derived.spendByDecision).toEqual(declaredRollup.spendByDecision);
  });

  it("count by decision = scale 4 / fix 4 / stop 2", () => {
    expect(countByDecision(useCases)).toEqual({ scale: 4, fix: 4, stop: 2 });
    expect(derived.countByDecision).toEqual(declaredRollup.countByDecision);
  });

  it("spend by risk = green 1,446,000 / amber 1,541,000 / red 726,000", () => {
    expect(spendByRisk(useCases)).toEqual({
      green: 1_446_000,
      amber: 1_541_000,
      red: 726_000,
    });
    expect(derived.spendByRisk).toEqual(declaredRollup.spendByRisk);
  });

  it("count by risk = green 3 / amber 5 / red 2", () => {
    expect(countByRisk(useCases)).toEqual({ green: 3, amber: 5, red: 2 });
    expect(derived.countByRisk).toEqual(declaredRollup.countByRisk);
  });

  it("cost mix = licences 1,108,000 / tokens 915,000 / cloud 425,000 / integration 465,000 / people 800,000", () => {
    expect(spendByCostType(useCases)).toEqual({
      licences: 1_108_000,
      tokens: 915_000,
      cloud: 425_000,
      integration: 465_000,
      people: 800_000,
    });
    expect(derived.spendByCostType).toEqual(declaredRollup.spendByCostType);
  });

  it("reclaimable (stop) spend = A$526,000 and at-risk (red) spend = A$726,000", () => {
    expect(reclaimableSpend(useCases)).toBe(526_000);
    expect(atRiskUnmanagedSpend(useCases)).toBe(726_000);
    expect(derived.reclaimableAnnualSpendAud).toBe(
      declaredRollup.reclaimableAnnualSpendAud,
    );
    expect(derived.atRiskUnmanagedSpendAud).toBe(
      declaredRollup.atRiskUnmanagedSpendAud,
    );
  });
});

describe("internal data integrity", () => {
  it("the cost-mix total reconciles to the headline total", () => {
    const mix = spendByCostType(useCases);
    const mixTotal =
      mix.licences + mix.tokens + mix.cloud + mix.integration + mix.people;
    expect(mixTotal).toBe(declaredRollup.totalAnnualSpendAud);
  });

  it("the decision split sums to the headline total", () => {
    const d = spendByDecision(useCases);
    expect(d.scale + d.fix + d.stop).toBe(declaredRollup.totalAnnualSpendAud);
  });

  it("the risk split sums to the headline total", () => {
    const r = spendByRisk(useCases);
    expect(r.green + r.amber + r.red).toBe(declaredRollup.totalAnnualSpendAud);
  });

  it("every use case's components reconcile to its annual total", () => {
    for (const uc of useCases) {
      expect(costComponentsReconcile(uc), `${uc.id} components != total`).toBe(
        true,
      );
    }
  });
});

describe("business-unit grouping (resolved rule: collapse Retail, split Group → 7)", () => {
  it("maps granular units to the 7 headline BUs", () => {
    expect(businessUnitGroup("Retail Banking - Customer Service")).toBe("Retail Banking");
    expect(businessUnitGroup("Retail Banking - Collections")).toBe("Retail Banking");
    expect(businessUnitGroup("Group - Financial Crime")).toBe("Financial Crime");
    expect(businessUnitGroup("Group - Risk & Compliance")).toBe("Risk & Compliance");
    expect(businessUnitGroup("Business Banking")).toBe("Business Banking");
    expect(businessUnitGroup("Wealth")).toBe("Wealth");
  });

  it("grouped BU count = 7 and matches the JSON headline", () => {
    expect(businessUnitCount(useCases)).toBe(7);
    expect(businessUnitCount(useCases)).toBe(declaredRollup.businessUnits);
  });

  it("BU spend sums to the headline total and reconciles per group", () => {
    const rows = spendByBusinessUnit(useCases);
    expect(rows.reduce((s, r) => s + r.spend, 0)).toBe(declaredRollup.totalAnnualSpendAud);
    const retail = rows.find((r) => r.businessUnit === "Retail Banking");
    expect(retail?.spend).toBe(902_000 + 229_000 + 315_000); // UC-01/08/09
    expect(retail?.useCaseCount).toBe(3);
  });
});

describe("vendor parsing (distinct external vendors → 6)", () => {
  it("excludes in-house and dedupes across +/ separators", () => {
    expect(externalVendors(useCases)).toEqual([
      "Microsoft",
      "Anthropic",
      "OpenAI",
      "Google",
      "GitHub",
      "Adobe",
    ]);
    expect(vendorCount(useCases)).toBe(6);
    expect(vendorCount(useCases)).toBe(declaredRollup.vendorsInUse);
  });
});

describe("ranking", () => {
  it("top use case by spend is UC-01 at A$902,000", () => {
    const top = topUseCasesBySpend(useCases, 5);
    expect(top[0].id).toBe("UC-01");
    expect(top[0].cost.totalAnnual).toBe(902_000);
    expect(top).toHaveLength(5);
  });
});

describe("evidence-backed spend (BUILD_SPEC §5.4 what-if)", () => {
  it("high + medium-high confidence spend = A$2,066,000 across UC-01/02/05/07", () => {
    expect(evidenceBackedSpend(useCases)).toBe(2_066_000);
    expect(evidenceBackedUseCases(useCases).map((uc) => uc.id)).toEqual([
      "UC-01",
      "UC-02",
      "UC-05",
      "UC-07",
    ]);
  });
});

describe("ROI / value selectors reproduce valueRollup", () => {
  const derived = computeValueRollup(useCases);

  it("portfolio: A$8.82M benefit, A$5.107M net, 138% ROI", () => {
    expect(derived.totalAnnualBenefitAud).toBe(8_820_000);
    expect(derived.netValueAud).toBe(5_107_000);
    expect(derived.portfolioRoiPct).toBe(138);
    expect(derived).toMatchObject({
      totalAnnualBenefitAud: declaredValueRollup.totalAnnualBenefitAud,
      netValueAud: declaredValueRollup.netValueAud,
      portfolioRoiPct: declaredValueRollup.portfolioRoiPct,
    });
  });

  it("evidence-backed: A$2.066M cost → A$8.0M value = A$5.934M net, 287% ROI (the CFO punchline)", () => {
    expect(derived.evidenceBackedCostAud).toBe(2_066_000);
    expect(derived.evidenceBackedBenefitAud).toBe(8_000_000);
    expect(derived.evidenceBackedNetValueAud).toBe(5_934_000);
    expect(derived.evidenceBackedRoiPct).toBe(287);
  });

  it("unproven spend is underwater: A$1.647M cost → A$0.82M value = −A$827K net", () => {
    expect(derived.unprovenCostAud).toBe(1_647_000);
    expect(derived.unprovenBenefitAud).toBe(820_000);
    expect(derived.unprovenNetValueAud).toBe(-827_000);
  });

  it("net value by decision: scale +5.934M / fix −361K / stop −466K", () => {
    expect(derived.netValueByDecision).toEqual(declaredValueRollup.netValueByDecision);
    expect(derived.netValueByDecision).toEqual({ scale: 5_934_000, fix: -361_000, stop: -466_000 });
  });

  it("per-use-case ROI: UC-05 dev assistant tops at 692%; UC-09 collections is −100%", () => {
    const uc05 = findUseCase(useCases, "UC-05")!;
    const uc09 = findUseCase(useCases, "UC-09")!;
    expect(netValue(uc05)).toBe(2_097_000);
    expect(roiPct(uc05)).toBe(692);
    expect(paybackMonths(uc05)).toBeGreaterThan(0);
    expect(roiPct(uc09)).toBe(-100);
    expect(paybackMonths(uc09)).toBeNull();
  });
});

describe("theoretical value vs banked P&L (the CFO honesty layer)", () => {
  const derived = computeValueRollup(useCases);

  it("only A$1.84M of A$8.82M theoretical value is banked (21%)", () => {
    expect(derived.totalAnnualBenefitAud).toBe(8_820_000); // theoretical
    expect(derived.totalBankedValueAud).toBe(1_840_000); // actual P&L
    expect(derived.bankedConversionPct).toBe(21);
    expect(derived.totalBankedValueAud).toBe(declaredValueRollup.totalBankedValueAud);
  });

  it("on a hard-cash basis the portfolio is still net negative (−A$1.873M banked vs cost)", () => {
    expect(derived.bankedNetValueAud).toBe(-1_873_000);
  });

  it("even the evidence-backed set has only 23% banked, ≈ break-even in cash", () => {
    expect(derived.evidenceBackedBankedAud).toBe(1_840_000);
    expect(derived.evidenceBackedBankedConversionPct).toBe(23);
    expect(derived.evidenceBackedBankedNetAud).toBe(-226_000);
  });

  it("all banked value sits in scale use cases", () => {
    expect(derived.bankedByDecision).toEqual({ scale: 1_840_000, fix: 0, stop: 0 });
    expect(derived.bankedByDecision).toEqual(declaredValueRollup.bankedByDecision);
  });

  it("per-use-case conversion: UC-05 books only 5% of its theoretical value (the dev-productivity gap)", () => {
    const uc05 = findUseCase(useCases, "UC-05")!;
    expect(bankedValue(uc05)).toBe(120_000);
    expect(bankedConversionPct(uc05)).toBe(5);
  });
});

describe("vendor economics & seats→consumption (AI Ledger forward view)", () => {
  it("attributes each use case to its primary external vendor", () => {
    expect(primaryVendor(findUseCase(useCases, "UC-05")!)).toBe("GitHub");
    expect(primaryVendor(findUseCase(useCases, "UC-09")!)).toBe("OpenAI"); // skips "In-house"
    expect(primaryVendor(findUseCase(useCases, "UC-02")!)).toBe("Anthropic");
  });

  it("groups cost by vendor into seats vs consumption, reconciling to the cost mix", () => {
    const rows = costByVendor(useCases);
    expect(rows.reduce((s, r) => s + r.seats, 0)).toBe(1_108_000); // == licences
    expect(rows.reduce((s, r) => s + r.consumption, 0)).toBe(915_000); // == tokens
    expect(rows.reduce((s, r) => s + r.total, 0)).toBe(3_713_000);
    const github = rows.find((r) => r.vendor === "GitHub");
    expect(github?.seats).toBe(228_000); // all seats, no tokens
    expect(github?.consumption).toBe(0);
  });

  it("portfolio is 55% fixed seats today", () => {
    const s = seatsVsConsumption(useCases);
    expect(s.seats).toBe(1_108_000);
    expect(s.consumption).toBe(915_000);
    expect(s.seatsPct).toBe(55);
  });

  it("token-price uplift ranks the token-heavy use cases first; tokens A$915K→A$2.54M at cost-recovery", () => {
    const mult = benchmarks.subsidyEconomics.priceToCostRecoveryMultiple; // 2.78
    const rows = tokenUpliftByUseCase(useCases, mult);
    expect(rows[0].id).toBe("UC-02"); // biggest token line (A$240K)
    expect(rows.find((r) => r.id === "UC-05")).toBeUndefined(); // 0 tokens excluded
    const totalUplifted = rows.reduce((s, r) => s + r.tokensUplifted, 0);
    expect(totalUplifted).toBe(Math.round(915_000 * mult));
  });
});

describe("AI Ledger benchmark layer (real TAIL data)", () => {
  it("blended token rate converts USD→AUD via FX", () => {
    // 0.70 USD/M × 1.52 = 1.06 A$/M
    expect(audPerMillionTokens(benchmarks)).toBeCloseTo(1.06, 2);
  });

  it("vendor-priced cost = licences + tokens + cloud = A$2.448M", () => {
    expect(vendorPricedCost(useCases)).toBe(1_108_000 + 915_000 + 425_000);
  });

  it("subsidy stress test scales vendor-priced cost by the AI Ledger recovery multiple", () => {
    const mult = benchmarks.subsidyEconomics.priceToCostRecoveryMultiple; // 2.78
    expect(subsidyAdjustedVendorCost(useCases, 1)).toBe(2_448_000);
    expect(subsidyAdjustedVendorCost(useCases, mult)).toBe(Math.round(2_448_000 * mult));
  });
});
