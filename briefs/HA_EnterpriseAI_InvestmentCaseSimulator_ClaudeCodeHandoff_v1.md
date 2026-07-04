# Investment-Case Simulator — Claude Code build handoff

**Date:** 29 June 2026
**Owner:** Simon Bowker / Hepburn Advisory
**Status:** Hand-off ready — **do not start until Phase 2 is greenlit** (see brief §9 and Open Decisions §10)
**Source of truth (read these first):**
- `HA_EnterpriseAI_InvestmentCaseSimulator_Concept_v1_2026-06-29.md` (the why + the public/gated line)
- `HA_EnterpriseAI_InvestmentCaseSimulator_Prototype_v1.html` (the validated reference behaviour + numbers)
- `The AI Ledger/cost-outcome-benchmark-phase1-cost-model-spec-2026-06-18.md` (the cost model)
- `The AI Ledger/Investment-Case Benchmark/*.json` (the reference data — single source of truth, do not invent numbers)

---

## 1. What you are building

The **public teaser** of the Investment-Case Simulator: a sister site to The AI Ledger that walks an Australian enterprise leader through five questions about a single AI use case and returns a plain-language investment case with a conditional verdict. It is the front door of a funnel (simulator → Hepburn diagnostic → Enterprise AI Ledger).

**This phase builds the PUBLIC surface only.** The gated diagnostic (client logs, live per-provider forward signal, ANZ cohort) is Phase 3 and is explicitly out of scope. The data line is a hard build rule — see §5.

The HTML prototype is a faithful, baked-data mock of the intended behaviour. **Treat it as the functional spec**, not as code to ship: rebuild it properly (typed, tested, data-driven) on the stack below. The prototype's engine has been verified to reproduce the validated worked-example exactly (code-assistant: $8,316 inference → $10,316 today / $52 per seat → $19,464 repriced / $97 per seat; DeepSeek floor $282).

---

## 2. Non-goals (do not build)

- No client data ingestion, no log upload, no auth, no accounts.
- No live TAIL feed. The public tool reads a **static, editorial reference subset** committed to the repo.
- No per-provider repricing multiples or cost-recovery figures as a *maintained public dataset* — only the illustrative bands already in the prototype.
- No cohort / peer data of any kind.
- No persistence beyond URL query params.

---

## 3. The five-question model (the spec)

Per the prototype and the Phase 1 cost-model spec. The engine, in order:

