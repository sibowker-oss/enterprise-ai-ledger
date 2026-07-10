/**
 * Data access layer for the Investment-Case Simulator.
 *
 * DATA-LINE HARD RULE (concept.md §5 / handoff §5): the public build imports
 * ONLY committed reference files. No live TAIL export, no client data, no
 * cohort data, no provider figure that isn't already in these files. A reviewer
 * can confirm the moat hasn't leaked by reading this import list — it is the
 * entire data surface of the public tool.
 *
 * ASSUMPTIONS REGISTRY (CTO update v2, 0.1): the price sheet is now a
 * verification registry — every record carries source_url, effective_date,
 * review_by, verification_status and confidence. Unverified models are
 * excluded from floor/routing/default calculations (still selectable,
 * labelled). scripts/validate_assumptions.mjs gates the production build.
 * Every rendered "as of" date is generated from these files, never hard-coded.
 *
 * DEMAND SIDE (token bands, fan-out, band meaning, freshness, levers, model
 * factors) reads ONE source of truth via ./library:
 *   data/reference/token_estimate_library_v1.json
 * which SUPERSEDES benchmark_token_priors.json v0.1 (never dual-source).
 */
import priceSheetJson from "@/data/simulator/benchmark_price_sheet.json";
import repricingJson from "@/data/simulator/benchmark_repricing_multiples.json";
import integrationJson from "@/data/simulator/benchmark_integration_risk_bands.json";
import railsJson from "@/data/simulator/simulator_input_rails.json";
import seatPricesJson from "@/data/simulator/vendor_seat_prices.json";
import providerFactsJson from "@/data/simulator/provider_facts.json";
import fxJson from "@/data/simulator/fx_rates.json";

import { libraryAsOf, libraryPrior, libraryVersion } from "./library";
import type { ForwardSignal, ForwardState, ModelPrice, ProvenanceTier, TokenPrior } from "./types";

/* ------------------------------------------------------------------ *
 * Raw JSON shapes (what the files actually contain).
 * ------------------------------------------------------------------ */
export type VerificationStatus = "verified" | "unverified" | "historical";

