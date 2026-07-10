/**
 * Token Estimate Library adapter (handoff: HA_EnterpriseAI_TokenEstimateLibrary
 * _ClaudeCodeHandoff_v1.md).
 *
 * The demand side of the simulator now reads ONE source of truth:
 * data/reference/token_estimate_library_v1.json — the guarded, synced library
 * (validate_token_estimate_library.py runs in release checks). It SUPERSEDES
 * benchmark_token_priors.json v0.1 (wq-120a rule #1: never dual-source).
 *
 * DATA-LINE HARD RULE (concept.md §5): the library is public-safe — it holds
 * bands, anchors and levers only, never live per-provider forward signals
 * (those stay in benchmark_repricing_multiples.json / Q2). Importing it here
 * does not leak the moat.
 *
 * This module is the ONLY place that knows the library's JSON shape; everything
 * else consumes the typed selectors below. No numbers are authored here — every
 * figure is read from the JSON, and every rendered figure carries `as_of`.
 */
import libraryJson from "@/data/reference/token_estimate_library_v1.json";
import type { TokenPrior } from "./types";

/* ------------------------------------------------------------------ *
 * Raw shapes — only the fields the simulator reads (the file has more).
 * ------------------------------------------------------------------ */
interface Band {
  low: number;
  mid: number;
  high: number;
}
interface RawUseCase {
  input_tokens: Band;
  output_tokens: Band;
  fan_out?: Band;
  default_model: string;
  reasoning_mode: string;
  io_class: string;
  tier: string;
  as_of: string;
  review_by: string;
  volume_hints?: Record<string, unknown>;
  billing_assumptions?: { cache_read_share?: Band };
  optimisation_profile?: {
    top_levers?: string[];
    billing_envelope_vs_naive_pct?: { low: number; high: number };
    note?: string;
  };
  model_sensitivity?: string[];
}
interface RawLever {
  family: "consumption" | "billing";
  value?: {
    cache_read_multiplier?: number;
    multiplier?: number;
    realistic_hit_band?: [number, number];
  };
  realistic_hit_rates?: Record<string, [number, number] | string>;
}
interface RawLibrary {
  _schema: {
    version: string;
    as_of: string;
    supersedes: string;
    band_semantics: { low: string; mid: string; high: string; note: string };
  };
  use_cases: Record<string, RawUseCase>;
  optimisation_levers: Record<string, RawLever & Record<string, unknown>>;
  stacking_rules: {
    combined_envelopes_vs_naive_uncached_frontier: Record<
      string,
      { base_stack_pct?: [number, number]; mature_stack_pct?: [number, number]; pct?: [number, number] }
    >;
  };
  model_adjustment_factors: Record<string, Record<string, unknown>>;
}

const lib = libraryJson as unknown as RawLibrary;

/* ------------------------------------------------------------------ *
 * Provenance / freshness (rule #2 — every rendered figure carries as_of).
 * ------------------------------------------------------------------ */
export const libraryVersion = lib._schema.version;
export const libraryAsOf = lib._schema.as_of;
export const librarySupersedes = lib._schema.supersedes;

/** Behavioural band meaning, verbatim from the JSON (rule #2 — labels, not bare midpoints). */
export const bandSemantics = lib._schema.band_semantics;

/* ------------------------------------------------------------------ *
 * Per-use-case demand-side reads.
 * ------------------------------------------------------------------ */
function uc(key: string): RawUseCase {
  const u = lib.use_cases[key];
  if (!u) throw new Error(`Unknown library use case: ${key}`);
  return u;
}

export function libraryPrior(key: string): {
  input: TokenPrior;
  output: TokenPrior;
  fanOut: number;
  defaultModel: string;
  reasoningMode: string;
  ioClass: string;
  tier: string;
  asOf: string;
  reviewBy: string;
} {
  const u = uc(key);
  return {
    input: u.input_tokens,
    output: u.output_tokens,
    // fan_out is a band in the library; typical production = mid (band_semantics).
    fanOut: u.fan_out ? u.fan_out.mid : 1,
    defaultModel: u.default_model,
    reasoningMode: u.reasoning_mode,
    ioClass: u.io_class,
    tier: u.tier,
    asOf: u.as_of,
    reviewBy: u.review_by,
  };
}

/** Plain-voice model-change sensitivity notes for a use case (already jargon-light). */
export function modelSensitivity(key: string): string[] {
  return uc(key).model_sensitivity ?? [];
}

/**
 * The library's declared realistic cache-read share for a use case, where it
 * carries one (agentic_coding 0.8, deep_research 0.6). For these cases the
 * input band is "physical tokens INCLUDING cache reads", so the realistic cost
 * REQUIRES this discount — it seeds the starting cache lever. Null otherwise.
 */
