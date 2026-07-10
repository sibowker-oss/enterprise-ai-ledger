#!/usr/bin/env node
/**
 * Assumptions-registry gate (CTO update v2, 0.1) — runs before every build
 * (npm prebuild) and in the deploy script. The production build FAILS if:
 *
 *  1. any price-sheet record is missing source_url / effective_date /
 *     review_by / verification_status, or carries an unknown status;
 *  2. any archetype-DEFAULT model is unverified or past its review_by date;
 *  3. no verified model remains to compute the cost floor from;
 *  4. any editorial band file is missing its as_of date, or the one-off
 *     build / monthly fixed floor / rails files don't cover the exact same
 *     set of use cases (a typo in one key would silently zero a bucket);
 *  5. the FX rate or provider-facts file is missing/undated, or a provider
 *     in the price sheet has no facts record (the Q2 state would be wrong).
 *
 * Data-only checks by design: it reads the committed JSON plus the archetype
 * defaults out of lib/simulator/archetypes.ts, so it needs no TS toolchain.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));

const errors = [];
const today = new Date().toISOString().slice(0, 10);

const prices = read("data/simulator/benchmark_price_sheet.json");
const bands = read("data/simulator/benchmark_integration_risk_bands.json");
const rails = read("data/simulator/simulator_input_rails.json");
const seats = read("data/simulator/vendor_seat_prices.json");
const facts = read("data/simulator/provider_facts.json");
const fx = read("data/simulator/fx_rates.json");
const archetypesTs = readFileSync(join(root, "lib/simulator/archetypes.ts"), "utf8");

const VALID_STATUS = new Set(["verified", "unverified", "historical"]);
const isDate = (s) => typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s);

// 1. Registry completeness.
for (const [key, m] of Object.entries(prices.models)) {
  if (!m.source_url) errors.push(`price ${key}: missing source_url`);
  if (!isDate(m.effective_date)) errors.push(`price ${key}: bad effective_date`);
  if (!m.review_by) errors.push(`price ${key}: missing review_by`);
  if (!VALID_STATUS.has(m.verification_status)) {
    errors.push(`price ${key}: unknown verification_status "${m.verification_status}"`);
  }
}
if (!prices._schema?.dataVersion) errors.push("price sheet: missing _schema.dataVersion");

// 2. Default models must be verified and inside their review window.
const defaults = [...archetypesTs.matchAll(/defaultModelKey:\s*"([a-z0-9_]+)"/g)].map((m) => m[1]);
if (defaults.length === 0) errors.push("could not read any defaultModelKey from archetypes.ts");
for (const key of new Set(defaults)) {
  const m = prices.models[key];
  if (!m) {
    errors.push(`default model ${key}: not in the price sheet`);
    continue;
  }
  if (m.verification_status !== "verified") {
    errors.push(`default model ${key}: verification_status is "${m.verification_status}" — verify or change the default`);
  }
  if (isDate(m.review_by) && m.review_by < today) {
    errors.push(`default model ${key}: past its review_by (${m.review_by}) — re-verify the price`);
  }
}

// 3. At least one verified, in-date floor candidate.
const floorCandidates = Object.entries(prices.models).filter(
  ([, m]) => m.verification_status === "verified" && (!isDate(m.review_by) || m.review_by >= today),
);
if (floorCandidates.length === 0) {
  errors.push("no verified, in-date model available to compute the cost floor");
}

// 4. Editorial bands: dated, and covering the same use-case set.
for (const [name, block] of [
  ["one_off_build", bands.one_off_build],
  ["monthly_fixed_floor", bands.monthly_fixed_floor],
  ["adoption_ramp_default", bands.adoption_ramp_default],
]) {
  if (!isDate(block?.as_of)) errors.push(`${name}: missing/bad as_of`);
}
if (!isDate(rails._schema?.as_of)) errors.push("rails: missing/bad as_of");
if (!isDate(seats._schema?.as_of)) errors.push("seat prices: missing/bad as_of");

const keysets = {
  one_off_build: Object.keys(bands.one_off_build?.usd_bands ?? {}).sort(),
  monthly_fixed_floor: Object.keys(bands.monthly_fixed_floor?.usd_bands_per_month ?? {}).sort(),
  rails_units: Object.keys(rails.units ?? {}).sort(),
  rails_driver: Object.keys(rails.value_driver ?? {}).sort(),
};
const reference = JSON.stringify(keysets.rails_units);
for (const [name, keys] of Object.entries(keysets)) {
  if (JSON.stringify(keys) !== reference) {
    errors.push(`${name}: use-case keys differ from the rails file — a band would silently miss`);
  }
}
for (const [key, band] of [
  ...Object.entries(bands.one_off_build?.usd_bands ?? {}),
  ...Object.entries(bands.monthly_fixed_floor?.usd_bands_per_month ?? {}),
]) {
  if (!(band.low > 0 && band.low <= band.mid && band.mid <= band.high)) {
    errors.push(`band ${key}: low/mid/high not ordered and positive`);
  }
}

// 5. FX + provider facts.
if (!(fx.aud_usd > 0)) errors.push("fx: aud_usd missing or non-positive");
if (!isDate(fx._schema?.as_of)) errors.push("fx: missing/bad as_of");
if (!fx._schema?.source_url) errors.push("fx: missing source_url");
const providersInSheet = new Set(Object.values(prices.models).map((m) => m.provider));
for (const p of providersInSheet) {
  const f = facts.providers[p];
  if (!f) {
    errors.push(`provider ${p}: no provider_facts record — its Q2 state would be wrong`);
    continue;
  }
  if (typeof f.open_weights !== "boolean") errors.push(`provider ${p}: open_weights must be boolean`);
  if (!f.hq_jurisdiction) errors.push(`provider ${p}: missing hq_jurisdiction`);
  if (!f.source_url) errors.push(`provider ${p}: missing source_url`);
}

if (errors.length > 0) {
  console.error(`✗ Assumptions gate FAILED (${errors.length} problem${errors.length === 1 ? "" : "s"}):`);
  for (const e of errors) console.error(`  - ${e}`);
  process.exit(1);
}
const verified = Object.values(prices.models).filter((m) => m.verification_status === "verified").length;
const unverified = Object.values(prices.models).filter((m) => m.verification_status === "unverified").length;
console.log(
  `✓ Assumptions gate: ${verified} verified / ${unverified} unverified model prices · dataVersion ${prices._schema.dataVersion} · defaults + floor verified and in date.`,
);
