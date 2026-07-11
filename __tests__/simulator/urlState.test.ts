/**
 * URL-state persistence (kept by update v2 decision 2): the full configuration
 * — case, now/planned levers, three-point value, exclusions, ramp, currency —
 * round-trips through query params, and hostile or stale links degrade to
 * safe defaults instead of breaking the page.
 */
import { describe, expect, it } from "vitest";
import {
  defaultConfig,
  defaultState,
  parseState,
  serializeState,
  type SimState,
} from "@/lib/simulator/urlState";
import {
  ADOPTION_DEFAULT_PCT,
  REALISATION_DEFAULT_PCT,
  RELIABILITY_DEFAULT_PCT,
} from "@/lib/simulator/data";

describe("round-trips", () => {
  it("default state survives serialize → parse", () => {
    const s = defaultState();
    expect(parseState(serializeState(s))).toEqual(s);
  });

  it("a fully-customised state survives the round trip", () => {
    const s: SimState = {
      current: {
        archetypeKey: "voice_agents",
        units: 350000,
        intensity: null,
        maturity: 4,
        modelKey: "claude_haiku_4_5",
        // voice work isn't batchable — its cap is 0 in both settings.
        levers: {
          now: { cache: 20, batch: 0, route: 10 },
          planned: { cache: 45, batch: 0, route: 20 },
        },
        overrides: { driver: 0.12, lowDriver: 0.05, highDriver: 0.3 },
        adoption: 65,
        realisation: 75,
        reliability: 85,
        excludedProviders: ["deepseek", "zhipu"],
      },
      ramp: { startPct: 30, fullMonth: 6 },
      currency: "aud",
    };
    expect(parseState(serializeState(s))).toEqual(s);
  });

  it("decimal drivers survive (voice agents at $0.08/call-minute)", () => {
    const s = defaultState();
    s.current = { ...defaultConfig("voice_agents"), overrides: { driver: 0.08 } };
    expect(parseState(serializeState(s)).current.overrides.driver).toBe(0.08);
  });
});

describe("defensive parsing — a bad link still renders a working page", () => {
  it("garbage falls back to the default state", () => {
    expect(parseState("?uc=<script>&u=NaN&m=;;;")).toEqual(defaultState());
    expect(parseState("")).toEqual(defaultState());
    expect(parseState("?%%%")).toEqual(defaultState());
  });

  it("unknown model falls back to the use case's default", () => {
    const s = parseState("?uc=claims&m=totally_fake_model");
    expect(s.current.archetypeKey).toBe("claims");
    expect(s.current.modelKey).toBe("claude_sonnet_4_6");
  });

  it("out-of-range numbers clamp instead of breaking", () => {
    const s = parseState("?uc=code_assistant&s=99&ca=400&pc=400&i=9999&ad=-5&re=200&rs=250&rf=99&u=0.01");
    expect(s.current.maturity).toBe(4);
    expect(s.current.levers.now.cache).toBe(70); // clamped to the chat_support evidence cap
    expect(s.current.levers.planned.cache).toBe(70);
    expect(s.current.intensity).toBe(80); // clamped to the library band's heavy end
    expect(s.current.adoption).toBe(10); // the Q4 realism-slider floor
    expect(s.current.realisation).toBe(100); // clamped to the ceiling
    expect(s.current.units).toBe(1); // units are counts — no 0.01-unit deployments
    expect(s.ramp).toEqual({ startPct: 100, fullMonth: 12 });
  });

  it("a crafted link can't switch batching on for interactive work", () => {
    const s = parseState("?uc=voice_agents&ba=80&pb=80");
    expect(s.current.levers.now.batch).toBe(0);
    expect(s.current.levers.planned.batch).toBe(0);
  });

  it("unknown excluded providers are dropped; known ones kept", () => {
    const s = parseState("?uc=code_assistant&x=deepseek.notaprovider.zhipu");
    expect(s.current.excludedProviders).toEqual(["deepseek", "zhipu"]);
  });

  it("missing params inherit the archetype's defaults (short links stay valid)", () => {
    const s = parseState("?uc=summarisation");
    const d = defaultConfig("summarisation");
    expect(s.current).toEqual(d);
    expect(s.current.adoption).toBe(ADOPTION_DEFAULT_PCT);
    expect(s.current.realisation).toBe(REALISATION_DEFAULT_PCT);
    expect(s.current.reliability).toBe(RELIABILITY_DEFAULT_PCT);
    expect(s.current.levers.now).toEqual({ cache: 0, batch: 0, route: 0 }); // A3: not doing this yet
    expect(s.currency).toBe("usd");
  });
});
