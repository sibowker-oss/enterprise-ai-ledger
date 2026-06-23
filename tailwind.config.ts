import type { Config } from "tailwindcss";
import { palette, status, costTypeColor, radii } from "./styles/tokens";

/**
 * Tailwind consumes the centralised design tokens (styles/tokens.ts) so the
 * utility classes and the chart/SVG fills never drift. Reskin to TAIL by
 * editing tokens.ts, not this file.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: palette.paper,
        surface: palette.surface,
        "surface-muted": palette.surfaceMuted,
        "nav-bg": palette.navBg,
        ink: palette.ink,
        "ink-muted": palette.inkMuted,
        "ink-faint": palette.inkFaint,
        border: palette.border,
        "border-strong": palette.borderStrong,
        accent: palette.accent,
        "accent-hover": palette.accentHover,
        "accent-soft": palette.accentSoft,
        "accent-text": palette.accentText,
        // Status — fg/soft/solid exposed as nested utilities (text-status-green-fg etc.)
        "status-green": { fg: status.green.fg, soft: status.green.soft, solid: status.green.solid },
        "status-amber": { fg: status.amber.fg, soft: status.amber.soft, solid: status.amber.solid },
        "status-red": { fg: status.red.fg, soft: status.red.soft, solid: status.red.solid },
        "status-grey": { fg: status.grey.fg, soft: status.grey.soft, solid: status.grey.solid },
        "cost-licences": costTypeColor.licences,
        "cost-tokens": costTypeColor.tokens,
        "cost-cloud": costTypeColor.cloud,
        "cost-integration": costTypeColor.integration,
        "cost-people": costTypeColor.people,
      },
      borderRadius: {
        chip: radii.chip,
        card: radii.card,
        tile: radii.tile,
        control: radii.control,
      },
      fontFamily: {
        sans: ['var(--font-sans)', "ui-sans-serif", "system-ui", "sans-serif"],
      },
      fontFeatureSettings: {
        numeric: '"tnum" 1, "lnum" 1',
      },
    },
  },
  plugins: [],
};

export default config;
