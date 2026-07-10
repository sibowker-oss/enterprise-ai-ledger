/**
 * URL-state persistence (CTO review 2026-07-10 item 5). The FULL configuration
 * — current case, pinned cases, ramp — round-trips through query params, so a
 * configured case can travel in an email ("Copy link to this case") and the
 * original handoff's only permitted persistence mechanism (query params, §2)
 * is finally used. Parsing is defensive: anything malformed falls back to the
 * default, never throws — a bad link must still render a working page.
 */
import { ARCHETYPE_BY_KEY } from "./archetypes";
import { hasModel, HAIRCUT_DEFAULT_PCT } from "./data";
import { defaultLevers, intensityBand, leverCaps, type Levers, type ValueOverrides } from "./engine";
import { clampRamp, DEFAULT_RAMP, type AdoptionRamp } from "./budget";

/** One fully-specified case — enough to recompute everything it shows. */
export interface SimConfig {
  archetypeKey: string;
  units: number;
  /** Per-day/week usage intensity; null where the archetype has no volume band. */
  intensity: number | null;
  /** Setup slider 0 (loose) … 4 (lean). */
  maturity: number;
  modelKey: string;
  levers: Levers;
  overrides: ValueOverrides;
  /** Share of the entered value the verdict counts (Q4 realisation slider). */
  haircut: number;
}

export interface SimState {
  current: SimConfig;
  pins: SimConfig[];
  ramp: AdoptionRamp;
}

export const PIN_LIMIT = 5;

/** The pristine configuration for a use case (what selecting it resets to). */
export function defaultConfig(archetypeKey: string): SimConfig {
  const a = ARCHETYPE_BY_KEY[archetypeKey] ?? ARCHETYPE_BY_KEY.code_assistant;
  return {
    archetypeKey: a.key,
    units: a.units,
    intensity: intensityBand(a)?.mid ?? null,
    maturity: 2,
    modelKey: a.defaultModelKey,
    levers: defaultLevers(a),
    overrides: {},
    haircut: HAIRCUT_DEFAULT_PCT,
  };
}

export function defaultState(): SimState {
  return { current: defaultConfig("code_assistant"), pins: [], ramp: DEFAULT_RAMP };
}

/* ------------------------------------------------------------------ *
 * Serialise: compact, human-scannable params.
 * ------------------------------------------------------------------ */

const round = (n: number) => Math.round(n * 10000) / 10000;
const num = (n: number) => String(round(n));

/** A config as an ordered comma tuple (empty slots for unset overrides/intensity). */
function packConfig(c: SimConfig): string {
  return [
    c.archetypeKey,
    num(c.units),
    c.intensity == null ? "" : num(c.intensity),
    num(c.maturity),
    c.modelKey,
    num(c.levers.cache),
    num(c.levers.batch),
    num(c.levers.route),
    c.overrides.driver == null ? "" : num(c.overrides.driver),
    c.overrides.rate == null ? "" : num(c.overrides.rate),
    num(c.haircut),
  ].join(",");
}

/** The current state as a query string (no leading "?"). */
export function serializeState(state: SimState): string {
  const p = new URLSearchParams();
  const c = state.current;
  p.set("uc", c.archetypeKey);
  p.set("u", num(c.units));
  if (c.intensity != null) p.set("i", num(c.intensity));
  p.set("s", num(c.maturity));
  p.set("m", c.modelKey);
  p.set("ca", num(c.levers.cache));
  p.set("ba", num(c.levers.batch));
  p.set("ro", num(c.levers.route));
  if (c.overrides.driver != null) p.set("d", num(c.overrides.driver));
  if (c.overrides.rate != null) p.set("rt", num(c.overrides.rate));
  p.set("h", num(c.haircut));
  p.set("rs", num(state.ramp.startPct));
  p.set("rf", num(state.ramp.fullMonth));
  if (state.pins.length > 0) p.set("pin", state.pins.map(packConfig).join("~"));
  return p.toString();
}

