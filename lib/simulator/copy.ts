/**
 * Plain-language copy generators. The hard rule (concept.md §4 / output-voice
 * -sample.md): buyer-facing text is plain only — never "layer", "multiple",
 * "TCO", "archetype", "repricing", "cohort" or "diagnostic". The machinery
 * stays under the hood. "Tokens" is kept (the spec's own volume-band decision
 * and the prototype use it) but ALWAYS with a plain gloss.
 *
 * Money-bearing sentences take an optional currency (the A$ toggle) — the
 * figures are already converted in derive.ts; only the symbol changes here.
 *
 * Centralising the dynamic phrases here lets __tests__/simulator/voice.test.ts
 * scan every generated string for banned terms.
 */
import type { CostBand, ForwardSignal, ProvenanceTier } from "./types";
import type { Archetype } from "./archetypes";
import { isPerSeat, txWord, unitWord, WORKING_DAYS } from "./archetypes";
import {
  aiSharePct,
  AI_LED_THRESHOLD,
  CLOSE_THRESHOLD,
  coverageRatio,
  NO_THRESHOLD,
  spreadMultiple,
  WIDE_MARGIN,
  type BreakEvenHuman,
  type IntensityBand,
  type UsageBreakdown,
} from "./engine";
import type { BudgetLine } from "./budget";
import {
  grouped,
  multipleLabel,
  plainNum,
  rangeLabel,
  requestCount,
  tokenCount,
  usd,
  usdK,
  usdUnit,
  type Cur,
} from "./format";
import { model as resolveModel } from "./models";
import {
  isReasoningSensitive,
  tokenizerCodeRange,
  tokenizerEnglishRange,
  tokenizerGenerationRange,
  verbosityRange,
  volumeHint,
  type InputRail,
  type SeatProduct,
} from "./data";

/** How far today's price could move, in words (no "multiple" — plain language). */
export function risePhrase(headroom: number): string {
  if (headroom >= 2.7) return "nearly triple";
  if (headroom >= 2.3) return "more than double";
  if (headroom >= 1.8) return "roughly double";
  return "stay about the same";
}

/** Provenance in the buyer's words. */
export function tierLabel(tier: ProvenanceTier): string {
  return { audited: "from audited accounts", derived: "our estimate", illustrative: "example only" }[tier];
}

/** The chip on the Q2 panel header — three states (update v2, 0.2). */
export function provChipText(signal: ForwardSignal): string {
  if (signal.state === "tracked") return `The AI Ledger · ${tierLabel(signal.tier)}`;
  if (signal.state === "open") return "Example only — open weights, not tracked";
  return "Not tracked — no forecast available";
}

/** "200 developers" / "1 developer" / "1 claim a month" — plural-safe. */
export function unitsPhrase(a: Archetype, units: number): string {
  if (units === 1) {
    const word = unitWord(a);
    return a.unitLabel.includes("/") ? `1 ${word} a month` : `1 ${word}`;
  }
  return `${grouped(units)} ${a.unitLabel.toLowerCase()}`;
}

/** Q1 — sizing sentence from business volume. */
export function q1SizingSentence(a: Archetype, units: number, u: UsageBreakdown): string {
  return `You have ${unitsPhrase(a, units)}. Based on how they'd normally use it, that's about ${requestCount(u.monthlyTx)} requests a month.`;
}

/** Q1 — the honest usage BAND, rendered at the three named setups (never a bare
 *  midpoint): band_semantics low/mid/high in plain voice (library rule #2). */
export function q1BandSentence(u: UsageBreakdown): string {
  return `Set up lean, that's about ${tokenCount(
    u.usageBandLow,
  )} of background text a month; a typical setup runs about ${tokenCount(
    u.usageBandMid,
  )}; left loose it climbs to about ${tokenCount(
    u.usageBandHigh,
  )} (the documents, history and instructions the AI reads and writes). Where you land is set by how tightly it's put together — and pinning it to your own usage is the first thing the full version does.`;
}

/** Plain-voice meaning of the setup slider position — the library's band_semantics
 *  translated for a buyer (rule #2 / rule #7: the meaning shows, the jargon doesn't). */
