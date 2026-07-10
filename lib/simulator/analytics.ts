/**
 * Funnel analytics (CTO review 2026-07-10 item 12), following the TAIL
 * analytics-instrumentation pattern (2026-07-02 brief): GA4 gtag, one shared
 * property, custom events for the moments that matter — which use cases pull
 * executives in, which verdicts they reach, whether the CTA fires.
 *
 * PRIVACY / DATA-LINE RULE: events carry ONLY categorical metadata (use-case
 * key, model key, verdict class, field name). No user-entered number — volumes,
 * value figures, rates — ever leaves the browser. The buyer's numbers are the
 * buyer's.
 *
 * The measurement ID reuses the TAIL property per the brief's pattern; override
 * with NEXT_PUBLIC_GA_ID at build time. NOTE for go-live: if the GA4 property
 * has a hostname data-filter active (per the 2026-07-02 brief §4), this page's
 * host must be added or these events will be dropped — flagged in the hand-off.
 */

export const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_GA_ID ?? "G-211EY55BEQ";

export type SimEvent =
  | "sim_use_case_switch"
  | "sim_model_switch"
  | "sim_value_edit"
  | "sim_verdict_state"
  | "sim_cta_click"
  | "sim_copy_link"
  | "sim_print_summary"
  | "sim_pin_case";

type Gtag = (...args: unknown[]) => void;

/** Fire a GA4 event. No-ops when gtag isn't loaded (dev, tests, blocked). */
export function track(event: SimEvent, params: Record<string, string> = {}): void {
  if (typeof window === "undefined") return;
  const gtag = (window as unknown as { gtag?: Gtag }).gtag;
  if (typeof gtag !== "function") return;
  gtag("event", event, { ...params, tool: "investment_case_simulator" });
}
