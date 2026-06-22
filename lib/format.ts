/**
 * Number / currency formatting. All figures are AUD. Two registers:
 *  - `aud()`        full precision for tables that must reconcile (A$902,000).
 *  - `audCompact()` editorial KPI shorthand (A$3.71M, A$526K) for hero numbers.
 *
 * Everything renders with tabular figures via the `.tabular` CSS class so
 * numeric columns align (BUILD_SPEC §7).
 */

// NOTE: en-AU renders AUD as the local "$" (e.g. "$902,000"). We want the
// explicit "A$" prefix everywhere (matches the spec + distinguishes AUD), so we
// format with en-US, which renders AUD as "A$" with identical comma grouping.
const AUD = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "AUD",
  maximumFractionDigits: 0,
});

/** Full AUD, no decimals: 902000 → "A$902,000". */
export function aud(value: number): string {
  return AUD.format(value);
}

/** Plain grouped integer (no symbol): 902000 → "902,000". */
export function grouped(value: number): string {
  return new Intl.NumberFormat("en-AU", { maximumFractionDigits: 0 }).format(
    value,
  );
}

/**
 * Editorial KPI shorthand:
 *   3_713_000 → "A$3.71M"
 *     526_000 → "A$526K"
 *      43_833 → "A$43.8K"
 */
export function audCompact(value: number): string {
  const abs = Math.abs(value);
  if (abs >= 1_000_000) {
    return `A$${(value / 1_000_000).toFixed(2)}M`;
  }
  if (abs >= 1_000) {
    const k = value / 1_000;
    // Whole thousands lose the decimal (526K not 526.0K).
    const text = Number.isInteger(k) ? k.toFixed(0) : k.toFixed(1);
    return `A$${text}K`;
  }
  return aud(value);
}

/** Monthly view of an annual figure. */
export function monthly(annual: number): number {
  return Math.round(annual / 12);
}

/** Percent of a whole, rounded: pct(526000, 3713000) → "14%". */
export function pct(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${Math.round((part / whole) * 100)}%`;
}

/** Percent with one decimal where it matters. */
export function pct1(part: number, whole: number): string {
  if (whole === 0) return "0%";
  return `${((part / whole) * 100).toFixed(1)}%`;
}

/** Human date: "2026-09-30" → "30 Sep 2026". */
export function reviewDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return `${d} ${months[m - 1]} ${y}`;
}
