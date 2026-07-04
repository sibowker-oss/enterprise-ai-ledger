# Token Estimate Library — Refresh Runbook v1

**Date:** 4 July 2026 · **Owner:** Simon Bowker
**Governs:** `token_estimate_library_v1.json` (this folder)
**Model:** hybrid — automated scan proposes, analyst disposes. No number changes without Simon's sign-off, a changelog entry, and a validator pass.
**Methodology:** `HA_EnterpriseAI_TokenEstimateLibrary_Methodology_v1_2026-07-04.md` (Enterprise AI Adoption Project folder)

---

## Cadence at a glance

| Class | Covers | Review | Next due |
|---|---|---|---|
| V1 | prices, cache/batch multipliers, model roster, effort-dial behaviour | 30–90 days | **2026-08-31** (with TAIL post-Q2-earnings refresh) |
| V2 | token bands, hit-rate priors, optimisation savings | 180 days | 2027-01-04 |
| V3 | conversion constants, io classes, structural rules | 365 days | 2027-07-04 |

**Event triggers (out-of-cycle, affected cells only):** new model generation from a tracked provider → re-baseline model adjustment factors for affected use cases · any provider price move ≥20% · provider policy change touching a lever (precedent: OpenAI FT wind-down, Jul 2026) · new Anthropic Economic Index or equivalent first-party telemetry release.

---

## The monthly scan (automated — produces a drift report, changes nothing)

Run in Cowork on the first business day of the month. Copy/paste:

```
Run the Token Estimate Library monthly drift scan. Read
"The AI Ledger/Investment-Case Benchmark/token_estimate_library_v1.json"
and benchmark_price_sheet.json, then:

1. STALENESS: list every use case, lever, and factor whose review_by has
   passed or falls within 30 days.
2. PRICE DRIFT: web-check current list prices, cache-read multipliers, and
   batch discounts for Anthropic, OpenAI, Google, Bedrock against the price
   sheet and the prompt_caching / batch_flex lever entries. Flag any delta.
3. MODEL ROSTER: search for model releases since the library as_of date from
   Anthropic, OpenAI, Google, xAI, DeepSeek, Mistral. Any new generation =
   flag the affected use cases for re-baseline (generation_upgrade rule:
   0.2x-2.3x documented both directions — never assume).
4. NEW ANCHORS: check the watchlist (freshness.watchlist in the JSON) for new
   data: Anthropic Economic Index, Artificial Analysis token-usage pages,
   Aider leaderboard, Epoch SWE-bench, OpenRouter analyses, and the per-task
   price pages (Intercom Fin, Zendesk, Devin, AiSDR, Harvey coverage).
   For each candidate: value found, source, date, provisional tier, which
   library cell it would move.
5. Produce a drift report table: item | current value | observed value |
   source | proposed action (none / review / re-anchor). CHANGE NOTHING.
   Save as Source Reviews/token-library-drift-YYYY-MM-DD.md.
```

To automate the calendar leg: ask Cowork to "schedule the Token Estimate Library drift scan monthly" (scheduled task; the prompt above is the task body).

## The analyst gate (Simon, ~30 min/month)

1. Read the drift report. Triage: ignore / watch / act.
2. For any "act" item with a substantive source, run it through **`ledger-source-review`** ("ledger review of [URL]") — it grades signals against TAIL's tier model and is the standing deep-read machinery.
3. Decide each change. The re-baseline rule for model swaps: never carry a band across a generation change unmeasured.
4. Apply approved edits to the JSON: update the cell, its `as_of`, `review_by`, and tier; append a `_changelog` entry (date, field, old→new, source, tier, "approved_by: Simon").
5. Bump version: patch = metadata/dates; minor = band or lever value changes; major = schema/semantics changes.

## The guard (every change, no exceptions)

```
cd "The AI Ledger/Investment-Case Benchmark" && python3 validate_token_estimate_library.py
```

Green = commit. Red = the change broke band ordering, anchor bracketing, or metadata completeness — fix or revert. The guard is proven to fail on perturbation (tested 2026-07-04: band-ordering break and 100× anchor drift both caught). If a *correct* new anchor conflicts with a band, that is a finding, not a validator bug — widen or move the band via the gate, don't loosen the check.

## The client-telemetry ratchet (per gated diagnostic)

After any engagement that measures real usage: record the measured tokens/transaction as a private 1A anchor in the gated copy; where the public band needs correcting, adjust direction-only and anonymised. Public library never carries client-identifiable data. This is the compounding asset — every diagnostic makes the library harder to compete with.

## Standing honesty rules

Point estimates never ship — bands with `band_semantics` travel together. Every rendered number carries its `as_of`. A stale forward read is worse than none (concept brief §8): if V1 items breach review_by by >30 days, the simulator's price-sensitive outputs should surface the vintage warning. Declared voids (back_office_reconciliation) stay declared until real evidence exists — do not backfill with confidence.
