"use client";

import type { Archetype } from "@/lib/simulator/archetypes";
import { CATEGORY_ORDER } from "@/lib/simulator/archetypes";
import type { Model } from "@/lib/simulator/types";
import { intensityBand } from "@/lib/simulator/engine";
import {
  intensityHint,
  intensityLabel,
  maturityMeaning,
  railWarning,
  typicalHint,
  volumeHintSentence,
  type ModelChangeAdvisory,
} from "@/lib/simulator/copy";
import { providerFacts, unitsRail } from "@/lib/simulator/data";
import { MATURITY_WORDS } from "@/lib/simulator/engine";
import { BRAND, CONFIG, CONSIDER, CURRENCY, RAILS } from "@/lib/simulator/labels";
import type { Currency } from "@/lib/simulator/urlState";
import type { ConfidenceLevel } from "@/lib/simulator/types";
import { NumberField } from "./NumberField";

/** Group the use cases by business area, in CATEGORY_ORDER (empty groups dropped). */
function groupByCategory(archetypes: Archetype[]): { category: string; items: Archetype[] }[] {
  return CATEGORY_ORDER.map((category) => ({
    category,
    items: archetypes.filter((x) => x.category === category),
  })).filter((g) => g.items.length > 0);
}

/** Group the model list by provider, preserving first-seen order, for <optgroup>s. */
function groupByProvider(models: Model[]): { provider: string; providerKey: string; items: Model[] }[] {
  const groups: { provider: string; providerKey: string; items: Model[] }[] = [];
  for (const m of models) {
    let g = groups.find((x) => x.provider === m.providerLabel);
    if (!g) {
      g = { provider: m.providerLabel, providerKey: m.provider, items: [] };
      groups.push(g);
    }
    g.items.push(m);
  }
  return groups;
}

/** Small "illustrative — replace with your usage" tag on the inputs the buyer owns. */
function IllustrativeTag() {
  return (
    <span className="mt-1.5 inline-block rounded-chip bg-surface-muted px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-ink-faint">
      {BRAND.illustrativeTag}
    </span>
  );
}

/** Soft out-of-band warning — the input keeps working, the tool just says so. */
export function RailWarning({ text }: { text: string | null }) {
  return (
    <p role="status" aria-live="polite" className={text ? "mt-1.5 rounded-tile border border-status-amber-fg/30 bg-status-amber-soft p-2 text-[11.5px] leading-snug text-status-amber-fg" : "sr-only"}>
      {text ? (
        <>
          <b className="font-semibold">{RAILS.checkTag}:</b>{" "}
          <span className="text-ink-muted">{text}</span>
        </>
      ) : null}
    </p>
  );
}