export function maturityMeaning(maturity: number): string {
  return [
    "left loose — everything stuffed in, no discipline on length",
    "on the loose side",
    "a typical, middle-of-the-road setup",
    "on the tight side",
    "set up lean — tight background, disciplined length",
  ][Math.max(0, Math.min(4, maturity))];
}

/**
 * Q1 — the corrected volume guidance, from the library's volume_hints band
 * (rule #3), for use cases without an intensity slider.
 */
export function volumeHintSentence(a: Archetype): string {
  const vh = volumeHint(a.priorKey);
  if (!vh) return a.volHint; // library carries no volume band for this use case
  const per = VOLUME_UNIT_PHRASE[vh.unitPer] ?? "uses per person a day";
  const impliedPerDay = Math.round(a.txPerUnitMonth / WORKING_DAYS);
  const base = `Typically about ${vh.mid} ${per} — leaner teams nearer ${vh.low}, heavy use up to ${vh.high}. Replace with your own.`;
  if (impliedPerDay > vh.mid) {
    return `This example runs at about ${impliedPerDay} ${per} — the heavy end. ${base}`;
  }
  return base;
}

/** Plain phrasing for the library's volume-hint keys (numbers stay from the JSON). */
const VOLUME_UNIT_PHRASE: Record<string, string> = {
  chat_interactions_per_dev_per_day: "uses per developer a day",
  contacts_per_agent_per_day: "contacts per agent a day",
  queries_per_knowledge_worker_per_day: "questions per person a day",
  tasks_per_dev_per_active_day: "delegated tasks per developer a day",
  reports_per_analyst_per_week: "reports per analyst a week",
  documents_per_reviewer_per_day: "documents per reviewer a day",
  queries_per_analyst_per_day: "questions per analyst a day",
  emails_per_sdr_per_day: "emails per rep a day",
  assets_per_marketer_per_week: "assets per marketer a week",
  meeting_hours_per_employee_per_week: "meeting-hours per employee a week",
};

/**
 * The model-change advisory (rule #4). A model swap is a CONSUMPTION event, not
 * a price-sheet swap. Returns null when the chosen model is the use case's default.
 */
export interface ModelChangeAdvisory {
  rebaseline: string;
  sensitivity: string;
  reasoning: string | null;
}

export function modelChangeAdvisory(
  a: Archetype,
  selectedModelKey: string,
  defaultModelKey: string,
): ModelChangeAdvisory | null {
  if (selectedModelKey === defaultModelKey) return null;
  const sel = resolveModel(selectedModelKey);
  const def = resolveModel(defaultModelKey);
  const sameProvider = sel.provider === def.provider;
  const codeWork = a.priorKey === "code_assistant";
  const inputRange = sameProvider
    ? tokenizerGenerationRange()
    : codeWork
      ? tokenizerCodeRange()
      : tokenizerEnglishRange();
  const outputRange = verbosityRange();
  return {
    rebaseline:
      "Changing the model changes how much it reads and writes, not just the price — so treat this as a fresh estimate. The full version measures it on your own traffic before trusting the number.",
    sensitivity: `On a different model the amount it reads can shift by about ${rangeLabel(
      inputRange,
    )}, and the amount it writes by about ${rangeLabel(
      outputRange,
    )}, versus the default — before any price difference.`,
    reasoning: isReasoningSensitive(a.priorKey)
      ? "This kind of work can also pull in a model that thinks before it answers — that thinking is billed as extra output, and can push the amount it writes up several times over."
      : null,
  };
}

/** Q1 — per-request background, and how the setup slider moves it. */
export function q1PerRequestSentence(u: UsageBreakdown): string {
  return `Right now each request carries about ${grouped(
    u.inputTokensPer,
  )} tokens of background — the documents, history and instructions the AI has to read. Tighten the setup (the slider on the left) and that drops to about ${grouped(
    u.inputTokensLean,
  )}. You pay for the difference on every request.`;
}

/** Q2 — the planning line (the rise), always paired with the counter-force below it. */
export function q2PlanSentence(headroom: number): string {
  return `Our estimate: today's usage price could ${risePhrase(
    headroom,
  )} over the next 2–3 years. This isn't just a theory — GPT-5 prices doubled in April 2026.`;
}

/** Q2 — the efficiency counter-force (mandatory alongside the rise). */
export const Q2_COUNTER_SENTENCE =
  "The other way: cheaper models are getting better fast — the same work already runs for a fraction on a budget model. So the honest answer is a range, and the biggest thing you control is which model you use.";

