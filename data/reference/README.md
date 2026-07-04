# Reference data — synced copies, not the source of truth

These files are **copies** of the canonical set in
`~/Documents/Claude/Projects/The AI Ledger/Investment-Case Benchmark/`
(synced 2026-07-04).

- `token_estimate_library_v1.json` — demand-side token estimates (supersedes `benchmark_token_priors.json`, which is deliberately NOT copied here)
- `benchmark_price_sheet.json` — model list prices (Layer-1 input)
- `benchmark_repricing_multiples.json` / `benchmark_integration_risk_bands.json` — TAIL adjustment factors

**Rules (wq-120a discipline):**
1. Never edit these here. Changes go through the analyst gate in the canonical folder (`TokenEstimateLibrary_RefreshRunbook_v1.md`, copy in `briefs/`), then re-sync.
2. `scripts/validate_token_estimate_library.py` must pass after every sync — wire it into release checks.
3. Everything rendered from these files must display its `as_of` date.
