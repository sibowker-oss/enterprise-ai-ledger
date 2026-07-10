import type { Archetype } from "@/lib/simulator/archetypes";
import type { Model } from "@/lib/simulator/types";
import { intensityBand, MATURITY_WORDS } from "@/lib/simulator/engine";
import {
  intensityHint,
  intensityLabel,
  maturityMeaning,
  railWarning,
  typicalHint,
  volumeHintSentence,
  type ModelChangeAdvisory,
} from "@/lib/simulator/copy";
import { unitsRail } from "@/lib/simulator/data";
import { BRAND, CONFIG, RAILS } from "@/lib/simulator/labels";

/** Group the model list by provider, preserving first-seen order, for <optgroup>s. */
function groupByProvider(models: Model[]): { provider: string; items: Model[] }[] {
  const groups: { provider: string; items: Model[] }[] = [];
  for (const m of models) {
    let g = groups.find((x) => x.provider === m.providerLabel);
    if (!g) {
      g = { provider: m.providerLabel, items: [] };
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
  if (!text) return null;
  return (
    <p
      role="status"
      className="mt-1.5 rounded-tile border border-status-amber-fg/30 bg-status-amber-soft p-2 text-[11.5px] leading-snug text-status-amber-fg"
    >
      <b className="font-semibold">{RAILS.checkTag}:</b> <span className="text-ink-muted">{text}</span>
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
}) {
  const rail = unitsRail(a.key);
  const band = intensityBand(a);
  return (
    <aside className="rounded-card border border-border bg-surface p-5 lg:sticky lg:top-4 lg:max-h-[calc(100vh-2rem)] lg:overflow-y-auto">
      <h2 className="eyebrow mb-4 text-xs font-semibold text-ink-faint">{CONFIG.heading}</h2>

      {/* Use case */}
      <div className="mb-5">
        <label className="mb-2 block text-sm font-semibold text-ink">{CONFIG.useCase}</label>
        <div className="flex flex-wrap gap-2" role="group" aria-label={CONFIG.useCase}>
          {archetypes.map((x) => {
            const on = x.key === a.key;
            return (
              <button
                key={x.key}
                type="button"
                aria-pressed={on}
                onClick={() => onSelectArchetype(x.key)}
                className={`min-h-[36px] rounded-chip border px-3 py-1.5 text-[12.5px] transition-colors ${
                  on
                    ? "border-accent bg-accent font-semibold text-white"
                    : "border-border bg-surface text-ink-muted hover:border-accent hover:text-ink"
                }`}
              >
                {x.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Business volume */}
      <div className="mb-5">
        <label htmlFor="sim-units" className="mb-1.5 block text-sm font-semibold text-ink">
          {a.unitLabel}
        </label>
        <input
          id="sim-units"
          type="number"
          min={1}
          step={1}
          value={units}
          onChange={(e) => onUnits(Math.max(1, Number(e.target.value) || 1))}
          className="w-full rounded-control border border-border bg-surface-muted px-3 py-2 text-[15px] text-ink tabular"
        />
        {rail && (
          <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{typicalHint(rail)}</p>
        )}
        {/* Usage-rate guidance lives on the intensity slider where one exists. */}
        {!band && <p className="mt-1.5 text-[11.5px] leading-snug text-ink-faint">{volumeHintSentence(a)}</p>}
        {rail && <RailWarning text={railWarning(units, rail)} />}
        <IllustrativeTag />
      </div>

      {/* Usage intensity — defaults to the TYPICAL rate; the slider still reaches
          the heavy end (library low–high band), so heavy is reachable, not the anchor. */}
      {band && intensity != null && (
        <div className="mb-5">
          <label htmlFor="sim-intensity" className="mb-1.5 block text-sm font-semibold text-ink">
            {intensityLabel(band)}{" "}
            <span className="tabular font-semibold text-accent-text">({intensity})</span>
          </label>
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
      <div>
        <label htmlFor="sim-model" className="mb-1.5 block text-sm font-semibold text-ink">
          {CONFIG.model}
        </label>
        <select
          id="sim-model"
          value={modelKey}
          onChange={(e) => onModel(e.target.value)}
          className="w-full rounded-control border border-border bg-surface-muted px-3 py-2 text-sm text-ink"
        >
          {groupByProvider(models).map((group) => (
            <optgroup key={group.provider} label={group.provider}>
              {group.items.map((m) => (
                <option key={m.key} value={m.key}>
                  {m.label}
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

        <p className="mt-3 border-t border-border pt-3 text-[11px] leading-snug text-ink-faint">
          All figures in US$ (model prices are quoted in US$).
        </p>
      </div>
    </aside>
  );
}