1. **Q1 — consumption.** `monthlyTx = units × txPerUnitMonth × fanOut`; `tokens = monthlyTx × perTransactionRate(maturity)`. The maturity slider interpolates the banded token priors (naive=high → engineered=low). This band, not a typed number, is the differentiator.
2. **Q2 — price-hold: the forward-pricing engine (the centrepiece — TAIL's only irreplaceable layer).** Not a single multiplier. Per selected-model provider, show TAIL's supply-side read: **cost-recovery %** (customers cover X of true cost), **how far underwater** (loss ÷ revenue), **revenue per employee** (can they grow into it), and **repricing headroom** (×), then a **direction + magnitude + plain-language reason**, paired with the efficiency-offset counterforce. Every figure carries a **provenance tag** — `audited` (reconstructed from audited filings, e.g. OpenAI), `derived` (collected revenue + operating loss, e.g. Anthropic/Google), or `illustrative` (provider outside TAIL's tracked set — e.g. open-weight — never dressed as sourced). The prototype's rebuilt Q2 is the reference. This panel is what TPI structurally cannot build; it must visibly dominate, not sit in a footnote.
3. **Q3 — levers.** Caching (~90% off cacheable input), batching (~50% off batched share), routing (blend toward cheapest model), plus the maturity slider. Live recompute.
4. **Q4 — value.** User-supplied driver per archetype → bear/base/bull (×0.6 / ×1.0 / ×1.4). The tool must visibly refuse to emit a single ROI number.
5. **Q5 — verdict.** Conditional, three states (worth doing / conditional / marginal) by comparing value-base against the cost band, with the named conditions.

**Cost band (the three segments):** `floor` = cheapest model + levers; `today` = chosen model + levers; `repriced` = chosen-model inference × provider multiple + fixed layers. Always show the **cost-mix line** (% of cost that is AI usage) — for agentic archetypes this is the "token price is a sideshow, run-cost dominates" insight that TPI cannot show.

**Output voice (non-negotiable):** plain language only. No "layer", "multiple", "TCO", "archetype", or model names dressed as features in buyer-facing copy. Internal→buyer translation key is in `Investment-Case Benchmark/output-voice-sample_code-assistant_PLAIN.md`.

---

## 4. Data: consume, don't invent

All numbers come from the committed reference data. Copy these into `data/` and parse them — do not hardcode figures in components:

- `benchmark_price_sheet.json` — model list prices (USD/M tokens). **Verify currency against public pages before build** (the draft is as-of 2026-06-18).
- `benchmark_token_priors.json` — per-archetype token bands (the maturity interpolation source).
- `benchmark_repricing_multiples.json` — the provider bands + cost-recovery %. **Public tool uses these as illustrative bands only**, with the honesty caveats carried as metadata and shown as an as-of date.
- `benchmark_integration_risk_bands.json` — Layer-4/5 bands (per-unit vs fixed+marginal).

Write selector functions in `lib/` and **unit-test them against the prototype's verified outputs** (the five default-state snapshots in the prototype + the worked-example reproduction). Tests fail if any figure drifts.

---

## 5. The data line (hard rule — the moat protection)

> **Public = bands + archetypes from editorial reference data. Gated = client numbers + live TAIL forward signal + cohort.**

Enforce in code: the public build must not import any live TAIL export, any client/cohort data, or any per-provider figure not already in the four committed JSON files. A reviewer must be able to confirm the moat hasn't leaked by reading the import graph. This is the §10.3 decision in the brief and needs Simon's explicit yes before deploy.

---

## 6. Stack & quality bar

- **Next.js (App Router) + React + TypeScript**, Tailwind, tokens centralised (sister-site look to TAIL: numbers-first, calm, editorial, tabular figures, restrained palette, semantic colour for status only).
- Charts: lightweight (the prototype's CSS segments + a small bar are enough); Recharts if richer is wanted.
- Static export / Vercel; fully client-side so it can be embedded or linked from TAIL and the Enterprise AI Ledger.
- Typed throughout; selectors unit-tested against the reference data and the prototype snapshots; no console errors; Lighthouse pass on perf + a11y; never rely on colour alone for the verdict.
- Persistent "illustrative demo / fictional" labelling and an as-of date.
- Single CTA: "Run this on your own estate →" to the Hepburn diagnostic / contact.

---

## 7. Copy/paste prompt for Claude Code (use only when Phase 2 is greenlit)

```
Build the PUBLIC TEASER of the Investment-Case Simulator — a sister site to The AI Ledger,
for Hepburn Advisory. Next.js (App Router) + TS + Tailwind, static export, client-side only.

Read first, they are the spec:
1. HA_EnterpriseAI_InvestmentCaseSimulator_Concept_v1_2026-06-29.md  (why + the public/gated line)
2. HA_EnterpriseAI_InvestmentCaseSimulator_Prototype_v1.html         (functional spec + verified numbers)
3. The AI Ledger/cost-outcome-benchmark-phase1-cost-model-spec-2026-06-18.md (cost model)
4. The AI Ledger/Investment-Case Benchmark/output-voice-sample_code-assistant_PLAIN.md (output voice)

Data — copy into data/ and PARSE, do not hardcode:
  The AI Ledger/Investment-Case Benchmark/benchmark_price_sheet.json
  ...benchmark_token_priors.json  ...benchmark_repricing_multiples.json
  ...benchmark_integration_risk_bands.json

Build the five-question walk exactly as the prototype behaves: Q1 consumption (maturity band, not a
typed token count), Q2 price-hold = the forward-pricing engine (per-provider cost-recovery %, underwater %, revenue/employee,
repricing headroom, direction + reason + efficiency-offset counterforce, EACH figure provenance-tagged
audited/derived/illustrative — this panel must dominate, it's the only TAIL-irreplaceable layer),
Q3 levers (cache/batch/route + maturity, live recompute), Q4 value (user-supplied driver, bear/base/bull,
never a single ROI), Q5 conditional verdict (3 states). Show the cost band (floor/today/repriced) and the
cost-mix line (% AI usage) on every archetype.

HARD RULES:
- Output voice is plain language only — no layer/multiple/TCO/archetype/model-name jargon buyer-facing.
- DATA LINE: public build imports ONLY the four committed JSON files. No live TAIL export, no client data,
  no cohort data, no provider figure not already in those files. Keep the moat out of the public bundle.
- Do not invent numbers in code. Write lib/ selectors and unit-test them against the prototype's five
  default-state snapshots AND the worked-example reproduction (code-assistant: 8316 inference / 10316 today /
  52 per seat / 19464 repriced / 97 per seat / 282 DeepSeek floor).

Quality: typed throughout, selectors tested, no console errors, Lighthouse perf+a11y pass, verdict never
colour-only, persistent "illustrative demo" label + as-of date, single CTA to the Hepburn diagnostic.
Deploy nothing public until Simon signs off the data line.
```

---

## 8. Setup snippet (run in VS Code terminal when greenlit)

```bash
# from your repos root
npx create-next-app@latest investment-case-simulator --ts --tailwind --app --eslint --src-dir
cd investment-case-simulator
mkdir -p data lib __tests__
# copy the four reference JSON files into ./data, then open in VS Code:
code .
# paste the §7 prompt into Claude Code
```

---

## 9. What's left before build (needs Simon — from brief §10)

1. Name + URL (working: Investment-Case Simulator; host: Hepburn subdomain).
2. **Sign off the data line (§5 / brief §10.3).** Blocking.
3. Repricing-line loudness (recommend: paired with efficiency offset).
4. Value side in public — light range (recommend) vs cost-only-with-CTA.
5. CTA target (diagnostic page / contact / Calendly).
6. Verify price-sheet currency + the prototype's volume assumptions.

*Build is staging-gated; nothing to a public URL without explicit approval.*
