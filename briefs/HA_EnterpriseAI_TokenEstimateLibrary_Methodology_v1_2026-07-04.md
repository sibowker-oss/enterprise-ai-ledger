# The Token Estimate Library — methodology, freshness and model-change framework

**Date:** 4 July 2026 · Cowork strategy session
**Owner:** Simon Bowker / Hepburn Advisory
**Status:** v1 — methodology locked, library populated, refresh mechanism defined
**Supersedes:** `benchmark_token_priors.json` v0.1-draft (6 archetypes, all tier-3C editorial)
**Companion artefacts:** `token_estimate_library_v1.json` + `validate_token_estimate_library.py` + `TokenEstimateLibrary_RefreshRunbook_v1.md` (all in `The AI Ledger/Investment-Case Benchmark/`) · Claude Code handoff in this folder
**Trigger:** the 29 June simulator session's closing finding — the demand-side numbers ("1,512M tokens/month") are editorial midpoints of ~30× bands presented with false precision. This document is the industrialised fix.

---

## 1. The problem, stated honestly

The Investment-Case Simulator's supply side (prices, repricing multiples) is provenance-graded and TAIL-sourced. Its demand side — tokens per transaction, interactions per user — was six archetypes of tier-3C editorial guesses. That was flagged in the source file itself, and the 29 June session quantified the damage: multiplying two soft midpoints (20–150 interactions/day × 3,000–12,000 tokens each) spans a ~30× range that the tool displayed as one clean number.

The fix is not better guesses. It is a different kind of object: an estimate **library** where every number is decomposed into its drivers, anchored to named public evidence, banded with declared semantics, graded on TAIL's existing provenance scale, and carried with an expiry date. The library's job is to be *defensibly wrong within stated bounds*, and to get narrower as evidence accumulates — not to be precise.

One position from the prior session survives unchanged and governs everything here: **consumption is an output of how a deployment is engineered, not a fact you can look up.** The generic library sizes the band; only client telemetry collapses it to a number. That is the public-teaser → gated-diagnostic line, restated as data methodology.

## 2. Design principles

**P1 — Decompose, never lookup.** Monthly tokens = business volume × interactions per unit × fan-out (model calls per interaction) × tokens per call (input and output separately). Each factor is separately estimated, separately sourced, separately overridable. A single "tokens per use case" number hides which factor is wrong.

**P2 — Triangulate or stay 3C.** Every mid-band value needs at least two independent anchor types before it escapes editorial grading. The anchor taxonomy (§4) defines independence. Where only one anchor type exists, the cell keeps a wide band and a low tier — visibly.

**P3 — Bands are behavioural, not statistical.** Low = a well-engineered deployment. Mid = typical production. High = a naive deployment. We do not have the telemetry to claim percentiles, so we do not fake them. The band width is itself the product message: the naive→engineered gap is the value Hepburn creates.

**P4 — Provenance per cell.** TAIL's existing 1A/1B/2A/2B/3A/3B/3C scale, applied at the level of the individual estimate, not the file. Every cell carries `as_of`, `review_by`, and a source list. No number without a source; no source without a grade.

**P5 — Reference-model normalisation.** Every band is stated for a named default model and a declared reasoning mode. Changing the model applies explicit adjustment factors (§6) — never a silent assumption that tokens are model-invariant. They are not, by up to an order of magnitude.

**P6 — Two lever families, never mixed.** Optimisation levers split into *consumption* levers (fewer tokens: compression, output control, retrieval efficiency, context engineering) and *billing* levers (cheaper tokens: caching, batch, routing, distillation). Consumption levers move a deployment *within the band* — the low band already assumes them, so they must never be stacked on top of it. Billing levers apply to whatever consumption lands at, and do stack. Blurring these two — as the slider-style public calculators do — double-counts savings. This is the single most common analytical error in the genre and the library makes it structurally impossible.

**P7 — Machine-checkable honesty.** Every invariant that can be asserted, is: band ordering, input:output class consistency, dollar-anchor bracketing, staleness, tier presence. The validator script is part of the deliverable, in the wq-120a reconciliation-guard tradition. Drift between the library and its evidence should fail a check, not wait for a reader to notice.

## 3. The estimation method — how a number gets made

Seven steps, applied per use case. This is the repeatable procedure, not a one-off.

**Step 1 — Define the transaction.** One user-meaningful unit of work, stated so a client can count theirs ("one delegated coding task", "one inbound contact summarised", "one minute of voice conversation"). Fan-out (multiple model calls per transaction) is declared separately, not smuggled into the token count.