export function declaredCacheShare(key: string): number | null {
  return uc(key).billing_assumptions?.cache_read_share?.mid ?? null;
}

/** The library's first per-transaction dollar anchor (for faithfulness checks). */
export function dollarAnchor(key: string): { usdLow: number; usdHigh: number; referenceModel: string } | null {
  const anchors = (lib.use_cases[key] as unknown as {
    dollar_anchors?: Array<{ usd_low: number; usd_high: number; reference_model: string }>;
  }).dollar_anchors;
  if (!anchors || anchors.length === 0) return null;
  const a = anchors[0];
  return { usdLow: a.usd_low, usdHigh: a.usd_high, referenceModel: a.reference_model };
}

/** True when the library flags this use case as reasoning-toggle sensitive
 *  (the "thinking is billed" warning applies on a model swap). */
export function isReasoningSensitive(key: string): boolean {
  const u = uc(key);
  if (u.reasoning_mode && u.reasoning_mode !== "off") return true;
  return (u.model_sensitivity ?? []).some((s) => /reasoning/i.test(s));
}

/**
 * The library's first band-shaped volume hint for a use case, if any
 * (e.g. code_assistant → chat_interactions_per_dev_per_day {10/30/80}). The
 * volume drivers are the weakest layer (methodology §9) — surfaced as a band,
 * never a point, and always client-replaceable.
 */
export function volumeHint(key: string): { unitPer: string; low: number; mid: number; high: number } | null {
  const hints = uc(key).volume_hints;
  if (!hints) return null;
  for (const [k, v] of Object.entries(hints)) {
    if (v && typeof v === "object" && "low" in v && "mid" in v && "high" in v) {
      const b = v as Band;
      return { unitPer: k, low: b.low, mid: b.mid, high: b.high };
    }
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * Optimisation levers — the two families and their evidenced values.
 * ------------------------------------------------------------------ */

/** Cache read multiplier (0.1 ⇒ cached tokens cost a tenth ⇒ 90% off that share). */
export const CACHE_READ_MULTIPLIER =
  (lib.optimisation_levers.prompt_caching?.value?.cache_read_multiplier as number) ?? 0.1;

/** Batch/flex multiplier (0.5 ⇒ 50% off all tokens on batched work). */
export const BATCH_MULTIPLIER =
  (lib.optimisation_levers.batch_flex?.value?.multiplier as number) ?? 0.5;

/** Whether the library lists batch/flex as a real lever for this use case
 *  (interactive work — code assistant, live chat — is not batchable). */
export function isBatchable(key: string): boolean {
  return (uc(key).optimisation_profile?.top_levers ?? []).includes("batch_flex");
}

/** Realistic prompt-cache hit-rate bands by workload class (NOT vendor "95%" marketing). */
export function cacheHitBand(workloadClass: string): [number, number] {
  const rates = lib.optimisation_levers.prompt_caching?.realistic_hit_rates ?? {};
  const band = rates[workloadClass];
  if (Array.isArray(band)) return band as [number, number];
  return [0.1, 0.3]; // conservative single-shot default
}

/**
 * The realistic COMBINED billing envelope (share off a naive, uncached frontier
 * baseline) for a workload class — the ceiling that makes double-counting
 * structurally impossible (methodology §5 / stacking_rules). Returns the high
 * end of the mature stack as a 0–1 fraction.
 */
export function billingEnvelopeCeiling(workloadClass: string): number {
  const env = lib.stacking_rules.combined_envelopes_vs_naive_uncached_frontier[workloadClass];
  if (!env) return 0.9;
  const pct = env.mature_stack_pct ?? env.pct ?? env.base_stack_pct ?? [90, 90];
  return pct[1] / 100;
}

/* ------------------------------------------------------------------ *
 * Model-change adjustment factors (rule #4 — a model swap is a CONSUMPTION
 * event, not a price-sheet swap). Ranges only; the point re-baseline is a
 * gated-diagnostic job (methodology §6 re-baseline rule), so the public tool
 * surfaces the sensitivity band + warning rather than faking a new point.
 * ------------------------------------------------------------------ */
function factorRange(key: string, field: string): [number, number] {
  const f = lib.model_adjustment_factors[key];
  const v = f?.[field] as [number, number] | undefined;
  return Array.isArray(v) ? v : [1, 1];
}

export const tokenizerEnglishRange = () => factorRange("tokenizer_cross_vendor_english", "multiplier_on_input");
export const tokenizerCodeRange = () => factorRange("tokenizer_code", "multiplier_on_input");
export const tokenizerGenerationRange = () =>
  factorRange("tokenizer_generation_change_same_family", "multiplier_on_input");
export const verbosityRange = () => factorRange("verbosity_same_class", "multiplier_on_output");
export const reasoningRange = () => factorRange("reasoning_on_vs_off", "multiplier_on_output");
