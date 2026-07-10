/**
 * Data access layer for the Investment-Case Simulator.
 *
 * DATA-LINE HARD RULE (concept.md §5 / handoff §5): the public build imports
 * ONLY committed reference files. No live TAIL export, no client data, no
 * cohort data, no provider figure that isn't already in these files. A reviewer
 * can confirm the moat hasn't leaked by reading this import list — it is the
 * entire data surface of the public tool.
 *
 * DEMAND SIDE (token bands, fan-out, band meaning, freshness, levers, model
 * factors) now reads ONE source of truth via ./library:
 *   data/reference/token_estimate_library_v1.json
 * which SUPERSEDES benchmark_token_priors.json v0.1 (Token Estimate Library
 * handoff rule #1 — never dual-source). The v0.1 file is retained in the repo
 * for the 18 Jun worked examples only and is no longer imported.
 *
 * SUPPLY SIDE (prices, repricing/forward signal, integration & risk bands)
 * stays on the simulator's committed copies below.
 */
import priceSheetJson from "@/data/simulator/benchmark_price_sheet.json";
import repricingJson from "@/data/simulator/benchmark_repricing_multiples.json";
import integrationJson from "@/data/simulator/benchmark_integration_risk_bands.json";
import railsJson from "@/data/simulator/simulator_input_rails.json";
import seatPricesJson from "@/data/simulator/vendor_seat_prices.json";

import { libraryPrior } from "./library";
import type { ForwardSignal, ModelPrice, ProvenanceTier, TokenPrior } from "./types";

/* ------------------------------------------------------------------ *
 * Raw JSON shapes (what the files actually contain).
 * ------------------------------------------------------------------ */
interface RawPriceSheet {
  _schema: { as_of: string };
  models: Record<string, { provider: string; input: number; output: number }>;
}
interface RawForwardProvider {
  tracked: boolean;
  tier: ProvenanceTier;
  cost_recovery_pct: number | null;
  underwater_pct: number | null;
  revenue_per_employee_usd_m: number | null;
  valuation_to_arr: number | null;
  repricing_multiple: number;
  direction: string;
  reason: string;
}
interface RawRepricing {
  multiples: Record<string, { repricing_multiple: number }>;
  forward_signal: {
    as_of: string;
    providers: Record<string, RawForwardProvider>;
    untracked_default: RawForwardProvider;
  };
}
interface RawIntegration {
  layer4_integration_run: {
    bands_per_unit_month: Record<string, { low: number; mid: number; high: number }>;
    fixed_run_bands_per_month: Record<string, { low: number; mid: number; high: number }>;
  };
  one_off_build: {
    as_of: string;
    usd_bands: Record<string, { low: number; mid: number; high: number }>;
  };
  adoption_ramp_default: { as_of: string; start_pct: number; full_month: number };
  layer5_risk_carry: {
    dollar_band_per_unit_month: Record<string, { low: number; mid: number; high: number }>;
  };
}
interface RawRail {
  min: number;
  typical: number;
  max: number;
}
interface RawRails {
  _schema: { as_of: string };
  value_realisation_default_pct: number;
  units: Record<string, RawRail>;
  value_driver: Record<string, RawRail>;
  value_rate: Record<string, RawRail>;
}
interface RawSeatProduct {
  label: string;
  vendor: string;
  usd_per_seat_month: number;
  billing: string;
  status: "official" | "official-indirect" | "reported";
  source: string;
  applies_to: string[];
}
interface RawSeatPrices {
  _schema: { as_of: string };
  products: Record<string, RawSeatProduct>;
}

const priceSheet = priceSheetJson as unknown as RawPriceSheet;
const repricing = repricingJson as unknown as RawRepricing;
const integration = integrationJson as unknown as RawIntegration;
const rails = railsJson as unknown as RawRails;
const seatPrices = seatPricesJson as unknown as RawSeatPrices;

/** Tier of a band selection: which end of the low/mid/high range to read. */
export type BandTier = "low" | "mid" | "high";

