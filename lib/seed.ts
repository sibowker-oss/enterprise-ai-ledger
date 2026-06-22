/**
 * Typed accessor for the seed data. This is the ONLY module that imports the
 * raw JSON; everything else consumes these typed exports. The cast to
 * `SeedData` is the single point where a JSON-shape drift would surface as a
 * type error (see lib/types.ts).
 *
 * Never invent numbers in code — every figure in the app derives from here.
 */
import rawSeed from "@/data/seed-data.json";
import rawBenchmarks from "@/data/ledger-benchmarks.json";
import type {
  SeedData,
  UseCase,
  PortfolioRollup,
  ValueRollup,
  Company,
  Meta,
  Benchmarks,
} from "./types";

export const seed = rawSeed as unknown as SeedData;

export const company: Company = seed.company;
export const meta: Meta = seed.meta;
export const useCases: UseCase[] = seed.useCases;

/** The roll-ups baked into the JSON — the reference the selectors are tested against. */
export const declaredRollup: PortfolioRollup = seed.portfolioRollup;
export const declaredValueRollup: ValueRollup = seed.valueRollup;

/** Real AI Ledger (TAIL) market-economics snapshot — the differentiation layer. */
export const benchmarks: Benchmarks = rawBenchmarks as unknown as Benchmarks;

export default seed;
