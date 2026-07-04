/**
 * Release check for the Token Estimate Library (handoff hard rule #6:
 * "Add validate_token_estimate_library.py to release checks; prove it fails on
 * a perturbed copy"). Runs alongside the cross-page reconciliation test
 * (portfolio.test.ts) so the same `npm test` gate that guards the ledger also
 * guards the demand-side reference data.
 *
 * The wq-120a discipline: drift between the library and its evidence should
 * FAIL a check, not wait for a reader to notice. This test asserts both halves
 * of that guarantee — the committed library passes, and a deliberately broken
 * copy is caught.
 */
import { describe, expect, it } from "vitest";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = fileURLToPath(new URL("../", import.meta.url));
const SCRIPT = join(ROOT, "scripts", "validate_token_estimate_library.py");
const LIBRARY = join(ROOT, "data", "reference", "token_estimate_library_v1.json");
const PRICES = join(ROOT, "data", "reference", "benchmark_price_sheet.json");

/** Resolve a python3 interpreter; a release check that cannot run must not
 *  silently pass, so we surface the requirement explicitly. */
function python3(): string {
  for (const bin of ["python3", "python"]) {
    const probe = spawnSync(bin, ["--version"], { encoding: "utf8" });
    if (probe.status === 0) return bin;
  }
  throw new Error(
    "python3 is required to run the token-estimate-library release check " +
      "(scripts/validate_token_estimate_library.py). Install Python 3 to build/deploy.",
  );
}

/** Run the validator against a given library; return {ok, output}. */
function runValidator(libraryPath: string): { ok: boolean; output: string } {
  const res = spawnSync(
    python3(),
    [SCRIPT, "--library", libraryPath, "--prices", PRICES],
    { encoding: "utf8" },
  );
  return { ok: res.status === 0, output: `${res.stdout ?? ""}${res.stderr ?? ""}` };
}

describe("token estimate library guard", () => {
  it("passes on the committed library (all hard checks green)", () => {
    // Use the script's own default paths (no perturbation) — exits 0 or throws.
    const out = execFileSync(python3(), [SCRIPT], { encoding: "utf8" });
    expect(out).toContain("All hard checks pass");
  });

  it("FAILS on a perturbed copy (band ordering broken)", () => {
    const dir = mkdtempSync(join(tmpdir(), "tel-guard-"));
    const perturbed = join(dir, "perturbed_library.json");
    try {
      const lib = JSON.parse(readFileSync(LIBRARY, "utf8"));
      // Break the low <= mid <= high invariant on one use case.
      lib.use_cases.code_assistant.input_tokens = { low: 999999, mid: 6000, high: 12000 };
      writeFileSync(perturbed, JSON.stringify(lib));

      const { ok, output } = runValidator(perturbed);
      expect(ok).toBe(false); // the guard must reject drift
      expect(output).toContain("band not ordered");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it("FAILS on a perturbed copy (dollar anchor no longer brackets cost)", () => {
    const dir = mkdtempSync(join(tmpdir(), "tel-guard-"));
    const perturbed = join(dir, "perturbed_library.json");
    try {
      const lib = JSON.parse(readFileSync(LIBRARY, "utf8"));
      // Move the agentic_coding dollar anchor far below the implied cost band
      // so the bracketing check can no longer overlap.
      lib.use_cases.agentic_coding.dollar_anchors[0].usd_low = 0.00001;
      lib.use_cases.agentic_coding.dollar_anchors[0].usd_high = 0.00002;
      writeFileSync(perturbed, JSON.stringify(lib));

      const { ok, output } = runValidator(perturbed);
      expect(ok).toBe(false);
      expect(output).toContain("does NOT overlap");
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
