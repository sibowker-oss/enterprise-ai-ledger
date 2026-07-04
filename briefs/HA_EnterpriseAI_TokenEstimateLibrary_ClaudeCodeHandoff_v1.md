# Claude Code Handoff — wire the Token Estimate Library into the simulator

**Date:** 4 July 2026 · **Owner:** Simon Bowker
**Stage:** for Phase 2 build (or retrofit of the prototype) — after Simon signs off the library
**Source of truth (repo copy):** `data/reference/token_estimate_library_v1.json` — **supersedes `benchmark_token_priors.json` v0.1** (deliberately not in this repo). Canonical master lives in `~/Documents/Claude/Projects/The AI Ledger/Investment-Case Benchmark/`; sync rules in `data/reference/README.md`. Code must not invent numbers; everything renders from the JSON.
**Prerequisite sign-offs (unchanged from the simulator handoff §9):** naming · public/gated data line · value-side-in-public.

## What changes vs the v0.1 wiring

1. **Source switch.** All token priors read from `token_estimate_library_v1.json`. The old file stays in the repo for the worked examples but is marked superseded — never dual-source (wq-120a rule: one source of truth).
2. **Bands, not points.** Q1 renders low/mid/high with `band_semantics` labels in plain voice ("if it's set up lean / typically / if it's left loose"). No unlabelled midpoints anywhere. Every number carries `as_of`.
3. **Volume model correction.** Code-assistant interactions/dev/day now 10/30/80 (the old flat 60 = high side). Marketing content is now priced as an iterated asset (~10× the old single-shot band) — expect the archetype's numbers to move; that is intended.
4. **Two lever families.** Q3 levers split: consumption levers position within the band; billing levers (cache/batch/routing) multiply after. Enforce `stacking_rules` from the JSON — no double-counting (esp. routing + distillation; compression vs caching).
5. **Model-change sensitivity.** Model swap in the UI applies `model_adjustment_factors` (tokenizer, reasoning toggle/effort, verbosity, agentic turns) — not just the price sheet. Surface the plain-voice warning for reasoning-mode changes ("this kind of model thinks before it answers — that thinking is billed").
6. **Guards in CI.** Port/copy `validate_token_estimate_library.py` into the repo's release checks alongside the existing cross-page consistency script. Any PR touching the library must pass it.
7. **Voice.** Output voice rules unchanged — plain language only, per the canonical PLAIN sample; tier codes and lever names stay internal.

## Copy/paste to start the Claude Code session

```
Read these before doing anything (paths repo-relative):
1. brief: briefs/HA_EnterpriseAI_TokenEstimateLibrary_ClaudeCodeHandoff_v1.md in full
2. data: data/reference/token_estimate_library_v1.json (single source of truth for demand-side numbers) + the other reference JSONs + data/reference/README.md (sync rules)
3. guard: scripts/validate_token_estimate_library.py (already passing — keep it green)
4. method: briefs/HA_EnterpriseAI_TokenEstimateLibrary_Methodology_v1_2026-07-04.md (§2 principles, §5 lever families, §6 model factors)

Task: wire the simulator's Q1 (usage), Q3 (levers) and model-selector to the library.
Rules that are NOT negotiable:
- No invented numbers. Everything renders from the JSON; every figure shows as_of.
- Bands with semantics labels, never bare midpoints.
- Consumption levers move position-in-band; billing levers multiply after; enforce stacking_rules verbatim.
- Model swaps apply model_adjustment_factors AND the price sheet, with the re-baseline warning on generation changes.
- Add validate_token_estimate_library.py to release checks; prove it fails on a perturbed copy.
- Plain output voice per output-voice-sample_code-assistant_PLAIN.md. Internal jargon (tier codes, lever keys, "archetype") never reaches the UI.
- Staging only; nothing publishes without the §10.3 data-line sign-off.
Verify by rendering the page and re-running the worked examples: code_assistant mid should reproduce ~$0.033/interaction at Sonnet list, agentic_coding mid ~$0.65/task cache-adjusted. Report deltas vs the old v0.1 numbers as a table — do not silently absorb them.
```

## Deltas Claude Code should expect and report (not fix)

The 18 Jun worked examples used 6K/1K at 60 interactions/dev/day → 1,512M input/month. Under the library that scenario becomes a **band** (roughly 0.25–2.0B input tokens/month at 200 devs from the volume band alone: 10/30/80 interactions/day × 21 days × 6K mid tokens) and 60/day is relabelled high-side. The examples remain valid as mechanics demonstrations; their captions should gain "illustrative — see library bands".
