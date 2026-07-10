/**
 * Plain-language guardrail. The hard rule (concept.md §4 / output-voice-sample):
 * buyer-facing text never uses "layer", "multiple", "TCO", "archetype",
 * "repricing", "cohort" or "diagnostic". "Tokens" is allowed (the spec's own
 * volume-band decision and the prototype use it) and always glossed in copy.
 *
 * We scan every dynamic sentence (copy.ts, exercised across all archetypes,
 * models and providers) and every static label — the complete buyer surface.
 */
import { describe, expect, it } from "vitest";
import { ARCHETYPES } from "@/lib/simulator/archetypes";
import { MODEL_KEYS, model } from "@/lib/simulator/models";
import {
  driverRail,
  forwardSignal,
  oneOffBuild,
  seatProductsFor,
  tokenPrior,
  unitsRail,
} from "@/lib/simulator/data";
import {
  applyHaircut,
  breakEvenHuman,
  costBand,
  intensityBand,
  usage,
  valueRange,
  verdict,
} from "@/lib/simulator/engine";
import { budgetLine, DEFAULT_RAMP } from "@/lib/simulator/budget";
import * as copy from "@/lib/simulator/copy";
import * as labels from "@/lib/simulator/labels";

const BANNED = /\b(layers?|multiples?|tco|archetypes?|repricing|cohorts?|diagnostics?)\b/i;

/** Collect every buyer-facing string the tool can render. */
function collectStrings(): string[] {
  const out: string[] = [];

  // Static labels — flatten every exported string.
  for (const group of Object.values(labels)) {
    if (typeof group === "string") out.push(group);
    else for (const v of Object.values(group)) if (typeof v === "string") out.push(v);
  }

  // Dynamic copy — exercise across the full input space (all three Q2 states).
  const providers = ["openai", "anthropic", "google", "deepseek", "xai"];
  for (const p of providers) {
    const signal = forwardSignal(p);
    out.push(copy.provChipText(signal), copy.q2PlanSentence(signal.repricingMultiple));
    out.push(copy.tierLabel(signal.tier), copy.risePhrase(signal.repricingMultiple));
  }
  out.push(copy.Q2_COUNTER_SENTENCE);

  for (const a of ARCHETYPES) {
    const p = tokenPrior(a.priorKey);
    const u = usage(a, a.units, 2, { input: p.input, output: p.output, fanOut: p.fanOut });
    out.push(copy.q1SizingSentence(a, a.units, u), copy.q1BandSentence(u), copy.q1PerRequestSentence(u));
    out.push(copy.volumeHintSentence(a));
    for (let step = 0; step <= 4; step++) out.push(copy.maturityMeaning(step));
    for (const mk of MODEL_KEYS) {
      const band = costBand(a, mk, a.units, u.inputM, u.outputM, { cache: 30, batch: 20, route: 0 });
      out.push(copy.spreadSentence(a, band, a.units), copy.costMixSentence(band));
      out.push(copy.verdictWeighingSentence(band.today, band));
      // The model-change advisory is a buyer-facing surface too — scan it.
      const adv = copy.modelChangeAdvisory(a, mk, p.defaultModel);
      if (adv) {
        out.push(adv.rebaseline, adv.sensitivity);
        if (adv.reasoning) out.push(adv.reasoning);
      }
      void model(mk); // ensure every surfaced model resolves
    }

    // ---- CTO-review additions (2026-07-10): the new buyer-facing surface ----
    const band = costBand(a, a.defaultModelKey, a.units, u.inputM, u.outputM, {
      cache: 30,
      batch: 20,
      route: 0,
    });
    const businessTx = a.units * a.txPerUnitMonth;
    const value = valueRange(a, a.units, businessTx, {});
    const counted = applyHaircut(value, 60);

    // All four verdict states, worded for this archetype.
    for (const vb of [band.repriced * 2, band.today * 1.3, band.today * 0.8, band.today * 0.1]) {
      const v = verdict(vb, band, a);
      out.push(v.label, v.headline, v.condition);
    }

    // Per-unit economics + rails + intensity.
    out.push(copy.unitEconSentence(a, band, counted.base, a.units));
    out.push(copy.perUnitTag(a, band.today, a.units));
    const ib = intensityBand(a);
    if (ib) out.push(copy.intensityLabel(ib), copy.intensityHint(ib));
    for (const rail of [unitsRail(a.key), driverRail(a.key)]) {
      if (!rail) continue;
      out.push(copy.typicalHint(rail));
      const warn = copy.railWarning(rail.max * 100, rail);
      if (warn) out.push(warn);
    }

    // Value realism + break-even in human units.
    out.push(copy.haircutSentence(value.base, counted.base, 60));
    out.push(copy.breakEvenSentence(breakEvenHuman(a, band, a.units, businessTx, {}, 60), 60));

    // The budget line, both payback outcomes.
    const line = budgetLine(a.key, band, counted, DEFAULT_RAMP);
    out.push(copy.buildRangeSentence(oneOffBuild(a.key)));
    out.push(copy.paybackSentence(line), copy.firstYearSentence(line));
    out.push(
      copy.paybackSentence({ ...line, paybackMonth: null }),
      copy.paybackSentence({ ...line, paybackMonth: 1 }),
      copy.paybackSentence({ ...line, paybackMonth: 7 }),
    );

    // Buy-the-seat comparison, where it exists.
    const seats = seatProductsFor(a.key);
    if (seats.length > 0) {
      out.push(copy.seatIntroSentence(a));
      for (const s of seats) {
        out.push(copy.seatProductLine(s, a, a.units), copy.seatStatusLabel(s.status));
      }
    }

    // ---- Update v2 additions: stress line, now/planned levers, floor note,
    //      pluralisation — the whole new buyer-facing surface. ----
    out.push(copy.stressSentence(0.4), copy.stressSentence(2.5));
    out.push(copy.plannedTotalSentence(band.today * 0.7, band.today), copy.plannedTotalSentence(band.today, band.today));
    out.push(copy.leverSavingSentence(0), copy.leverSavingSentence(940));
    out.push(copy.floorModelSentence(band.floorModelKey), copy.floorModelSentence(null));
    out.push(copy.unitsPhrase(a, 1), copy.unitsPhrase(a, a.units));
  }
  return out;
}

describe("no internal jargon reaches the buyer", () => {
  const strings = collectStrings();

  it("scans a non-trivial surface", () => {
    expect(strings.length).toBeGreaterThan(50);
  });

  it("contains none of the banned terms", () => {
    const offenders = strings.filter((s) => BANNED.test(s));
    expect(offenders, `banned jargon found in: ${offenders.join(" || ")}`).toEqual([]);
  });
});
