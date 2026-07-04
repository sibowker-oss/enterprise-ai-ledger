#!/usr/bin/env python3
"""
Reconciliation guard for token_estimate_library_v1.json (wq-120a tradition:
drift should fail a check, not wait for a reader to notice).

Checks:
  1. JSON parses; schema version + changelog present
  2. Band ordering low <= mid <= high (input, output, fan_out, variants)
  3. Required metadata per use case (tier, as_of, review_by, default_model,
     io_class, transaction_def, anchors, derivation, path_to_upgrade)
  4. default_model / dollar-anchor reference_model exist in benchmark_price_sheet.json
  5. Dollar-anchor bracketing: implied cost band at reference prices
     (cache-adjusted where billing_assumptions present) must OVERLAP the anchor
  6. Staleness: review_by dates vs today (warning, not failure)
  7. Tier values on the TAIL scale; 3C cells must carry path_to_upgrade

Exit 0 = all hard checks pass. Exit 1 = failures listed.
Run:  python3 validate_token_estimate_library.py [--library PATH] [--prices PATH]
"""
import json, sys, argparse
from datetime import date
from pathlib import Path

VALID_TIERS = {"1A", "1B", "2A", "2B", "3A", "3B", "3C"}
HERE = Path(__file__).parent
REF = HERE.parent / "data" / "reference"

def band_ok(b):
    return b["low"] <= b["mid"] <= b["high"]

def implied_cost(uc, prices, model_key, bound):
    """USD per transaction at the bound ('low'/'high') of the band, at list prices,
    cache-adjusted using mid cache_read_share where declared."""
    p = prices[model_key]
    tin, tout = uc["input_tokens"][bound], uc["output_tokens"][bound]
    fan = uc.get("fan_out", {"low": 1, "mid": 1, "high": 1})[bound]
    factor = 1.0
    ba = uc.get("billing_assumptions", {}).get("cache_read_share")
    if ba:
        s = ba["mid"]
        factor = (1 - s) + s * 0.1  # cache read = 0.1x input, all providers as of 2026-07
    return ((tin * p["input"] * factor) + (tout * p["output"])) / 1e6 * fan

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--library", default=str(REF / "token_estimate_library_v1.json"))
    ap.add_argument("--prices", default=str(REF / "benchmark_price_sheet.json"))
    args = ap.parse_args()

    lib = json.loads(Path(args.library).read_text())
    prices = json.loads(Path(args.prices).read_text())["models"]
    fails, warns = [], []

    # 1. schema
    for k in ("version", "as_of", "band_semantics", "provenance_scale"):
        if k not in lib.get("_schema", {}):
            fails.append(f"_schema missing '{k}'")
    if not lib.get("_changelog"):
        fails.append("_changelog missing or empty")

    ucs = lib.get("use_cases", {})
    if len(ucs) < 12:
        fails.append(f"expected >=12 use cases, found {len(ucs)}")

    for name, uc in ucs.items():
        # 2. band ordering
        for field in ("input_tokens", "output_tokens", "fan_out"):
            if field in uc and not band_ok(uc[field]):
                fails.append(f"{name}: {field} band not ordered low<=mid<=high")
        for vname, v in uc.get("variants", {}).items():
            for field in ("input_tokens", "output_tokens"):
                if field in v and not band_ok(v[field]):
                    fails.append(f"{name}.variants.{vname}: {field} band not ordered")

        # 3. metadata
        for req in ("transaction_def", "io_class", "default_model", "tier",
                    "as_of", "review_by", "anchors", "derivation", "confidence",
                    "optimisation_profile", "model_sensitivity", "volatility_class"):
            if req not in uc:
                fails.append(f"{name}: missing '{req}'")
        if uc.get("tier") not in VALID_TIERS:
            fails.append(f"{name}: tier '{uc.get('tier')}' not on TAIL scale")
        if uc.get("tier") == "3C" and not uc.get("path_to_upgrade"):
            fails.append(f"{name}: 3C without path_to_upgrade")
        if not uc.get("anchors"):
            fails.append(f"{name}: no anchors listed (even a declared void needs its evidence trail)")

        # 4./5. dollar anchors
        if uc.get("default_model") not in prices:
            fails.append(f"{name}: default_model '{uc.get('default_model')}' not in price sheet")
        for da in uc.get("dollar_anchors", []):
            ref = da["reference_model"]
            if ref not in prices:
                fails.append(f"{name}: dollar anchor reference_model '{ref}' not in price sheet")
                continue
            c_lo = implied_cost(uc, prices, ref, "low")
            c_hi = implied_cost(uc, prices, ref, "high")
            # overlap test: [c_lo, c_hi] vs [usd_low, usd_high]
            if c_hi < da["usd_low"] or c_lo > da["usd_high"]:
                fails.append(
                    f"{name}: implied cost band ${c_lo:.4f}-${c_hi:.4f} at {ref} does NOT overlap "
                    f"dollar anchor ${da['usd_low']}-${da['usd_high']} ('{da['label']}')")
            else:
                print(f"  ok  {name}: ${c_lo:.4f}-${c_hi:.4f} overlaps anchor "
                      f"${da['usd_low']}-${da['usd_high']} ({ref})")

        # 6. staleness
        try:
            if date.fromisoformat(uc["review_by"]) < date.today():
                warns.append(f"{name}: STALE — review_by {uc['review_by']} has passed")
        except Exception:
            fails.append(f"{name}: review_by not ISO date")

    # levers + factors sanity
    for lname, lv in lib.get("optimisation_levers", {}).items():
        if lname.startswith("_"):
            continue
        if lv.get("family") not in ("consumption", "billing"):
            fails.append(f"lever {lname}: family must be consumption|billing")
        for req in ("mechanism", "applies_to", "value", "tier", "review_by"):
            if req not in lv:
                fails.append(f"lever {lname}: missing '{req}'")
    if "model_adjustment_factors" not in lib:
        fails.append("model_adjustment_factors section missing")
    if "freshness" not in lib:
        fails.append("freshness section missing")

    print(f"\nUse cases: {len(ucs)} · Levers: {sum(1 for k in lib.get('optimisation_levers', {}) if not k.startswith('_'))} "
          f"· Adjustment factors: {sum(1 for k in lib.get('model_adjustment_factors', {}) if not k.startswith('_'))}")
    tiers = {}
    for uc in ucs.values():
        tiers[uc.get("tier", "?")] = tiers.get(uc.get("tier", "?"), 0) + 1
    print("Tier mix:", ", ".join(f"{t}:{n}" for t, n in sorted(tiers.items())))

    if warns:
        print("\nWARNINGS:")
        for w in warns: print("  ! " + w)
    if fails:
        print("\nFAILURES:")
        for f in fails: print("  X " + f)
        sys.exit(1)
    print("\nAll hard checks pass.")

if __name__ == "__main__":
    main()
