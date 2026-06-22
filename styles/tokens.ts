/**
 * Design tokens — the single source of truth for the Enterprise AI Ledger's
 * visual system. Centralised here (per BUILD_SPEC §7/§8) so the prototype can
 * be reskinned to TAIL's real palette by editing this one file.
 *
 * Principles:
 *  - Neutral, editorial base (off-white paper, near-black ink). One restrained
 *    accent for interactive elements.
 *  - Semantic colour (green/amber/red) is reserved STRICTLY for status — RAG
 *    risk and scale/fix/stop decisions. Never use it decoratively.
 *  - Chips must never rely on colour alone; these tokens pair a `fg`/`bg` with
 *    a `label` so components can carry text + icon as well as colour (AA).
 *
 * NOTE: these are plain hex values (not Tailwind class names) so the same
 * tokens can feed Tailwind, inline SVG charts (Recharts), and the print
 * stylesheet without divergence.
 */

export const palette = {
  // Neutral base
  paper: "#FAF9F6", // off-white page background
  surface: "#FFFFFF", // cards / panels
  surfaceMuted: "#F2F1ED", // subtle fills, table zebra
  ink: "#1A1A18", // near-black primary text
  inkMuted: "#5B5A55", // secondary text
  inkFaint: "#8A8984", // tertiary / captions
  border: "#E3E1DB", // hairlines, dividers
  borderStrong: "#CBC8C0",

  // One restrained interactive accent (slate-blue — calm, "trustworthy")
  accent: "#2F4858",
  accentHover: "#243845",
  accentSoft: "#E7ECEF",
} as const;

/**
 * Semantic status colours. Each carries a strong `fg` (AA on its own `soft`
 * background and on white), a `soft` chip background, and a `solid` for chart
 * fills / bars. Decision and RAG share the same green/amber/red ramp by design
 * (scale↔green, fix↔amber, stop↔red) — the deck ties them together.
 */
export const status = {
  green: { fg: "#1F6B3B", soft: "#E5F0E8", solid: "#2E7D49", label: "Green" },
  amber: { fg: "#8A5A00", soft: "#FBF0DC", solid: "#C07D12", label: "Amber" },
  red: { fg: "#A11E1E", soft: "#F7E3E1", solid: "#C0392B", label: "Red" },
  // "stop" leans on red but the deck also allows a neutral/grey reading; keep a
  // dedicated grey for the stop-decision chip variant where red is too loud.
  grey: { fg: "#44433E", soft: "#ECEAE4", solid: "#6B6A64", label: "Grey" },
} as const;

/** Decision → status colour mapping (BUILD_SPEC §5.2). */
export const decisionColor = {
  scale: status.green,
  fix: status.amber,
  stop: status.red,
} as const;

/** RAG → status colour mapping. */
export const ragColor = {
  green: status.green,
  amber: status.amber,
  red: status.red,
} as const;

/** Cost-type palette for the donut — neutral ramp, NOT semantic green/amber/red. */
export const costTypeColor = {
  licences: "#2F4858",
  tokens: "#5B7C8D",
  cloud: "#8FA9B5",
  integration: "#B7C5C9",
  people: "#D8D5CC",
} as const;

export const typography = {
  // One clean sans for UI; system stack keeps the prototype dependency-light.
  sans: 'var(--font-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)',
  // Tabular figures everywhere numbers appear, so columns align.
  numericFeatures: '"tnum" 1, "lnum" 1',
} as const;

export const radii = {
  chip: "9999px",
  card: "10px",
  control: "6px",
} as const;

export const tokens = {
  palette,
  status,
  decisionColor,
  ragColor,
  costTypeColor,
  typography,
  radii,
} as const;

export type Tokens = typeof tokens;
export default tokens;
