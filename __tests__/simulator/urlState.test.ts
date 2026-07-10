/**
 * URL-state persistence (CTO review item 5): the full configuration —
 * current case, pins, ramp — round-trips through query params, and hostile
 * or stale links degrade to safe defaults instead of breaking the page.
 */
import { describe, expect, it } from "vitest";
import {
  defaultConfig,
  defaultState,
  parseState,
  serializeState,
  PIN_LIMIT,
  type SimState,
} from "@/lib/simulator/urlState";
import { HAIRCUT_DEFAULT_PCT } from "@/lib/simulator/data";

describe("round-trips", () => {
  it("default state survives serialize → parse", () => {
    const s = defaultState();
    expect(parseState(serializeState(s))).toEqual(s);
  });

  it("a fully-customised state with pins survives the round trip", () => {
    const s: SimState = {
      current: {
        archetypeKey: "voice_agents",
        units: 350000,
        intensity: null,
        maturity: 4,
        modelKey: "claude_haiku_4_5",
        levers: { cache: 45, batch: 0, route: 20 }, // voice work isn't batchable — cap is 0
        overrides: { driver: 0.12 },
        haircut: 75,
      },
      pins: [
        defaultConfig("code_assistant"),
        {
          ...defaultConfig("legal_review"),
          units: 55,
          intensity: 25,
          overrides: { driver: 4.5, rate: 150 },
          haircut: 40,
        },
      ],
      ramp: { startPct: 30, fullMonth: 6 },
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
    const s = parseState("?uc=code_assistant&s=99&ca=400&i=9999&h=-5&rs=250&rf=99");
    expect(s.current.maturity).toBe(4);
    expect(s.current.levers.cache).toBe(70); // clamped to the chat_support evidence cap
    expect(s.current.intensity).toBe(80); // clamped to the library band's heavy end
    expect(s.current.haircut).toBe(1);
    expect(s.ramp).toEqual({ startPct: 100, fullMonth: 12 });
  });

  it("a crafted link can't switch batching on for interactive work", () => {
    const s = parseState("?uc=voice_agents&ba=80");
    expect(s.current.levers.batch).toBe(0);
  });

  it("junk pins are dropped, valid ones kept, and the pin limit holds", () => {
    const good = "code_assistant,200,30,2,claude_sonnet_4_6,30,20,0,,,60";
    const junk = "not_a_case,1,1,1,fake,0,0,0,,,50";
    const many = Array(8).fill(good).join("~");
    expect(parseState(`?pin=${encodeURIComponent(`${good}~${junk}`)}`).pins).toHaveLength(1);
    expect(parseState(`?pin=${encodeURIComponent(many)}`).pins).toHaveLength(PIN_LIMIT);
  });

  it("missing params inherit the archetype's defaults (short links stay valid)", () => {
    const s = parseState("?uc=summarisation");
    const d = defaultConfig("summarisation");
    expect(s.current).toEqual(d);
    expect(s.current.haircut).toBe(HAIRCUT_DEFAULT_PCT);
  });
});