**Step 2 — Collect anchors.** Search the public evidence base for that use case across all six anchor types (§4). Record each with value, source, URL, date, grade. Absence of evidence is recorded too — a declared void (back-office reconciliation is one) is worth more than a confident guess.

**Step 3 — Back-derive from dollars where tokens aren't published.** Most vendors publish per-task prices, not tokens. A dollar anchor divided by known per-token prices yields an implied token envelope. Weaker than telemetry (model and margin assumptions intrude) but far stronger than judgement, and it is how most of this library's validation works.

**Step 4 — Cross-check from first principles.** Conversion constants (tokens per word ≈ 1.33, per page ≈ 500–700, per hour of transcript ≈ 10–13K, per hour of native audio ≈ 60K, per kLOC ≈ 10K) let a band be composed bottom-up from the physical workload. If the composed figure and the anchored figure disagree by more than ~3×, the discrepancy is investigated, not averaged.

**Step 5 — Set the band.** Low/mid/high per P3, wide enough to contain the honest anchors. If anchors span 10×, the band spans 10× — width is never narrowed for cosmetic reasons.

**Step 6 — Grade and date.** Overall tier = the weakest load-bearing anchor, upgraded one notch if two independent anchor types agree within 2×. Assign `as_of`, `review_by` (by volatility class, §7), and a confidence note in plain language.

**Step 7 — Run the guards.** The validator asserts band ordering, io-ratio class, dollar-anchor bracketing at reference prices, and metadata completeness. A use case that fails stays out of the library until it passes or the failure is documented as a known conflict.

## 4. The anchor taxonomy and what the public evidence base actually holds

Six anchor types, in descending evidential strength:

| Type | What it is | Examples found (July 2026) |
|---|---|---|
| A. First-party telemetry | Vendor publishes measured usage | Anthropic Claude Code session data (~4 turns, ~10 actions/prompt, ~13K output tokens/session); Anthropic Economic Index (relative token intensities, 13-turn median for content artefacts); Epoch SWE-bench token budgets |
| B. Dollar-per-task ÷ price | Published per-task price back-derived to tokens | Intercom Fin $0.99/resolution; Devin $8–9/hr of agent work; Anthropic $13/dev/active-day; deep research $1–30/report; Harvey ~$0.20/doc reviewed |
| C. Community-measured raw logs | Leaderboards and traced runs with token counts | Aider polyglot completion-token logs; Simon Willison's o4-mini deep-research trace (60.5K in / 22.9K out); Artificial Analysis eval-suite token usage |
| D. First-principles composition | Conversion constants × workload shape | Meeting hour ≈ 10–13K transcript tokens; invoice ≈ 2,500 tokens; 1,000 words ≈ 1,333 tokens |
| E. Practitioner consensus | Convergent engineering guidance, unmeasured | RAG context 2–10K per query; chunk sizing 400–512 tokens; voice ~4 turns/minute |
| F. Editorial | Analyst judgement | Whatever remains — flagged as such |

Three structural findings from the July 2026 evidence sweep that shape the library:

**The evidence is dollar-shaped, not token-shaped.** Almost no vendor publishes token telemetry; many publish per-task prices. So the library's strongest validation loop is: token band × reference price must bracket the public dollar anchors. That check is automated.

**Reasoning models have inverted several priors.** Text-to-SQL, resume screening and legal review now run output-heavy (reasoning tokens billed as output) where the 2025-era prior said input-heavy. Any library built before mid-2025 is stale on ratio, not just magnitude.

**Genuine voids exist and are named.** Back-office/ERP reconciliation has no public token or per-task cost data at all; IDE autocomplete tokens rest on a single 3C source; production RAG distributions are consensus, not measurement. These cells stay wide and low-graded, with a stated path to upgrade (client telemetry via the gated diagnostic).

## 5. Optimisation levers — the two families and the stacking rules

Each use case in the library carries an applicability profile across ten levers. The family split (P6) governs how they combine.

**Family A — consumption levers** (reduce tokens processed; they define where you sit in the band):

| Lever | Evidence-based effect | Grade |
|---|---|---|
| Context/prompt compression | Up to 20× input compression at ~1.5-pt benchmark loss (LLMLingua); apply to dynamic suffix only — compressing a cached prefix breaks caching and can raise cost | 1B research |
| Output control / concise reasoning | 70–92% output-token reduction at matched accuracy (Chain-of-Draft measured −92.4% with accuracy up); `max_tokens` is a backstop, not a saving | 1B research |
| Retrieval efficiency (rerank, contextual retrieval) | Rerank to top-k matches quality of sending 3× the chunks at ~⅓ context cost; −67% retrieval failures with contextual retrieval + rerank | 1B vendor eval / 3B |
| Agentic context engineering | Context editing −84% tokens on 100-turn runs; deferred tool loading −85% tool overhead; programmatic tool calling −37% to −98.7% on tool-heavy tasks | 1B vendor evals |
| Reasoning-effort dial | Low→high spans 1.8–3.5× output tokens measured (Aider GPT-5 logs); medium effort ≈ −40–50% cost for single-digit score loss | 3B raw logs |

