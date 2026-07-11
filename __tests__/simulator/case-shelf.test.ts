/**
 * The session case shelf + the consolidated business case: saves cache in
 * sessionStorage (per tab), corrupt entries never break the page, and the
 * roll-up re-derives every case through the engine, converts to one currency
 * at the dated rate, and sums to figures that reconcile with the per-case rows.
 */
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { budgetLine } from "@/lib/simulator/budget";
import { clearCases, listSavedCases, removeCase, saveCase, SHELF_LIMIT } from "@/lib/simulator/caseShelf";
import { consolidate, crossFactor } from "@/lib/simulator/consolidate";
import { deriveCase } from "@/lib/simulator/derive";
import { buildScenario, type UseCaseScenario } from "@/lib/simulator/scenario";
import { AUD_USD, USD_TO_AUD } from "@/lib/simulator/data";
import { defaultConfig, type SimState } from "@/lib/simulator/urlState";

/* Minimal sessionStorage stub — the node test env has no window. */
function installStorage() {
  const data = new Map<string, string>();
  const storage = {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  };
  (globalThis as Record<string, unknown>).window = { sessionStorage: storage };
}

function scenarioFor(key: string, currency: "usd" | "aud" = "usd", units?: number): UseCaseScenario {
  const state: SimState = {
    current: { ...defaultConfig(key), ...(units != null ? { units } : {}) },
    ramp: { startPct: 50, fullMonth: 4 },
    currency,
  };
  const s = deriveCase(state.current, currency);
  const line = budgetLine(s.a.key, s.band, s.counted, state.ramp, state.current.buildOverride, crossFactor("usd", currency));
  return buildScenario(state, s, line, null);
}

beforeEach(installStorage);
afterEach(() => {
  delete (globalThis as Record<string, unknown>).window;
});

describe("the shelf", () => {
  it("saves, lists, removes, clears", () => {
    expect(listSavedCases()).toEqual([]);
    expect(saveCase(scenarioFor("code_assistant")).ok).toBe(true);
    expect(saveCase(scenarioFor("claims")).ok).toBe(true);
    expect(listSavedCases()).toHaveLength(2);
    expect(removeCase(0)).toHaveLength(1);
    expect(listSavedCases()[0].inputs.archetypeKey).toBe("claims");
    clearCases();
    expect(listSavedCases()).toEqual([]);
  });

  it("saving identical inputs updates in place instead of duplicating", () => {
    saveCase(scenarioFor("code_assistant"));
    const again = saveCase(scenarioFor("code_assistant"));
    expect(again.ok).toBe(true);
    expect(again.replaced).toBe(true);
    expect(listSavedCases()).toHaveLength(1);
    // A genuinely different case is a new entry.
    expect(saveCase(scenarioFor("code_assistant", "usd", 500)).replaced).toBeFalsy();
    expect(listSavedCases()).toHaveLength(2);
  });

  it("refuses past the limit with a plain-language reason", () => {
    for (let i = 0; i < SHELF_LIMIT; i++) {
      expect(saveCase(scenarioFor("code_assistant", "usd", 10 + i)).ok).toBe(true);
    }
    const over = saveCase(scenarioFor("claims"));
    expect(over.ok).toBe(false);
    expect(over.error).toMatch(/remove one/i);
  });

  it("corrupt or foreign storage never breaks the page", () => {
    (globalThis as { window: { sessionStorage: Storage } }).window.sessionStorage.setItem(
      "hepburn.sim.saved-cases.v1",
      "{corrupt",
    );
    expect(listSavedCases()).toEqual([]);
    (globalThis as { window: { sessionStorage: Storage } }).window.sessionStorage.setItem(
      "hepburn.sim.saved-cases.v1",
      JSON.stringify([{ hello: "world" }, scenarioFor("claims")]),
    );
    expect(listSavedCases()).toHaveLength(1); // the foreign entry is dropped
  });

  it("no-ops safely without a window (SSR/prerender)", () => {
    delete (globalThis as Record<string, unknown>).window;
    expect(listSavedCases()).toEqual([]);
    expect(saveCase(scenarioFor("claims")).ok).toBe(false);
  });
});

describe("the consolidated business case", () => {
  it("totals reconcile with the per-case rows, and payback comes from combined cumulatives", () => {
    const cases = [scenarioFor("code_assistant"), scenarioFor("claims")];
    const con = consolidate(cases, "usd");
    expect(con.rows).toHaveLength(2);
    const sum = (f: (r: (typeof con.rows)[0]) => number) => con.rows.reduce((t, r) => t + f(r), 0);
    expect(con.totals.monthlyToday).toBeCloseTo(sum((r) => r.monthlyToday), 6);
    expect(con.totals.countedValue).toBeCloseTo(sum((r) => r.countedValue), 6);
    expect(con.totals.oneOffBuild).toBeCloseTo(sum((r) => r.oneOffBuild), 6);
    expect(con.totals.coverage).toBeCloseTo(con.totals.countedValue / con.totals.monthlyRise, 6);
    // Both defaults pay back fast — combined they must too, inside month 1–12.
    expect(con.totals.paybackMonth).not.toBeNull();
    expect(con.totals.verdicts.good).toBeGreaterThanOrEqual(1);
  });

  it("mixed currencies convert at the dated rate before summing", () => {
    expect(crossFactor("usd", "aud")).toBeCloseTo(USD_TO_AUD, 12);
    expect(crossFactor("aud", "usd")).toBeCloseTo(AUD_USD, 12);
    const usdOnly = consolidate([scenarioFor("code_assistant")], "usd");
    const asAud = consolidate([scenarioFor("code_assistant")], "aud");
    expect(asAud.totals.monthlyToday).toBeCloseTo(usdOnly.totals.monthlyToday * USD_TO_AUD, 6);
    // Ratios are currency-invariant.
    expect(asAud.totals.coverage).toBeCloseTo(usdOnly.totals.coverage, 9);
  });

  it("weak cases drag the combined margin down — the roll-up can't hide them", () => {
    const strong = consolidate([scenarioFor("code_assistant")], "usd");
    const mixed = consolidate([scenarioFor("code_assistant"), scenarioFor("rag_search")], "usd");
    expect(mixed.totals.coverage).toBeLessThan(strong.totals.coverage);
    expect(mixed.totals.verdicts.no).toBe(1);
  });

  it("foreign entries are skipped, empty shelves consolidate to nothing", () => {
    const con = consolidate([{ junk: true } as unknown as UseCaseScenario], "usd");
    expect(con.rows).toEqual([]);
    expect(con.totals.paybackMonth).toBeNull();
  });
});