/** Cost box — the "same workload, N× gap" line, with the per-seat range where it applies. */
export function spreadSentence(a: Archetype, band: CostBand, units: number, cur: Cur = "usd"): string {
  const gap = multipleLabel(spreadMultiple(band));
  const seats = Math.max(1, units);
  const perSeat = isPerSeat(a)
    ? `, about ${usd(band.floor / seats, cur)}–${usd(band.repriced / seats, cur)} per ${unitWord(a)} a month`
    : "";
  return `That's a ${gap} gap on the exact same use case${perSeat}, which is why a vendor's price tag alone can't tell you if it's worth it.`;
}

/** Cost box — the cost-mix line (what actually drives the cost). */
export function costMixSentence(band: CostBand): string {
  const share = aiSharePct(band);
  if (share >= AI_LED_THRESHOLD) {
    return `About ${share}% of this is the AI itself — so which model you pick, and whether its price holds, matter most here.`;
  }
  return `Only about ${share}% of this is the AI itself. The rest is the fixed cost of running it — the platform, the monitoring, the people checking its work — plus a little per use. Here the AI price barely matters — it's the running cost to watch. Most online calculators only show that small slice.`;
}

/** Verdict — the "weighing X against Y" line (counted value vs the cost band). */
export function verdictWeighingSentence(valueBase: number, band: CostBand, cur: Cur = "usd"): string {
  return `You're weighing about ${usd(valueBase, cur)}/mo of counted value against ${usd(band.floor, cur)}–${usd(
    band.repriced,
    cur,
  )}/mo to run it.`;
}

/**
 * "N×" in plain words — no "multiple" (banned). Whole numbers past 10×, and
 * capped at "30×+" (beyond that the exact ratio is meaningless).
 */
export function timesLabel(n: number): string {
  if (n >= 30) return "30×+";
  if (n >= 10) return `${Math.round(n)}×`;
  return `${n.toFixed(1)}×`;
}

/**
 * Verdict — the margin-of-safety line, aligned with the four verdict states
 * (the copy can never say "it pays" while the label says "too close to call").
 */
export function verdictMarginSentence(valueBase: number, band: CostBand, cur: Cur = "usd"): string {
  const worst = coverageRatio(valueBase, band);
  const todayCoverage = valueBase / Math.max(band.today, 1);
  if (valueBase >= band.repriced) {
    if (worst >= WIDE_MARGIN) {
      return `Even if prices rise that far, the value you counted still covers the running cost about ${timesLabel(
        worst,
      )} over. At that margin the AI bill isn't what decides this — whether the value you've assumed is real is. That's the number to pressure-test, not the price.`;
    }
    return `In the price-rise case the counted value covers the running cost about ${timesLabel(
      worst,
    )} over — a real margin, but a slim one. It holds only while you keep usage tight and the value stands up.`;
  }
  if (todayCoverage >= CLOSE_THRESHOLD) {
    return `It pays at today's price — the counted value covers about ${timesLabel(
      todayCoverage,
    )} of today's cost — but a price rise would eat that gap. This one turns on holding the value up and keeping usage down.`;
  }
  if (todayCoverage >= 1) {
    return `The counted value only just covers today's cost — about ${timesLabel(
      todayCoverage,
    )} — which is inside the wobble on estimates like these. Too close to treat as a yes without proof.`;
  }
  if (todayCoverage >= NO_THRESHOLD) {
    return `On these numbers the counted value doesn't quite cover today's cost — it would have to rise, or the cost come down, before this pays.`;
  }
  return `The counted value covers less than half of today's cost. That's not close — the case only changes if the value is far bigger than entered.`;
}

/** The stress read (A2): your LOW value against the price-rise case. */
export function stressSentence(stressCoverage: number): string {
  return `Stress check: on your low value and the price-rise case, coverage is ${timesLabel(stressCoverage)}.`;
}

/** Verdict — where the risk actually sits, tying the answer back to the cost mix. */
export function verdictRiskSentence(band: CostBand): string {
  if (aiSharePct(band) >= AI_LED_THRESHOLD) {
    return `Most of the cost here is the AI itself, so the thing to watch is where AI prices go — which is exactly the price-inflation risk in step 2.`;
  }
  return `Most of the cost here isn't the AI — it's the fixed cost of running it and checking its work. So the thing to watch is that running cost, not the headline model price.`;
}

