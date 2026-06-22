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
import { useCases, declaredRollup } from "@/lib/seed";
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