**Family B — billing levers** (reduce price per token; they stack on top of wherever consumption lands):

| Lever | Verified value (4 July 2026) | Grade |
|---|---|---|
| Prompt caching | Cache read = 0.1× input at Anthropic, OpenAI, Google, Bedrock; write premiums vary (Anthropic 1.25×/2×, OpenAI free, Gemini storage fee). Realistic hit rates: agentic 70–90%, chat/support 50–70%, single-shot RAG 10–30% | 1B docs; 3B/2A hit rates |
| Batch / flex processing | Flat 0.5× on all tokens at all three majors; async (≤24h); stacks multiplicatively with caching (vendor-confirmed; one exception: Gemini 3.1 Pro batch cache-read is 80% not 90% off) | 1B docs |
| Model routing / cascading | 45–85% cost reduction at ~95% frontier quality (RouteLLM, measured); vendor claims above that are unverified; quality trade-off is definitional | 1B research |
| Fine-tune / distil to small model | ~85% per-token gap frontier→small if quality holds; note OpenAI's fine-tuning platform wind-down (July 2026) pushes this route to open-weight hosting; break-even unverified publicly | 1B pricing; flagged |
| Semantic caching | 20–45% of traffic is the realistic hit band (FAQ bots 40–60%, open-ended 5–15%); the "95%" figures in marketing are match accuracy, not hit frequency; false-positive quality risk is real | 3B |

**Stacking rules encoded in the library:** caching × batch is multiplicative (vendor-confirmed). Routing and distillation are the same lever — never both on the same traffic. Semantic-cache hits remove requests entirely; downstream savings apply to misses only: total = 1 − (1−hit)(1−downstream). Compression cannibalises caching if applied to the stable prefix. Consumption levers never stack on the low band — the low band already assumes them.

**Realistic combined envelopes vs a naive, uncached frontier baseline** (derived from the sourced components; grade: derived): chat/support 40–60% with caching + output control, 65–85% with a mature stack including routing; interactive RAG 40–60%, offline RAG 70–80%; agentic 75–90% — noting the architecture itself runs at 4–15× chat-level token volumes, so these levers contain agentic cost rather than make it cheap.

## 6. The model-change adjustment layer

Changing the model changes token *consumption*, not just price per token. The library states every band for a named default model and reasoning mode, and carries these adjustment factors (each graded, each with its evidence):

| Mechanism | Multiplier range | Evidence quality |
|---|---|---|
| Tokenizer, cross-vendor, English prose | ±5–10% input | Good (measured, consistent) |
| Tokenizer, code | ±10–20% input | Moderate |
| Tokenizer, non-English (Latin script) | 1.25–2.6× input vs English | Strong (academic, 25 languages) |
| Tokenizer, CJK / low-resource scripts | 2–4× input (worst cases ~10×) | Moderate |
| Tokenizer, same-family generation change | 1.0–1.35× input (1.45× measured on technical docs — Claude 4.6→4.7 case, flat prices) | Strong |
| Reasoning ON vs OFF, same task | 3–20× output typical; up to ~30× on hard tasks | Strong on instances |
| Reasoning-effort dial, same model | 1.8–3.5× output measured; parameter ceilings allow ~9.5× | Strong |
| Verbosity between same-class models | 1.5–2.6× output on identical tasks | Good |
| Agentic turn behaviour | Input tokens × turns can drive most of a cost delta while output stays flat (documented 5.5× cost change with output +1%) | Moderate |
| Generation upgrade, net effect | 0.2×–2.3× total tokens — **documented in both directions; never assume** | Good but heterogeneous |

Two rules sit on top of the factor table:

**Cost-per-task, not price-per-token.** Same-score cost differences of 2–7× are documented where per-token price explains less than half (Aider leaderboard: models with identical scores at 2.7× the cost; a model at half the per-token price costing 1.4× per run). The library's worked comparisons are therefore always $-per-transaction at stated consumption, never a price-sheet glance.

**Re-baseline on migration.** A model swap (including a same-family upgrade) triggers re-measurement of the affected use cases' consumption before the new cost is asserted. The Claude 4.6→4.7 tokenizer change (+0–35% input at flat prices) and DeepSeek R1→R1-0528 (+92% thinking tokens) are the cautionary anchors: an "upgrade" can be a silent repricing via consumption.

