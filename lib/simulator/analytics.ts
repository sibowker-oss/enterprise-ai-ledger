/**
 * Funnel analytics (CTO review item 12, retained by update v2), following the
 * TAIL analytics-instrumentation pattern (2026-07-02 brief): GA4 gtag, one
 * shared property, custom events for the moments that matter.
 *
 * PRIVACY / DATA-LINE RULE: events carry ONLY categorical metadata (use-case
 * key, model key, verdict class, field name). No user-entered number — volumes,
 * value figures, rates — ever leaves the browser. Because the URL query string
 * DOES contain typed numbers (the copy-link feature), the GA config pins
 * page_location to origin+path with the query stripped, and every event
 * repeats that clean location.
 *
 * track() writes through a gtag stub into window.dataLayer, so events fired
 * before the GA script finishes loading are queued, not dropped.
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
  | "sim_save_case"
  | "sim_import_case"
  | "sim_provider_excluded"
  | "sim_currency_switch";

type GtagWindow = {
  dataLayer?: unknown[];
  gtag?: (...args: unknown[]) => void;
  location?: { origin: string; pathname: string };
};

/** Ensure the gtag stub exists so pre-load events queue into dataLayer. */
function ensureGtag(w: GtagWindow): (...args: unknown[]) => void {
  if (typeof w.gtag === "function") return w.gtag;
  w.dataLayer = w.dataLayer ?? [];
  w.gtag = function gtag() {
    // GA4 reads arguments objects (not arrays) off dataLayer.
    // eslint-disable-next-line prefer-rest-params
    (w.dataLayer as unknown[]).push(arguments);
  };
  return w.gtag;
}

/** The page location with the query string stripped (typed numbers stay local). */
function cleanLocation(w: GtagWindow): string | undefined {
  if (!w.location) return undefined;
  return `${w.location.origin}${w.location.pathname}`;
}

/** Fire a GA4 event. No-ops outside the browser (SSG, tests). */
export function track(event: SimEvent, params: Record<string, string> = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as GtagWindow;
  const gtag = ensureGtag(w);
  gtag("event", event, {
    ...params,
    tool: "investment_case_simulator",
    ...(cleanLocation(w) ? { page_location: cleanLocation(w) } : {}),
  });
}