interface RawModelRecord {
  provider: string;
  input: number;
  output: number;
  tier: string;
  verification_status: VerificationStatus;
  confidence: string;
  source_url: string;
  effective_date: string;
  review_by: string;
  note?: string;
}
interface RawPriceSheet {
  _schema: { as_of: string; dataVersion: string; version: string };
  models: Record<string, RawModelRecord>;
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
    untracked_hosted_default: RawForwardProvider;
  };
}
interface Band {
  low: number;
  mid: number;
  high: number;
}
interface RawIntegration {
  layer4_integration_run: {
    bands_per_unit_month: Record<string, Band>;
    fixed_run_bands_per_month: Record<string, Band>;
  };
  one_off_build: { as_of: string; usd_bands: Record<string, Band> };
  monthly_fixed_floor: { as_of: string; usd_bands_per_month: Record<string, Band> };
  adoption_ramp_default: { as_of: string; start_pct: number; full_month: number };
  layer5_risk_carry: {
    dollar_band_per_unit_month: Record<string, Band>;
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
interface RawProviderFact {
  label: string;
  open_weights: boolean;
  hosted_api: boolean;
  hq_jurisdiction: string;
  source_url: string;
  confidence: string;
  note?: string;
}
interface RawProviderFacts {
  _schema: { as_of: string };
  providers: Record<string, RawProviderFact>;
}
interface RawFx {
  _schema: { as_of: string; source_url: string; review_by: string };
  aud_usd: number;
}

const priceSheet = priceSheetJson as unknown as RawPriceSheet;
const repricing = repricingJson as unknown as RawRepricing;
const integration = integrationJson as unknown as RawIntegration;
const rails = railsJson as unknown as RawRails;
const seatPrices = seatPricesJson as unknown as RawSeatPrices;
const providerFactsFile = providerFactsJson as unknown as RawProviderFacts;
const fx = fxJson as unknown as RawFx;

/** Tier of a band selection: which end of the low/mid/high range to read. */
export type BandTier = "low" | "mid" | "high";

/** Providers with a tracked, provenance-graded forward-pricing read. */
const TRACKED_PROVIDERS = new Set(["openai", "anthropic", "google"]);

/**
 * The composite data version shown in the footer and stamped on exports —
 * the price sheet (the fastest-moving file) carries it for the whole set.
 */
export const DATA_VERSION = priceSheet._schema.dataVersion;

/* ------------------------------------------------------------------ *
 * Model price sheet (Layer 1 input — USD per million tokens) + the
 * verification registry around it.
 * ------------------------------------------------------------------ */
export function modelPrice(key: string): ModelPrice {
  const m = priceSheet.models[key];
  if (!m) throw new Error(`Unknown model key: ${key}`);
  return { key, provider: m.provider, inputPerM: m.input, outputPerM: m.output };
}

export function hasModel(key: string): boolean {
  return key in priceSheet.models;
}

export interface ModelMeta {
  verificationStatus: VerificationStatus;
  confidence: string;
  sourceUrl: string;
  effectiveDate: string;
  reviewBy: string;
}

export function modelMeta(key: string): ModelMeta {
  const m = priceSheet.models[key];
  if (!m) throw new Error(`Unknown model key: ${key}`);
  return {
    verificationStatus: m.verification_status,
    confidence: m.confidence,
    sourceUrl: m.source_url,
    effectiveDate: m.effective_date,
    reviewBy: m.review_by,
  };
}

/** Verified against the vendor's own page — eligible for floor/routing/defaults. */
export function isModelVerified(key: string): boolean {
  return priceSheet.models[key]?.verification_status === "verified";
}

export const priceSheetAsOf = priceSheet._schema.as_of;

/** Raw model records — exposed for the data-integrity tests only. */
export const rawModelRecords = priceSheet.models;

/* ------------------------------------------------------------------ *
 * Provider facts (CTO update v2, 0.2 + A4) — FACTS ONLY: open weights,
 * hosted API, HQ jurisdiction. No suitability opinions, no scores.
 * ------------------------------------------------------------------ */
export interface ProviderFacts {
  key: string;
  label: string;
  openWeights: boolean;
  hostedApi: boolean;
  hqJurisdiction: string;
}

export function providerFacts(provider: string): ProviderFacts | null {
  const p = providerFactsFile.providers[provider];
  if (!p) return null;
  return {
    key: provider,
    label: p.label,
    openWeights: p.open_weights,
    hostedApi: p.hosted_api,
    hqJurisdiction: p.hq_jurisdiction,
  };
}

export const providerFactsAsOf = providerFactsFile._schema.as_of;

/** Raw provider facts — exposed for the data-integrity tests only. */
export const rawProviderFacts = providerFactsFile.providers;

/* ------------------------------------------------------------------ *
 * Token bands — from the Token Estimate Library via ./library.
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
 * THREE states (CTO update v2, 0.2): tracked-provider read / open-weights
 * read / neutral "not tracked". The old two-state fallback rendered hosted
 * models (Grok 3) as "open-source, run in-house" — fixed at the class level.
 * ------------------------------------------------------------------ */

export type { ForwardState } from "./types";

/** Which forward-pricing state a provider resolves to. */
export function forwardStateForProvider(provider: string): ForwardState {
  if (TRACKED_PROVIDERS.has(provider)) return "tracked";
  return providerFacts(provider)?.openWeights ? "open" : "neutral";
}

/** The "if prices rise" multiplier for a provider, from the multiples block. */
export function repricingMultiple(provider: string): number {
  const key = TRACKED_PROVIDERS.has(provider) ? provider : "untracked";
  const entry = repricing.multiples[key] ?? repricing.multiples.untracked;
  return entry.repricing_multiple;
}

/** The full forward-pricing read for a provider (Q2 panel). */
export function forwardSignal(provider: string): ForwardSignal {
  const state = forwardStateForProvider(provider);
  const raw =
    state === "tracked"
      ? repricing.forward_signal.providers[provider] ?? repricing.forward_signal.untracked_hosted_default
      : state === "open"
        ? repricing.forward_signal.untracked_default
        : repricing.forward_signal.untracked_hosted_default;
  return {
    state,
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
 * Cost buckets beyond AI usage (CTO update v2, 0.3): ONE-OFF BUILD +
 * MONTHLY FIXED floor + PER-USE marginals. Totals must reconcile.
 * ------------------------------------------------------------------ */

/** Per-unit Layer-4 band (e.g. "light"/"medium"/"heavy") in USD per unit per month. */
export function layer4PerUnit(complexity: string, tier: BandTier): number {
  const band = integration.layer4_integration_run.bands_per_unit_month[complexity];
  if (!band) throw new Error(`Unknown Layer-4 complexity band: ${complexity}`);
  return band[tier];
}

/** Per-unit Layer-5 governance-carry band in USD per unit per month. */
export function layer5PerUnit(governance: string, tier: BandTier): number {
  const band = integration.layer5_risk_carry.dollar_band_per_unit_month[governance];
  if (!band) throw new Error(`Unknown Layer-5 governance band: ${governance}`);
  return band[tier];
}

/** The monthly FIXED floor for a use case — platform, monitoring, the people
 *  checking its work. Carried whether one person uses it or a thousand. */
export function monthlyFixedFloor(archetypeKey: string, tier: BandTier): number {
  const band = integration.monthly_fixed_floor.usd_bands_per_month[archetypeKey];
  if (!band) throw new Error(`No monthly fixed floor for archetype: ${archetypeKey}`);
  return band[tier];
}

export const monthlyFixedFloorAsOf = integration.monthly_fixed_floor.as_of;

/** Raw floor bands — exposed for the data-integrity test only. */
export const rawMonthlyFixedFloorBands = integration.monthly_fixed_floor.usd_bands_per_month;

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
 * Vendor seat prices — the public buy-the-seat comparison.
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

/* ------------------------------------------------------------------ *
 * FX — one dated, sourced rate for the A$ display toggle.
 * ------------------------------------------------------------------ */

/** RBA AUD/USD reference rate (1 A$ buys this many US$). */
export const AUD_USD = fx.aud_usd;
/** US$ → A$ conversion factor, derived (never stored twice). */
export const USD_TO_AUD = 1 / fx.aud_usd;
export const fxAsOf = fx._schema.as_of;
export const fxSourceUrl = fx._schema.source_url;

/* ------------------------------------------------------------------ *
 * Assumptions & sources index (CTO update v2, 0.1) — every decision-
 * driving figure, its source, date and status, for the drawer and the
 * print one-pager. Unknown displays as unknown.
 * ------------------------------------------------------------------ */

export interface AssumptionRow {
  group: string;
  label: string;
  value: string;
  source: string;
  date: string;
  status: string;
}

const host = (url: string) => {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "unknown";
  }
};

export function assumptionsIndex(): AssumptionRow[] {
  const rows: AssumptionRow[] = [];
  for (const [key, m] of Object.entries(priceSheet.models)) {
    if (m.verification_status === "historical") continue;
    rows.push({
      group: "Model prices (US$ per million tokens)",
      label: key,
      value: `$${m.input} in / $${m.output} out`,
      source: host(m.source_url),
      date: m.effective_date,
      status: m.verification_status === "verified" ? "checked against the source" : "price unverified",
    });
  }
  for (const [key, p] of Object.entries(providerFactsFile.providers)) {
    rows.push({
      group: "Provider facts",
      label: p.label,
      value: `${p.open_weights ? "open weights" : "hosted only"} · based in ${p.hq_jurisdiction}`,
      source: host(p.source_url),
      date: providerFactsFile._schema.as_of,
      status: p.confidence === "high" ? "checked against the source" : p.confidence,
    });
    void key;
  }
  rows.push({
    group: "Price-hold figures",
    label: "Provider cost recovery, losses, room to rise",
    value: "shown on step 2, per provider",
    source: "The AI Ledger",
    date: repricing.forward_signal.as_of,
    status: "dated snapshot — the maintained read is part of the full version",
  });
  rows.push({
    group: "Usage estimates",
    label: `Token estimate library v${libraryVersion}`,
    value: "per-use-case reading/writing bands",
    source: "editorial, anchored to named public evidence",
    date: libraryAsOf,
    status: "editorial",
  });
  rows.push(
    {
      group: "Running-cost bands",
      label: "One-off build",
      value: "ranged, per use case",
      source: "editorial",
      date: integration.one_off_build.as_of,
      status: "editorial — replace with your own quote",
    },
    {
      group: "Running-cost bands",
      label: "Monthly fixed floor",
      value: "ranged, per use case",
      source: "editorial",
      date: integration.monthly_fixed_floor.as_of,
      status: "editorial — replace with your own figure",
    },
    {
      group: "Running-cost bands",
      label: "Rollout plan default",
      value: `${integration.adoption_ramp_default.start_pct}% month 1 → everyone on by month ${integration.adoption_ramp_default.full_month}`,
      source: "editorial",
      date: integration.adoption_ramp_default.as_of,
      status: "a planning assumption — editable",
    },
  );
  rows.push({
    group: "Value realism",
    label: "Share of entered value counted",
    value: `${rails.value_realisation_default_pct}% by default`,
    source: "editorial",
    date: rails._schema.as_of,
    status: "editorial — the slider is yours",
  });
  for (const [key, p] of Object.entries(seatPrices.products)) {
    rows.push({
      group: "Vendor seat prices (US$)",
      label: p.label,
      value: `$${p.usd_per_seat_month}/seat/mo`,
      source: host(`https://${p.source.split(" ")[0]}`) === "unknown" ? p.source : p.source.split(" ")[0],
      date: seatPrices._schema.as_of,
      status:
        p.status === "official"
          ? "checked against the source"
          : p.status === "official-indirect"
            ? "official source, checked indirectly"
            : "reported — no published price",
    });
    void key;
  }
  rows.push({
    group: "Currency",
    label: "A$ conversion rate",
    value: `AUD/USD ${fx.aud_usd}`,
    source: host(fx._schema.source_url),
    date: fx._schema.as_of,
    status: "checked against the source",
  });
  return rows;
}
