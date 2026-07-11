/**
 * The session case shelf (Simon, 2026-07-11): "Save this case" now caches the
 * versioned UseCaseScenario in sessionStorage — per tab, cleared when the tab
 * closes, nothing accumulating on shared machines — and /simulator/cases rolls
 * the shelf up into one consolidated business-case summary.
 *
 * This deliberately relaxes update-v2 A1's "no public-side persistence" to
 * SESSION-side persistence, on Simon's instruction. The JSON file export (the
 * Ledger/diagnostic handoff record) still exists — per case and for the whole
 * shelf — on the consolidated page.
 *
 * Everything read back is re-validated through parseScenario before use; the
 * shelf stores records, the engine recomputes truth.
 */
import { parseScenario, type UseCaseScenario } from "./scenario";

const KEY = "hepburn.sim.saved-cases.v1";
export const SHELF_LIMIT = 20;

export interface ShelfResult {
  ok: boolean;
  count: number;
  /** Plain-language reason when ok is false. */
  error?: string;
  /** True when the save replaced an existing case with identical inputs. */
  replaced?: boolean;
}

function store(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.sessionStorage;
  } catch {
    return null; // storage disabled (private mode policies, embeds)
  }
}

/** The saved cases, oldest first. Corrupt or foreign entries are dropped. */
export function listSavedCases(): UseCaseScenario[] {
  const s = store();
  if (!s) return [];
  try {
    const raw = s.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => parseScenario(JSON.stringify(item)).ok) as UseCaseScenario[];
  } catch {
    return [];
  }
}

export function savedCount(): number {
  return listSavedCases().length;
}

/** Two saves of the same numbers update in place rather than duplicating. */
const inputsKey = (c: UseCaseScenario) =>
  JSON.stringify({ i: c.inputs, r: c.ramp, cur: c.currency });

export function saveCase(scenario: UseCaseScenario): ShelfResult {
  const s = store();
  if (!s) {
    return { ok: false, count: 0, error: "This browser isn't allowing session storage — use the file download instead." };
  }
  const cases = listSavedCases();
  const key = inputsKey(scenario);
  const existing = cases.findIndex((c) => inputsKey(c) === key);
  let next: UseCaseScenario[];
  let replaced = false;
  if (existing >= 0) {
    next = [...cases];
    next[existing] = scenario;
    replaced = true;
  } else {
    if (cases.length >= SHELF_LIMIT) {
      return {
        ok: false,
        count: cases.length,
        error: `That's ${SHELF_LIMIT} cases saved — remove one on the saved-cases page first.`,
      };
    }
    next = [...cases, scenario];
  }
  try {
    s.setItem(KEY, JSON.stringify(next));
    return { ok: true, count: next.length, replaced };
  } catch {
    return { ok: false, count: cases.length, error: "The browser refused to store it (storage full) — use the file download instead." };
  }
}

export function removeCase(index: number): UseCaseScenario[] {
  const s = store();
  const cases = listSavedCases().filter((_, i) => i !== index);
  try {
    s?.setItem(KEY, JSON.stringify(cases));
  } catch {
    /* removal is best-effort */
  }
  return cases;
}

export function clearCases(): void {
  try {
    store()?.removeItem(KEY);
  } catch {
    /* best-effort */
  }
}