/* ------------------------------------------------------------------ *
 * Usage intensity (the "how often is it used" slider).
 * ------------------------------------------------------------------ */

/** Slider label from the library's volume-hint key: "Uses per developer a day". */
export function intensityLabel(band: IntensityBand): string {
  const phrase = VOLUME_UNIT_PHRASE[band.unitPer] ?? "uses per person a day";
  return phrase.charAt(0).toUpperCase() + phrase.slice(1);
}

/** The typical-vs-heavy hint under the intensity slider. */
export function intensityHint(band: IntensityBand): string {
  return `Typical is about ${band.mid} — leaner teams nearer ${band.low}, heavy use up to ${band.high}. The example starts at typical; drag it to match your team.`;
}

/* ------------------------------------------------------------------ *
 * Input rails — soft plausibility warnings, never a block.
 * ------------------------------------------------------------------ */

/** "Typical: 200" hint for an editable input. */
export function typicalHint(rail: InputRail): string {
  return `Typical: ${plainNum(rail.typical)}`;
}

/**
 * Soft out-of-band warning (null when the entry is inside the rails). The
 * tool keeps calculating — it just refuses to look confident about nonsense.
 */
export function railWarning(value: number, rail: InputRail): string | null {
  if (value >= rail.min && value <= rail.max) return null;
  const side = value < rail.min ? "below" : "above";
  return `That's well ${side} the usual range for this use case (roughly ${plainNum(rail.min)}–${plainNum(
    rail.max,
  )}). The maths still runs — just check the number is real before anyone quotes it.`;
}

/* ------------------------------------------------------------------ *
 * Per-unit economics — cost AND value per seat/ticket/claim/call-minute.
 * ------------------------------------------------------------------ */

/** "Per developer, about $31–$97 a month to run…" / "Per claim, about $0.50–$0.62 to run…". */
export function unitEconSentence(
  a: Archetype,
  band: CostBand,
  countedValueBase: number,
  units: number,
  cur: Cur = "usd",
): string {
  const n = Math.max(units, 1);
  const word = unitWord(a);
  const period = isPerSeat(a) ? " a month" : "";
  return `Per ${word}, that's about ${usdUnit(band.floor / n, cur)}–${usdUnit(
    band.repriced / n,
    cur,
  )}${period} to run, against about ${usdUnit(countedValueBase / n, cur)}${period} of counted value.`;
}

/** Short per-unit cost tag under a cost segment: "$52 / developer / mo" or "$0.62 / claim". */
export function perUnitTag(a: Archetype, monthly: number, units: number, cur: Cur = "usd"): string {
  const base = `${usdUnit(monthly / Math.max(units, 1), cur)} / ${unitWord(a)}`;
  return isPerSeat(a) ? `${base} / mo` : base;
}

/* ------------------------------------------------------------------ *
 * Value realism — the counted share of the entered value.
 * ------------------------------------------------------------------ */

export function haircutSentence(entered: number, counted: number, pct: number, cur: Cur = "usd"): string {
  return `You entered ${usd(entered, cur)}/mo. After adoption, what turns into money, and what's usable without rework, the verdict counts ${usd(
    counted,
    cur,
  )}/mo — about ${Math.round(pct)}% of it. A discount we apply against ourselves.`;
}

/** The break-even, restated in units an executive can sanity-check in their head. */
export function breakEvenSentence(be: BreakEvenHuman, haircutPct: number, cur: Cur = "usd"): string {
  const counting = `counting only ${haircutPct}% of it as real`;
  if (be.kind === "minutesPerWeek") {
    const time =
      be.minutes >= 90
        ? `${(be.minutes / 60).toFixed(1).replace(/\.0$/, "")} hours`
        : `${Math.max(1, Math.round(be.minutes))} minutes`;
    return `In plain terms: each ${be.unit} needs to save about ${time} a week for this to break even in the price-rise case (${counting}).`;
  }
  if (be.kind === "perTx") {
    return `In plain terms: each ${be.unit} needs to be worth about ${usdUnit(
      be.usd,
      cur,
    )} for this to break even in the price-rise case (${counting}).`;
  }
  return `In plain terms: each ${be.unit} needs to get about ${usdUnit(
    be.usd,
    cur,
  )} of value a month for this to break even in the price-rise case (${counting}).`;
}