/** Providers with a tracked, provenance-graded forward-pricing read. */
const TRACKED_PROVIDERS = new Set(["openai", "anthropic", "google"]);

/* ------------------------------------------------------------------ *
 * Model price sheet (Layer 1 input — USD per million tokens).
 * ------------------------------------------------------------------ */
export function modelPrice(key: string): ModelPrice {
  const m = priceSheet.models[key];
  if (!m) throw new Error(`Unknown model key: ${key}`);
  return { key, provider: m.provider, inputPerM: m.input, outputPerM: m.output };
}

export function hasModel(key: string): boolean {
  return key in priceSheet.models;
}

export const priceSheetAsOf = priceSheet._schema.as_of;

/* ------------------------------------------------------------------ *
 * Token bands (the maturity band source) — now from the Token Estimate
 * Library via ./library. Bands carry their meaning (band_semantics), fan-out,
 * default model and freshness (as_of / review_by). Rendered figures must show
 * as_of (rule #2). For the five simulator use cases the input/output bands are
 * identical to v0.1, so the switch is numerically inert on the bands; the gain
 * is provenance, fan-out, volume correction and the lever/model machinery.
 * ------------------------------------------------------------------ */
export function tokenPrior(libraryKey: string): {
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
  return libraryPrior(libraryKey);
}

// Re-export the library's shared reads so the rest of the app has one demand-
// side entry point (data.ts), keeping the import graph legible for the moat check.
export {
  libraryAsOf,
  libraryVersion,
  librarySupersedes,
  bandSemantics,
  volumeHint,
  modelSensitivity,
  isReasoningSensitive,
  isBatchable,
  declaredCacheShare,
  dollarAnchor,
  cacheHitBand,
  billingEnvelopeCeiling,
  CACHE_READ_MULTIPLIER,
  BATCH_MULTIPLIER,
  tokenizerEnglishRange,
  tokenizerCodeRange,
  tokenizerGenerationRange,
  verbosityRange,
  reasoningRange,
} from "./library";

/* ------------------------------------------------------------------ *
 * Repricing multiple + forward-pricing signal (the Q2 / TAIL-unique layer).
 * ------------------------------------------------------------------ */

/** Map a price-sheet provider (lower-case) to its repricing/forward key. */
export function forwardKeyForProvider(provider: string): string {
  return TRACKED_PROVIDERS.has(provider) ? provider : "untracked";
}

/** The "if prices rise" multiplier for a provider, from the multiples block. */
export function repricingMultiple(provider: string): number {
  const key = forwardKeyForProvider(provider);
  const entry = repricing.multiples[key] ?? repricing.multiples.untracked;
  return entry.repricing_multiple;
}

/** The full forward-pricing read for a provider (Q2 panel). */
export function forwardSignal(provider: string): ForwardSignal {
  const key = forwardKeyForProvider(provider);
  const raw =
    key !== "untracked"
      ? repricing.forward_signal.providers[key] ?? repricing.forward_signal.untracked_default
      : repricing.forward_signal.untracked_default;
  return {
    tracked: raw.tracked,
    tier: raw.tier,
    costRecoveryPct: raw.cost_recovery_pct,
    underwaterPct: raw.underwater_pct,
    revenuePerEmployeeUsdM: raw.revenue_per_employee_usd_m,
    valuationToArr: raw.valuation_to_arr,
    repricingMultiple: raw.repricing_multiple,
    direction: raw.direction,
    reason: raw.reason,
  };
}

export const forwardSignalAsOf = repricing.forward_signal.as_of;

/** Raw multiples block — exposed for the data-integrity test only. */
export const rawMultiples = repricing.multiples;
export const rawForwardProviders = repricing.forward_signal.providers;

/* ------------------------------------------------------------------ *
 * Integration & risk-carry bands (Layers 4 & 5 — build & run cost).
 * ------------------------------------------------------------------ */

/** Per-unit Layer-4 band (e.g. "light"/"medium"/"heavy") in USD per unit per month. */
export function layer4PerUnit(complexity: string, tier: BandTier): number {
  const band = integration.layer4_integration_run.bands_per_unit_month[complexity];
  if (!band) throw new Error(`Unknown Layer-4 complexity band: ${complexity}`);
  return band[tier];
}

