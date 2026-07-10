/**
 * URL-state persistence (CTO review item 5, kept by update v2 decision 2:
 * "URL sharing stays" — the link carries the numbers you typed, and the UI
 * says so plainly). The FULL configuration round-trips through query params
 * so a configured case can travel in an email. Parsing is defensive:
 * anything malformed falls back to the default, never throws — a bad link
 * must still render a working page.
 */
import { ARCHETYPE_BY_KEY } from "./archetypes";
import { hasModel, HAIRCUT_DEFAULT_PCT } from "./data";
import { PICKER_PROVIDERS } from "./models";
import {
  defaultLevers,
  intensityBand,
  leverCaps,
  NO_LEVERS,
  type LeverPlan,
  type Levers,
  type ValueOverrides,
} from "./engine";
import { clampRamp, DEFAULT_RAMP, type AdoptionRamp } from "./budget";

export type Currency = "usd" | "aud";

/** One fully-specified case — enough to recompute everything it shows. */
export interface SimConfig {
  archetypeKey: string;
  units: number;
  /** Per-day/week usage intensity; null where the archetype has no volume band. */
  intensity: number | null;
  /** Setup slider 0 (loose) … 4 (lean). */
  maturity: number;
  modelKey: string;
  /** Levers as run NOW (defaults to zero — "not doing this yet") and as planned. */
  levers: LeverPlan;
  overrides: ValueOverrides;
  /** Share of the entered value the verdict counts (Q4 realisation slider). */
  haircut: number;
  /** Providers excluded from the "cheapest model you'd consider" floor (A4). */
  excludedProviders: string[];
}

export interface SimState {
  current: SimConfig;
  ramp: AdoptionRamp;
  currency: Currency;
}

/** The pristine configuration for a use case (what selecting it resets to). */
export function defaultConfig(archetypeKey: string): SimConfig {
  const a = ARCHETYPE_BY_KEY[archetypeKey] ?? ARCHETYPE_BY_KEY.code_assistant;
  return {
    archetypeKey: a.key,
    units: a.units,
    intensity: intensityBand(a)?.mid ?? null,
    maturity: 2,
    modelKey: a.defaultModelKey,
    // NOW defaults to zero (A3: "not doing this yet"); the PLAN starts at the
    // library-informed settings for this workload.
    levers: { now: { ...NO_LEVERS }, planned: defaultLevers(a) },
    overrides: {},
    haircut: HAIRCUT_DEFAULT_PCT,
    excludedProviders: [],
  };
}

export function defaultState(): SimState {
  return { current: defaultConfig("code_assistant"), ramp: DEFAULT_RAMP, currency: "usd" };
}

/* ------------------------------------------------------------------ *
 * Serialise: compact, human-scannable params.
 * ------------------------------------------------------------------ */

const round = (n: number) => Math.round(n * 10000) / 10000;
const num = (n: number) => String(round(n));

