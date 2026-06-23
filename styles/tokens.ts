/**
 * Design tokens — the single source of truth for the Enterprise AI Ledger's
 * visual system. The Enterprise AI Ledger is a data-first product and the
 * sister surface to The AI Ledger (TAIL), so it adopts the **Ledger (dark)
 * surface** of the Hepburn Advisory design system:
 *   page #0A0E1A · cards #111827 · nav #0F172A · blue accent #3B82F6.
 *
 * Design-system rules honoured here:
 *  - Semantic colour only: green/amber/red are reserved for status (RAG risk,
 *    scale/fix/stop). Red also appears for "reality-check" annotations (the
 *    future-pricing uplift). Charts use a cool, non-semantic ramp.
 *  - No gradient backgrounds. Tabular figures everywhere. AA contrast on dark.
 *  - To reskin to the light Advisory surface, this one file flips.
 */

export const palette = {
  // Ledger (dark) base
  paper: "#0A0E1A", // page background
  surface: "#111827", // cards / panels
  surfaceMuted: "#1A2332", // subtle fills, table zebra, hover
  navBg: "#0F172A", // sticky nav / sidebar
  ink: "#F1F5F9", // primary text (light on dark)
  inkMuted: "#9CA8BA", // secondary text
  inkFaint: "#8A95A6", // tertiary / captions (AA on dark)
  border: "#1F2937", // hairlines, dividers
  borderStrong: "#374151",

  // Interactive accent — blue (links, primary actions)
  accent: "#3B82F6",
  accentHover: "#60A5FA",
  accentSoft: "#16243C", // dark blue-tinted chip / active-nav background
  accentText: "#93C5FD", // bright blue text on dark tints
} as const;

/**
 * Semantic status colours, tuned for AA on the dark surface. `fg` is a bright
 * readable text colour, `soft` a low-opacity tinted chip background, `solid`
 * a chart/bar fill.
 */
export const status = {
  green: { fg: "#4ADE80", soft: "#10271B", solid: "#22C55E", label: "Green" },
  amber: { fg: "#FBBF24", soft: "#2C2310", solid: "#F59E0B", label: "Amber" },
  red: { fg: "#F87171", soft: "#2C1718", solid: "#EF4444", label: "Red" },
  grey: { fg: "#94A3B8", soft: "#1C2430", solid: "#64748B", label: "Grey" },
} as const;

/** Decision → status colour mapping (scale↔green, fix↔amber, stop↔red). */
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

/**
 * Cost-type ramp for charts — a cool, NON-semantic set (blue/cyan/indigo/sky/
 * slate) so it never reads as the Ledger's semantic layer colours and never
 * collides with green/amber/red status. Tokens get the standout cyan (the
 * "tokens are nearly as big as licences" aha).
 */
export const costTypeColor = {
  licences: "#3B82F6",
  tokens: "#22D3EE",
  cloud: "#818CF8",
  integration: "#38BDF8",
  people: "#64748B",
} as const;

export const typography = {
  // Inter for UI (self-hosted via next/font); tabular figures for all numbers.
  sans: 'var(--font-sans, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif)',
  numericFeatures: '"tnum" 1, "lnum" 1',
  eyebrowTracking: "0.08em", // design-system eyebrow tracking
} as const;

export const radii = {
  chip: "9999px",
  card: "12px",
  tile: "16px",
  control: "8px",
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