/** Fixed Layer-4 build/run band (e.g. "rag_retrieval"/"agentic_orchestration") in USD/month. */
export function layer4Fixed(bandKey: string, tier: BandTier): number {
  const band = integration.layer4_integration_run.fixed_run_bands_per_month[bandKey];
  if (!band) throw new Error(`Unknown Layer-4 fixed band: ${bandKey}`);
  return band[tier];
}

/** Per-unit Layer-5 governance-carry band in USD per unit per month. */
export function layer5PerUnit(governance: string, tier: BandTier): number {
  const band = integration.layer5_risk_carry.dollar_band_per_unit_month[governance];
  if (!band) throw new Error(`Unknown Layer-5 governance band: ${governance}`);
  return band[tier];
}

/* ------------------------------------------------------------------ *
 * One-off build band + default adoption ramp (the first-year budget line).
 * ------------------------------------------------------------------ */

export interface OneOffBuildBand {
  low: number;
  mid: number;
  high: number;
}

/** The editorial one-off build cost band for a use case (USD, capex-style). */
export function oneOffBuild(archetypeKey: string): OneOffBuildBand {
  const band = integration.one_off_build.usd_bands[archetypeKey];
  if (!band) throw new Error(`No one-off build band for archetype: ${archetypeKey}`);
  return band;
}

export const oneOffBuildAsOf = integration.one_off_build.as_of;

/** Raw one-off build bands — exposed for the data-integrity test only. */
export const rawOneOffBuildBands = integration.one_off_build.usd_bands;

/** The editable adoption-ramp default (50% month 1 → 100% by month 4). */
export function adoptionRampDefault(): { startPct: number; fullMonth: number } {
  return {
    startPct: integration.adoption_ramp_default.start_pct,
    fullMonth: integration.adoption_ramp_default.full_month,
  };
}

/* ------------------------------------------------------------------ *
 * Input rails — soft min/typical/max plausibility bounds per use case.
 * ------------------------------------------------------------------ */

export interface InputRail {
  min: number;
  typical: number;
  max: number;
}

export function unitsRail(archetypeKey: string): InputRail | null {
  return rails.units[archetypeKey] ?? null;
}

export function driverRail(archetypeKey: string): InputRail | null {
  return rails.value_driver[archetypeKey] ?? null;
}

export function rateRail(archetypeKey: string): InputRail | null {
  return rails.value_rate[archetypeKey] ?? null;
}

export const railsAsOf = rails._schema.as_of;

/** Default share of the entered value the verdict counts (the Q4 realisation slider). */
export const HAIRCUT_DEFAULT_PCT = rails.value_realisation_default_pct;

/** Raw rails — exposed for the data-integrity test only. */
export const rawRails = { units: rails.units, driver: rails.value_driver, rate: rails.value_rate };

/* ------------------------------------------------------------------ *
 * Vendor seat prices — the public buy-the-seat comparison (seat-shaped
 * use cases only; public list prices, each with its verification status).
 * ------------------------------------------------------------------ */

export interface SeatProduct {
  key: string;
  label: string;
  vendor: string;
  perSeatUsd: number;
  billing: string;
  /** How the price was verified: official page / official-indirect / reported-only. */
  status: "official" | "official-indirect" | "reported";
  source: string;
}

/** Seat products applicable to a use case (empty = not seat-shaped, render nothing). */
export function seatProductsFor(archetypeKey: string): SeatProduct[] {
  return Object.entries(seatPrices.products)
    .filter(([, p]) => p.applies_to.includes(archetypeKey))
    .map(([key, p]) => ({
      key,
      label: p.label,
      vendor: p.vendor,
      perSeatUsd: p.usd_per_seat_month,
      billing: p.billing,
      status: p.status,
      source: p.source,
    }));
}

export const seatPricesAsOf = seatPrices._schema.as_of;

/** Raw seat products — exposed for the data-integrity test only. */
export const rawSeatProducts = seatPrices.products;