export function ConfigPanel({
  archetypes,
  a,
  onSelectArchetype,
  units,
  onUnits,
  intensity,
  onIntensity,
  maturity,
  onMaturity,
  models,
  modelKey,
  onModel,
  modelAdvisory,
  excludedProviders,
  onToggleProvider,
  currency,
  onCurrency,
  confidenceUnits,
  onConfidenceUnits,
  confidenceIntensity,
  onConfidenceIntensity,
  confidenceMaturity,
  onConfidenceMaturity,
}: {
  archetypes: Archetype[];
  a: Archetype;
  onSelectArchetype: (key: string) => void;
  units: number;
  onUnits: (n: number) => void;
  intensity: number | null;
  onIntensity: (n: number) => void;
  maturity: number;
  onMaturity: (n: number) => void;
  models: Model[];
  modelKey: string;
  onModel: (key: string) => void;
  modelAdvisory: ModelChangeAdvisory | null;
  excludedProviders: string[];
  onToggleProvider: (provider: string) => void;
  currency: Currency;
  onCurrency: (c: Currency) => void;
  confidenceUnits?: ConfidenceLevel;
  onConfidenceUnits?: (level: ConfidenceLevel) => void;
  confidenceIntensity?: ConfidenceLevel;
  onConfidenceIntensity?: (level: ConfidenceLevel) => void;
  confidenceMaturity?: ConfidenceLevel;
  onConfidenceMaturity?: (level: ConfidenceLevel) => void;
}) {
  const rail = unitsRail(a.key);
  const band = intensityBand(a);
  const groups = groupByProvider(models);
  return (
    <aside
      aria-label={CONFIG.heading}
      className="rounded-card border border-border bg-surface p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto"
    >
      <h2 className="eyebrow mb-4 text-xs font-semibold text-ink-faint">{CONFIG.heading}</h2>

      {/* Use case — grouped by business area, scannable list; the selected
          case's one-line description shows below (fuller note lives in Q1). */}
      <div className="mb-5">
        <h3 className="mb-2 block text-sm font-semibold text-ink">{CONFIG.useCase}</h3>
        <div
          role="group"
          aria-label={CONFIG.useCase}
          className="max-h-[300px] space-y-2.5 overflow-y-auto rounded-tile border border-border p-2"
        >
          {groupByCategory(archetypes).map((group) => (
            <div key={group.category}>
              <p className="px-1 pb-1 text-[10px] font-semibold uppercase tracking-wide text-ink-faint">
                {group.category}
              </p>
              <div className="space-y-0.5">
                {group.items.map((x) => {
                  const on = x.key === a.key;
                  return (
                    <button
                      key={x.key}
                      type="button"
                      aria-pressed={on}
                      onClick={() => onSelectArchetype(x.key)}
                      className={`block w-full rounded-control px-2.5 py-2 text-left text-[12.5px] leading-snug transition-colors ${
                        on
                          ? "bg-accent font-semibold text-white"
                          : "text-ink-muted hover:bg-surface-muted hover:text-ink"
                      }`}
                    >
                      {x.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
        {/* Selected use case's plain description. */}
        <p className="mt-2 rounded-tile bg-surface-muted px-2.5 py-2 text-[11.5px] leading-snug text-ink-muted">
          {a.blurb}
        </p>
      </div>

      {/* Business volume — inline validation, no silent clamping (A6). */}
      <div className="mb-5">
        <NumberField
          id="sim-units"
          label={a.unitLabel}
          value={units}
          min={1}
          step={1}
          confidenceLevel={confidenceUnits}
          onConfidenceChange={onConfidenceUnits}
          onChange={onUnits}
        />
        {rail && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{typicalHint(rail)}</p>}
        {/* Usage-rate guidance lives on the intensity slider where one exists. */}
        {!band && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{volumeHintSentence(a)}</p>}
        <RailWarning text={rail ? railWarning(units, rail) : null} />
        <IllustrativeTag />
      </div>

      {/* Usage intensity — defaults to TYPICAL; the slider still reaches the
          heavy end. Paired with a numeric field (A6). */}
      {band && intensity != null && (
        <div className="mb-5">
          <label htmlFor="sim-intensity" className="mb-1.5 block text-sm font-semibold text-ink">
            {intensityLabel(band)}
          </label>
          <div className="flex items-center gap-3">
            <input
              id="sim-intensity"
              type="range"
              min={band.low}
              max={band.high}
              step={1}
              value={intensity}
              onChange={(e) => onIntensity(Number(e.target.value))}
              className="w-full accent-accent"
              aria-valuetext={`${intensity} (typical is ${band.mid})`}
            />
            <NumberField
              id="sim-intensity-num"
              label={intensityLabel(band)}
              value={intensity}
              min={band.low}
              max={band.high}
              compact
              confidenceLevel={confidenceIntensity}
              onConfidenceChange={onConfidenceIntensity}
              onChange={onIntensity}
            />
          </div>
          <div className="flex justify-between text-[11px] text-ink-faint">
            <span>{band.low}</span>
            <span>typical {band.mid}</span>
            <span>{band.high}</span>
          </div>
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{intensityHint(band)}</p>
        </div>
      )}

      {/* Leanness / maturity */}
      <div className="mb-5">
        <label htmlFor="sim-maturity" className="mb-1.5 block text-sm font-semibold text-ink">
          {CONFIG.leanness}{" "}
          <span className="font-semibold text-accent-text">({MATURITY_WORDS[maturity]})</span>
        </label>
        <input
          id="sim-maturity"
          type="range"
          min={0}
          max={4}
          step={1}
          value={maturity}
          onChange={(e) => onMaturity(Number(e.target.value))}
          className="w-full accent-accent"
          aria-valuetext={MATURITY_WORDS[maturity]}
        />
        <div className="flex justify-between text-[11px] text-ink-faint">
          <span>{CONFIG.leanLeft}</span>
          <span>{CONFIG.leanRight}</span>
        </div>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">
          Right now: {maturityMeaning(maturity)}.
        </p>
        <p className="mt-1 text-[11.5px] leading-snug text-ink-faint">{CONFIG.leannessHint}</p>
        <p className="mt-1.5 text-[11px] leading-snug text-accent-text">{CONFIG.leannessCovers}</p>
      </div>

      {/* Model */}
      <div className="mb-5">
        <label htmlFor="sim-model" className="mb-1.5 block text-sm font-semibold text-ink">
          {CONFIG.model}
        </label>
        <select
          id="sim-model"
          value={modelKey}
          onChange={(e) => onModel(e.target.value)}
          className="min-h-[44px] w-full rounded-control border border-border bg-surface-muted px-3 py-2 text-sm text-ink"
        >
          {groups.map((group) => (
            <optgroup key={group.provider} label={group.provider}>
              {group.items.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
                  {m.verified ? "" : ` — ${CONSIDER.unverifiedTag}`}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{CONFIG.modelHint}</p>

        {/* Model-change advisory — a swap changes consumption, not just price (rule #4). */}
        {modelAdvisory && (
          <div className="mt-2.5 rounded-tile border border-status-amber-fg/25 bg-status-amber-soft p-2.5 text-[11.5px] leading-snug text-ink-muted">
            <p className="font-medium text-status-amber-fg">{modelAdvisory.rebaseline}</p>
            <p className="mt-1.5">{modelAdvisory.sensitivity}</p>
            {modelAdvisory.reasoning && <p className="mt-1.5">{modelAdvisory.reasoning}</p>}
          </div>
        )}
      </div>

      {/* Which providers would you consider? (A4 — facts + user choice only.) */}
      <div className="mb-5 border-t border-border pt-4">
        <h3 className="mb-1 text-sm font-semibold text-ink">{CONSIDER.heading}</h3>
        <p className="mb-2 text-[11.5px] leading-snug text-ink-faint">{CONSIDER.hint}</p>
        <ul className="space-y-0.5">
          {groups.map((g) => {
            const facts = providerFacts(g.providerKey);
            const excluded = excludedProviders.includes(g.providerKey);
            return (
              <li key={g.providerKey}>
                <label className="flex min-h-[44px] cursor-pointer items-center gap-2.5 rounded-control px-1 text-[12.5px] text-ink-muted hover:bg-surface-muted">
                  <input
                    type="checkbox"
                    checked={!excluded}
                    onChange={() => onToggleProvider(g.providerKey)}
                    className="h-5 w-5 accent-accent"
                  />
                  <span className="font-medium text-ink">{g.provider}</span>
                  {facts && (
                    <span className="ml-auto text-right text-[10.5px] leading-tight text-ink-faint">
                      {facts.hqJurisdiction} ·{" "}
                      {facts.openWeights ? CONSIDER.openTag : CONSIDER.hostedTag}
                    </span>
                  )}
                </label>
              </li>
            );
          })}
        </ul>
      </div>

      {/* Currency — display conversion only, dated rate (original brief item 9). */}
      <div className="border-t border-border pt-4">
        <div className="flex items-center justify-between gap-2">
          <span id="sim-currency-label" className="text-sm font-semibold text-ink">
            {CURRENCY.label}
          </span>
          <div role="group" aria-labelledby="sim-currency-label" className="flex gap-1">
            {(["usd", "aud"] as const).map((c) => (
              <button
                key={c}
                type="button"
                aria-pressed={currency === c}
                onClick={() => onCurrency(c)}
                className={`min-h-[44px] rounded-control border px-3 text-[12.5px] font-semibold transition-colors ${
                  currency === c
                    ? "border-accent bg-accent text-white"
                    : "border-border bg-surface text-ink-muted hover:border-accent"
                }`}
              >
                {CURRENCY[c]}
              </button>
            ))}
          </div>
        </div>
        <p className="mt-2 text-[11px] leading-snug text-ink-faint">{CURRENCY.note}</p>
      </div>
    </aside>
  );
}
