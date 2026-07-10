/**
 * Reference-data integrity for the two new public JSONs: input rails
 * (CTO review item 8) and vendor seat prices (item 4). Same discipline as
 * data.test.ts — nothing renders without provenance, and the rails must
 * agree with the committed illustrative defaults.
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES, ARCHETYPE_BY_KEY, isPerSeat } from "@/lib/simulator/archetypes";
import {
  driverRail,
  HAIRCUT_DEFAULT_PCT,
  railsAsOf,
  rateRail,
  rawSeatProducts,
  seatPricesAsOf,
  seatProductsFor,
  unitsRail,
} from "@/lib/simulator/data";
import { railWarning } from "@/lib/simulator/copy";

describe("input rails", () => {
  it("are dated and carry the default realisation share", () => {
    expect(railsAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(HAIRCUT_DEFAULT_PCT).toBe(60);
  });

  it("every archetype has ordered units + driver rails whose TYPICAL equals the committed default", () => {
    for (const a of ARCHETYPES) {
      const u = unitsRail(a.key);
      const d = driverRail(a.key);
      expect(u, `${a.key} units rail`).not.toBeNull();
      expect(d, `${a.key} driver rail`).not.toBeNull();
      for (const r of [u!, d!]) {
        expect(r.min).toBeLessThanOrEqual(r.typical);
        expect(r.typical).toBeLessThanOrEqual(r.max);
      }
      expect(u!.typical, `${a.key} units typical`).toBe(a.units);
      expect(d!.typical, `${a.key} driver typical`).toBe(a.value.driver);
      if (a.value.kind === "hours") {
        const r = rateRail(a.key);
        expect(r, `${a.key} rate rail`).not.toBeNull();
        expect(r!.typical).toBe(a.value.rate);
      } else {
        expect(rateRail(a.key)).toBeNull();
      }
    }
  });

  it("warns softly out of band, stays quiet inside it", () => {
    const rail = unitsRail("code_assistant")!; // 10 / 200 / 5000
    expect(railWarning(200, rail)).toBeNull();
    expect(railWarning(10, rail)).toBeNull(); // boundary inclusive
    expect(railWarning(5000, rail)).toBeNull();
    expect(railWarning(0.01, rail)).toMatch(/below the usual range/);
    expect(railWarning(60000, rail)).toMatch(/above the usual range/);
  });
});

describe("vendor seat prices", () => {
  it("are dated, positive, and carry a verification status each", () => {
    expect(seatPricesAsOf).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    for (const [key, p] of Object.entries(rawSeatProducts)) {
      expect(p.usd_per_seat_month, key).toBeGreaterThan(0);
      expect(["official", "official-indirect", "reported"], key).toContain(p.status);
      expect(p.source.length, key).toBeGreaterThan(0);
    }
  });

  it("apply only to seat-shaped archetypes", () => {
    for (const [key, p] of Object.entries(rawSeatProducts)) {
      for (const target of p.applies_to) {
        const a = ARCHETYPE_BY_KEY[target];
        expect(a, `${key} → ${target}`).toBeDefined();
        expect(isPerSeat(a), `${key} → ${target} must be per-seat`).toBe(true);
      }
    }
    // Per-transaction archetypes render no seat comparison at all.
    expect(seatProductsFor("claims")).toEqual([]);
    expect(seatProductsFor("voice_agents")).toEqual([]);
  });

  it("code assistant compares against Copilot's two official list prices", () => {
    const products = seatProductsFor("code_assistant");
    expect(products.map((p) => [p.label, p.perSeatUsd, p.status])).toEqual([
      ["GitHub Copilot Business", 19, "official"],
      ["GitHub Copilot Enterprise", 39, "official"],
    ]);
  });

  it("a figure with no published list price is flagged, never dressed as official", () => {
    const enterprise = seatProductsFor("rag_search").find((p) => p.key === "chatgpt_enterprise");
    expect(enterprise).toBeDefined();
    expect(enterprise!.status).toBe("reported");
  });
});
