import { deriveCase } from "@/lib/simulator/derive";
import type { SimConfig } from "@/lib/simulator/urlState";
import { PINS } from "@/lib/simulator/labels";
import { timesLabel } from "@/lib/simulator/copy";
import { usdK } from "@/lib/simulator/format";

const VERDICT_TONE: Record<string, string> = {
  good: "bg-status-green-soft text-status-green-fg",
  conditional: "bg-status-amber-soft text-status-amber-fg",
  marginal: "bg-status-amber-soft text-status-amber-fg",
  no: "bg-status-red-soft text-status-red-fg",
};

/**
 * The compare tray (CTO review item 1): up to five pinned cases side by side —
 * cost band, counted value, margin of safety, verdict — because the real
 * question is never one use case in isolation, it's which few to fund. Each
 * pin re-derives from its stored configuration through the same engine as the
 * live walk, so the tray can never disagree with the page.
 */
export function PinTray({
  pins,
  onRemove,
  onLoad,
}: {
  pins: SimConfig[];
  onRemove: (index: number) => void;
  onLoad: (index: number) => void;
}) {
  if (pins.length === 0) return null;
  const rows = pins.map((config) => deriveCase(config));
  return (
    <section className="mt-6 rounded-card border border-accent/30 bg-surface p-5 sm:p-6">
      <h2 className="text-lg font-semibold tracking-tight text-ink">{PINS.trayTitle}</h2>
      <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{PINS.trayIntro}</p>

      <div className="mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
          <thead>
            <tr className="border-b border-border text-[10.5px] uppercase tracking-wide text-ink-faint">
              <th className="py-2 pr-3 font-semibold">{PINS.colCase}</th>
              <th className="py-2 pr-3 font-semibold">{PINS.colCost}</th>
              <th className="py-2 pr-3 font-semibold">{PINS.colValue}</th>
              <th className="py-2 pr-3 font-semibold">{PINS.colMargin}</th>
              <th className="py-2 pr-3 font-semibold">{PINS.colVerdict}</th>
              <th className="py-2" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-b border-border/60">
                <td className="py-2.5 pr-3">
                  <button
                    type="button"
                    onClick={() => onLoad(i)}
                    className="font-semibold text-ink underline-offset-2 hover:text-accent-text hover:underline"
                    title="Load this case back into the walk"
                  >
                    {r.a.label}
                  </button>
                  <div className="text-[11px] text-ink-faint">
                    {r.config.units.toLocaleString("en-US")} {r.a.unitLabel.toLowerCase()}
                  </div>
                </td>
                <td className="py-2.5 pr-3 tabular text-ink-muted">
                  {usdK(r.band.today)} → {usdK(r.band.repriced)}
                </td>
                <td className="py-2.5 pr-3 tabular text-ink-muted">
                  {usdK(r.counted.base)}{" "}
                  <span className="text-[10.5px] text-ink-faint">({r.config.haircut}% counted)</span>
                </td>
                <td className="py-2.5 pr-3 tabular font-semibold text-ink">{timesLabel(r.coverage)}</td>
                <td className="py-2.5 pr-3">
                  <span
                    className={`inline-block rounded-chip px-2 py-0.5 text-[11px] font-semibold ${
                      VERDICT_TONE[r.verdict.klass]
                    }`}
                  >
                    {r.verdict.label}
                  </span>
                </td>
                <td className="py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => onRemove(i)}
                    className="rounded-control border border-border px-2 py-1 text-[11px] text-ink-faint hover:border-accent hover:text-ink"
                  >
                    {PINS.remove}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