This layer is also a Hepburn product point: the public calculators treat model choice as a price-sheet swap; the library treats it as a consumption event with a sensitivity profile per use case (`model_sensitivity` field — e.g. text-to-SQL and legal review are reasoning-toggle-dominated; translation is tokenizer-dominated; agentic coding is caching-behaviour-dominated).

## 7. Freshness — the hybrid mechanism

The decision: automated scanning, human-gated change. Numbers never change without Simon's sign-off; staleness never goes unnoticed between reviews. Full operating detail in the runbook; the design:

**Volatility classes drive review dates.** V1 (30–90 days): prices, cache/batch multipliers, model roster, effort-dial behaviour — anything a provider announcement can move overnight. Price cells inherit TAIL's existing cadence anchor (next refresh 2026-08-31, post-Q2 earnings). V2 (180 days): per-use-case token bands, hit-rate priors, optimisation savings ranges. V3 (365 days): conversion constants, ratio classes, structural rules.

**A monthly automated scan produces a drift report, not a data change.** The scan checks: `review_by` breaches; provider pricing pages vs the price sheet; new model-generation releases (which trigger the §6 re-baseline rule out of cycle); and new-anchor candidates from a named watchlist — Anthropic Economic Index releases, Artificial Analysis model pages, the Aider leaderboard, Epoch SWE-bench, OpenRouter rankings analyses, provider engineering blogs, and the per-task price pages of the anchor vendors (Intercom Fin, Zendesk, Devin, Harvey-adjacent reporting).

**The analyst gate reuses existing machinery.** Drift items worth pursuing go through the `ledger-source-review` skill — it exists precisely to deep-read a source against TAIL's tier model. Approved changes append to the library's changelog (date, field, old→new, source, grade), bump the version, and re-run the validator. The wq-120a lesson is encoded: one source of truth, guards that fail on drift, honesty-marks on vintage.

**Event triggers override the calendar.** A model-generation release, a price move ≥20% (the GPT-5 line doubling of 23 Apr 2026 is the precedent), a provider policy change (the July 2026 OpenAI fine-tuning wind-down is a live example), or a new Economic Index report each force an out-of-cycle review of the affected cells only.

**The client-telemetry ratchet is the compounding asset.** Every gated Hepburn diagnostic that measures a client's real usage produces private 1A anchors. Those tighten the gated library and, in aggregated/anonymised direction-only form, inform the public bands. Public library = bands from public evidence; gated library = the same schema converging on measured truth. This is the cohort moat from the concept brief, expressed as data flow.

## 8. Governance and versioning

The library is one JSON file, semantically versioned, with an embedded changelog. Consumers (the simulator, the diagnostic) read `as_of` and `band_semantics` and must render them — the number never travels without its vintage and its meaning. `benchmark_token_priors.json` v0.1 is superseded and marked as such in place; it is not deleted (it is cited by the worked examples) and not maintained. The validator runs on every change and in any consuming repo's release checks. Changes land staging-first per the standing publishing gate; nothing here alters the public/gated data line (§5 of the concept brief) — the library's public subset remains bands + archetypes, never live per-provider forward signals.

## 9. What v1 achieves against v0.1 — the honest scorecard

Coverage: 6 archetypes → 15 use cases. Provenance: v0.1 was 100% tier-3C; v1 has first-party or measured anchors (1B/2A/3B) on the load-bearing cells of 11 of 15 use cases — agentic coding, deep research, translation and voice are now dollar-anchored to within ~2×; support, claims and meeting intelligence carry vendor-priced brackets. Still editorial and flagged as such: back-office reconciliation (a genuine public void), IDE autocomplete internals (single 3C source), enterprise RAG distributions (consensus only), and every interactions-per-user figure — the volume drivers remain the weakest layer, which is precisely the diagnostic's opening. The 29 June finding stands: the library narrows and grades the bands, but only a client's own logs collapse them.

## 10. Limits

These bands describe API-delivered, English-language, text-dominant workloads at mid-2026 model behaviour. They do not cover fine-tuned self-hosted estates (Layer-2 economics), multimodal generation (image/video tokens), or non-English deployments except via the tokenizer factors. Dollar anchors from vendor pricing embed vendor margin — they bound tokens from above. And every number here is a prior, not a measurement: the library's core claim to a CFO is not "your cost will be X" but "your cost sits in this band, here is what moves it, and here is how we'd measure it in a week."

*End of methodology.*
