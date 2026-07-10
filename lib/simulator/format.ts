/**
 * Number formatting for the simulator. The engine computes in USD (model list
 * prices are quoted US$); with the A$ toggle on, figures are converted ONCE in
 * lib/simulator/derive.ts at the dated RBA rate — these formatters only carry
 * the right currency symbol. Tabular figures come from the global `.tabular`
 * font-feature settings.
 */

export type Cur = "usd" | "aud";

const SYM: Record<Cur, string> = { usd: "$", aud: "A$" };

/** Full amount, no decimals: 10316 → "$10,316" / "A$10,316". */
export function usd(n: number, cur: Cur = "usd"): string {
  return SYM[cur] + Math.round(n).toLocaleString("en-US");
}

/** Compact amount: 8316 → "$8.3k", 10316 → "$10k", 282 → "$282", 5.2M → "$5.2M". */
export function usdK(n: number, cur: Cur = "usd"): string {
  if (n >= 1e6) {
    const m = n / 1e6;
    return SYM[cur] + m.toFixed(m >= 10 ? 0 : 1) + "M";
  }
  if (n >= 1000) {
    const k = n / 1000;
    return SYM[cur] + k.toFixed(n >= 10000 ? 0 : 1) + "k";
  }
  return SYM[cur] + Math.round(n);
}

/** Per-unit amount at sensible precision: $52 → "$52", $4.25 → "$4.25", $0.021 → "$0.021". */
export function usdUnit(n: number, cur: Cur = "usd"): string {
  if (n >= 100) return usd(n, cur);
  if (n >= 1) return SYM[cur] + n.toFixed(2);
  return SYM[cur] + n.toFixed(3).replace(/0$/, "");
}

/** A billions/millions token count for the usage band: 3_528_000_000 → "3.5 billion". */
export function tokenCount(n: number): string {
  if (n >= 1e9) return (n / 1e9).toFixed(1).replace(/\.0$/, "") + " billion";
  if (n >= 1e6) return Math.round(n / 1e6).toLocaleString("en-US") + " million";
  if (n >= 1e3) return Math.round(n / 1e3).toLocaleString("en-US") + "k";
  return Math.round(n).toLocaleString("en-US");
}

/** Request count for Q1: 252000 → "252k", 1_512_000 → "1.51M". */
export function requestCount(n: number): string {
  if (n >= 1e6) return (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return Math.round(n / 1e3) + "k";
  return Math.round(n).toLocaleString("en-US");
}

/** A multiple like 8.5 → "8.5×", 7.0 → "7×". */
export function multipleLabel(n: number): string {
  return n.toFixed(1).replace(/\.0$/, "") + "×";
}

/** A factor range like [0.85, 1.2] → "0.9×–1.2×". Buyer-safe (no "multiple"). */
export function rangeLabel([lo, hi]: [number, number]): string {
  return `${multipleLabel(lo)}–${multipleLabel(hi)}`;
}

/** Plain integer with grouping: 40000 → "40,000". */
export function grouped(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

/** A rail/hint number at its natural precision: 200 → "200", 0.08 → "0.08". */
export function plainNum(n: number): string {
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return String(n);
}

/** Turn a data as-of stamp ("2026-06-18" / "2026-06") into "June 2026". */
export function asOfLabel(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  if (!y || !m) return iso;
  return `${months[m - 1]} ${y}`;
}
