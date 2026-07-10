/**
 * Analytics events (CTO review item 12, TAIL instrumentation pattern):
 * track() must be a safe no-op wherever gtag isn't loaded, and events must
 * never carry user-entered numbers — categorical metadata only.
 */
import { describe, expect, it } from "vitest";
import { GA_MEASUREMENT_ID, track } from "@/lib/simulator/analytics";

describe("analytics", () => {
  it("reuses the TAIL GA4 property per the 2026-07-02 brief's pattern", () => {
    expect(GA_MEASUREMENT_ID).toMatch(/^G-[A-Z0-9]+$/);
  });

  it("no-ops without a window (SSG/prerender) instead of throwing", () => {
    expect(() => track("sim_use_case_switch", { use_case: "claims" })).not.toThrow();
  });

  it("no-ops when gtag is absent in the browser", () => {
    const g = globalThis as { window?: unknown };
    const prev = g.window;
    g.window = {}; // a window without gtag (script blocked / dev)
    try {
      expect(() => track("sim_cta_click", { verdict: "good" })).not.toThrow();
    } finally {
      if (prev === undefined) delete g.window;
      else g.window = prev;
    }
  });
});
