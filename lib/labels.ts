/**
 * Display metadata for status values. The long legend text lives in the seed
 * JSON (`meta.decisionLegend` / `meta.ragLegend`); this file adds only the
 * presentational bits the JSON doesn't carry — short label, semantic tone, and
 * a distinct glyph so chips signal status by SHAPE + TEXT as well as colour
 * (BUILD_SPEC §7 accessibility: never colour alone).
 */
import type { Confidence, Decision, RAG } from "./types";

export type Tone = "green" | "amber" | "red" | "grey";

export interface StatusMeta {
  label: string;
  tone: Tone;
  /** Distinct glyph per value — redundant encoding for colour-blind users. */
  glyph: string;
}

export const decisionMeta: Record<Decision, StatusMeta> = {
  scale: { label: "Scale", tone: "green", glyph: "▲" },
  fix: { label: "Fix", tone: "amber", glyph: "◆" },
  stop: { label: "Stop", tone: "red", glyph: "■" },
};

export const ragMeta: Record<RAG, StatusMeta> = {
  green: { label: "Green", tone: "green", glyph: "●" },
  amber: { label: "Amber", tone: "amber", glyph: "◑" },
  red: { label: "Red", tone: "red", glyph: "■" },
};

export interface ConfidenceMeta {
  label: string;
  /** Filled steps out of 4 (the dot/pill spine in the Outcome Ledger). */
  steps: number;
}

export const confidenceMeta: Record<Confidence, ConfidenceMeta> = {
  low: { label: "Low", steps: 1 },
  medium: { label: "Medium", steps: 2 },
  "medium-high": { label: "Medium-high", steps: 3 },
  high: { label: "High", steps: 4 },
};

/** Human label for a cost component. */
export const costComponentLabel: Record<string, string> = {
  licences: "Licences",
  tokens: "Tokens",
  cloud: "Cloud",
  integration: "Integration",
  people: "People",
};