/** The current state as a query string (no leading "?"). */
export function serializeState(state: SimState): string {
  const p = new URLSearchParams();
  const c = state.current;
  p.set("uc", c.archetypeKey);
  p.set("u", num(c.units));
  if (c.intensity != null) p.set("i", num(c.intensity));
  p.set("s", num(c.maturity));
  p.set("m", c.modelKey);
  p.set("ca", num(c.levers.now.cache));
  p.set("ba", num(c.levers.now.batch));
  p.set("ro", num(c.levers.now.route));
  p.set("pc", num(c.levers.planned.cache));
  p.set("pb", num(c.levers.planned.batch));
  p.set("pr", num(c.levers.planned.route));
  if (c.overrides.driver != null) p.set("d", num(c.overrides.driver));
  if (c.overrides.rate != null) p.set("rt", num(c.overrides.rate));
  if (c.overrides.lowDriver != null) p.set("dl", num(c.overrides.lowDriver));
  if (c.overrides.highDriver != null) p.set("dh", num(c.overrides.highDriver));
  p.set("h", num(c.haircut));
  if (c.excludedProviders.length > 0) p.set("x", c.excludedProviders.join("."));
  p.set("rs", num(state.ramp.startPct));
  p.set("rf", num(state.ramp.fullMonth));
  if (state.currency !== "usd") p.set("cur", state.currency);
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

export interface RawConfigFields {
  archetypeKey: string | null;
  units: number | null;
  intensity: number | null;
  maturity: number | null;
  modelKey: string | null;
  cache: number | null;
  batch: number | null;
  route: number | null;
  plannedCache: number | null;
  plannedBatch: number | null;
  plannedRoute: number | null;
  driver: number | null;
  rate: number | null;
  lowDriver: number | null;
  highDriver: number | null;
  haircut: number | null;
  excludedProviders: string[] | null;
}

/**
 * Sanitise a raw (possibly hostile) config against the reference data — also
 * the validation gate for imported scenario JSON (lib/simulator/scenario.ts).
 */
export function sanitiseConfig(raw: RawConfigFields): SimConfig | null {
  const a = raw.archetypeKey ? ARCHETYPE_BY_KEY[raw.archetypeKey] : undefined;
  if (!a) return null;
  const base = defaultConfig(a.key);
  const band = intensityBand(a);
  // Levers clamp to the WORKLOAD's caps, not just 0–100 — a crafted link can't
  // switch batching on for interactive work or push cache past the evidence.
  const caps = leverCaps(a);
  const clampLevers = (cache: number | null, batch: number | null, route: number | null, fallback: Levers): Levers => ({
    cache: clamp(cache != null ? cache : fallback.cache, 0, caps.cache),
    batch: clamp(batch != null ? batch : fallback.batch, 0, caps.batch),
    route: clamp(route != null ? route : fallback.route, 0, caps.route),
  });
  return {
    archetypeKey: a.key,
    units: raw.units != null ? clamp(Math.round(raw.units), 1, 1e9) : base.units,
    intensity:
      band && raw.intensity != null ? clamp(raw.intensity, band.low, band.high) : base.intensity,
    maturity: raw.maturity != null ? clamp(Math.round(raw.maturity), 0, 4) : base.maturity,
    modelKey: raw.modelKey && hasModel(raw.modelKey) ? raw.modelKey : base.modelKey,
    levers: {
      now: clampLevers(raw.cache, raw.batch, raw.route, base.levers.now),
      planned: clampLevers(raw.plannedCache, raw.plannedBatch, raw.plannedRoute, base.levers.planned),
    },
    overrides: {
      ...(raw.driver != null ? { driver: clamp(raw.driver, 0, 1e9) } : {}),
      ...(raw.rate != null ? { rate: clamp(raw.rate, 0, 1e9) } : {}),
      ...(raw.lowDriver != null ? { lowDriver: clamp(raw.lowDriver, 0, 1e9) } : {}),
      ...(raw.highDriver != null ? { highDriver: clamp(raw.highDriver, 0, 1e9) } : {}),
    },
    haircut: raw.haircut != null ? clamp(raw.haircut, 10, 100) : base.haircut,
    excludedProviders: (raw.excludedProviders ?? []).filter((p) => PICKER_PROVIDERS.includes(p)),
  };
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
      plannedCache: toNum(p.get("pc")),
      plannedBatch: toNum(p.get("pb")),
      plannedRoute: toNum(p.get("pr")),
      driver: toNum(p.get("d")),
      rate: toNum(p.get("rt")),
      lowDriver: toNum(p.get("dl")),
      highDriver: toNum(p.get("dh")),
      haircut: toNum(p.get("h")),
      excludedProviders: p.get("x") ? p.get("x")!.split(".").filter(Boolean) : null,
    }) ?? fallback.current;
  const rs = toNum(p.get("rs"));
  const rf = toNum(p.get("rf"));
  const ramp = clampRamp({
    startPct: rs ?? fallback.ramp.startPct,
    fullMonth: rf ?? fallback.ramp.fullMonth,
  });
  const currency: Currency = p.get("cur") === "aud" ? "aud" : "usd";
  return { current, ramp, currency };
}