/* ------------------------------------------------------------------ *
 * Parse: defensive — clamp, validate, fall back. Never throws.
 * ------------------------------------------------------------------ */

const toNum = (v: string | null | undefined): number | null => {
  if (v == null || v.trim() === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
};

const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));

/** Sanitise a raw (possibly hostile) config against the reference data. */
function sanitiseConfig(raw: {
  archetypeKey: string | null;
  units: number | null;
  intensity: number | null;
  maturity: number | null;
  modelKey: string | null;
  cache: number | null;
  batch: number | null;
  route: number | null;
  driver: number | null;
  rate: number | null;
  haircut: number | null;
}): SimConfig | null {
  const a = raw.archetypeKey ? ARCHETYPE_BY_KEY[raw.archetypeKey] : undefined;
  if (!a) return null;
  const base = defaultConfig(a.key);
  const band = intensityBand(a);
  // Levers clamp to the WORKLOAD's caps, not just 0–100 — a crafted link can't
  // switch batching on for interactive work or push cache past the evidence.
  const caps = leverCaps(a);
  const cfg: SimConfig = {
    archetypeKey: a.key,
    units: raw.units != null ? clamp(Math.round(raw.units * 100) / 100, 0.01, 1e9) : base.units,
    intensity:
      band && raw.intensity != null ? clamp(raw.intensity, band.low, band.high) : base.intensity,
    maturity: raw.maturity != null ? clamp(Math.round(raw.maturity), 0, 4) : base.maturity,
    modelKey: raw.modelKey && hasModel(raw.modelKey) ? raw.modelKey : base.modelKey,
    levers: {
      cache: clamp(raw.cache != null ? raw.cache : base.levers.cache, 0, caps.cache),
      batch: clamp(raw.batch != null ? raw.batch : base.levers.batch, 0, caps.batch),
      route: clamp(raw.route != null ? raw.route : base.levers.route, 0, caps.route),
    },
    overrides: {
      ...(raw.driver != null ? { driver: clamp(raw.driver, 0, 1e9) } : {}),
      ...(raw.rate != null ? { rate: clamp(raw.rate, 0, 1e9) } : {}),
    },
    haircut: raw.haircut != null ? clamp(raw.haircut, 1, 100) : base.haircut,
  };
  return cfg;
}

function unpackConfig(packed: string): SimConfig | null {
  const f = packed.split(",");
  return sanitiseConfig({
    archetypeKey: f[0] ?? null,
    units: toNum(f[1]),
    intensity: toNum(f[2]),
    maturity: toNum(f[3]),
    modelKey: f[4] ?? null,
    cache: toNum(f[5]),
    batch: toNum(f[6]),
    route: toNum(f[7]),
    driver: toNum(f[8]),
    rate: toNum(f[9]),
    haircut: toNum(f[10]),
  });
}

/** Parse a query string (with or without "?") back into a full SimState. */
export function parseState(search: string): SimState {
  const fallback = defaultState();
  let p: URLSearchParams;
  try {
    p = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  } catch {
    return fallback;
  }
  const current =
    sanitiseConfig({
      archetypeKey: p.get("uc"),
      units: toNum(p.get("u")),
      intensity: toNum(p.get("i")),
      maturity: toNum(p.get("s")),
      modelKey: p.get("m"),
      cache: toNum(p.get("ca")),
      batch: toNum(p.get("ba")),
      route: toNum(p.get("ro")),
      driver: toNum(p.get("d")),
      rate: toNum(p.get("rt")),
      haircut: toNum(p.get("h")),
    }) ?? fallback.current;
  const pins = (p.get("pin") ?? "")
    .split("~")
    .filter(Boolean)
    .map(unpackConfig)
    .filter((c): c is SimConfig => c != null)
    .slice(0, PIN_LIMIT);
  const rs = toNum(p.get("rs"));
  const rf = toNum(p.get("rf"));
  const ramp = clampRamp({
    startPct: rs ?? fallback.ramp.startPct,
    fullMonth: rf ?? fallback.ramp.fullMonth,
  });
  return { current, pins, ramp };
}