/* ------------------------------------------------------------------ *
 * The first-year budget line.
 * ------------------------------------------------------------------ */

/** "Building it is a one-off $50k–$300k (typically about $120k)…" */
export function buildRangeSentence(
  build: { low: number; mid: number; high: number },
  cur: Cur = "usd",
): string {
  return `Building it is a one-off ${usdK(build.low, cur)}–${usdK(build.high, cur)} (typically about ${usdK(
    build.mid,
    cur,
  )}), before the monthly bill starts. That's the number to hold apart from the running cost — they land in different parts of a budget.`;
}

export function paybackSentence(line: BudgetLine): string {
  if (line.paybackMonth == null) {
    return `On these numbers it doesn't pay back inside the first year — the one-off build and the monthly bills stay ahead of the value through month 12.`;
  }
  if (line.paybackMonth <= 1) {
    return `On these numbers it pays back in the first month — the value covers the one-off build almost immediately.`;
  }
  return `On these numbers it pays back in month ${line.paybackMonth} — that's when the value delivered has covered the one-off build plus everything spent running it.`;
}

/** First-year totals — the line a budget paper actually quotes. */
export function firstYearSentence(line: BudgetLine, cur: Cur = "usd"): string {
  return `First year all-in: about ${usdK(line.firstYearCost, cur)} out (build plus 12 months of running it, as people come on board), against about ${usdK(
    line.firstYearValue,
    cur,
  )} of counted value in.`;
}

/* ------------------------------------------------------------------ *
 * Levers — now vs planned (A3).
 * ------------------------------------------------------------------ */

/** One lever's own monthly saving at the planned setting: "would take off about $940/mo". */
export function leverSavingSentence(saving: number, cur: Cur = "usd"): string {
  if (saving < 1) return "no saving at this setting";
  return `would take off about ${usdK(saving, cur)}/mo`;
}

/** The combined planned line under the levers. */
export function plannedTotalSentence(planned: number, current: number, cur: Cur = "usd"): string {
  const saving = Math.max(0, current - planned);
  if (saving < 1) {
    return `Your planned settings match what you're doing now — no further saving counted.`;
  }
  return `With everything you're planning in place, the bill above drops by about ${usdK(saving, cur)}/mo, to about ${usdK(
    planned,
    cur,
  )}/mo. Provable savings — but don't bank them until they're set up.`;
}

/* ------------------------------------------------------------------ *
 * Buy the seat vs build on the API.
 * ------------------------------------------------------------------ */

/** Verification status in the buyer's words — a reported figure never dresses as a list price. */
export function seatStatusLabel(status: SeatProduct["status"]): string {
  return {
    official: "list price",
    "official-indirect": "list price (checked indirectly)",
    reported: "reported — no published price",
  }[status];
}

export function seatIntroSentence(a: Archetype): string {
  return `The other way to buy this: a ready-made seat product, priced per ${unitWord(
    a,
  )} a month. Public US$ prices, for comparison — a seat bundles the build & run for you, so compare it against the whole bar, not just the AI slice.`;
}

/** "GitHub Copilot Business: $19/seat → about $3.8k/mo for 200 developers." (Always US$ — list prices.) */
export function seatProductLine(p: SeatProduct, a: Archetype, units: number): string {
  return `${p.label}: ${usdUnit(p.perSeatUsd)}/seat → about ${usdK(p.perSeatUsd * units)}/mo for ${unitsPhrase(
    a,
    units,
  )}.`;
}

/* ------------------------------------------------------------------ *
 * The cheapest-you'd-consider floor (A4).
 * ------------------------------------------------------------------ */

/** The floor column's model note: which model the floor was computed from. */
export function floorModelSentence(floorModelKey: string | null): string {
  if (!floorModelKey) {
    return "No models left to consider with the boxes unticked — the cheapest column is showing your chosen model instead.";
  }
  const m = resolveModel(floorModelKey);
  return `Cheapest here: ${m.label} (${m.providerLabel}) — checked prices only, over the providers you'd consider.`;
}
