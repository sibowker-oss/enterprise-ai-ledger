"use client";

import { useMemo, useState } from "react";
import { assumptionsIndex } from "@/lib/simulator/data";
import { DRAWER } from "@/lib/simulator/labels";
import { APP_COMMIT, DATA_VERSION, ENGINE_VERSION } from "@/lib/simulator/versions";

/**
 * "Assumptions and sources" (CTO update v2, 0.1): every decision-driving
 * figure, its source, its date and its verification status, generated from
 * the reference data — never restated by hand. Unknown displays as unknown.
 */
export function AssumptionsDrawer() {
  const [open, setOpen] = useState(false);
  const rows = useMemo(() => assumptionsIndex(), []);
  const groups = useMemo(() => {
    const g = new Map<string, typeof rows>();
    for (const r of rows) {
      const list = g.get(r.group) ?? [];
      list.push(r);
      g.set(r.group, list);
    }
    return [...g.entries()];
  }, [rows]);

  return (
    <section aria-label={DRAWER.title} className="mt-8">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="assumptions-panel"
        className="inline-flex min-h-[44px] items-center gap-2 rounded-control border border-border bg-surface px-4 py-2 text-[13px] font-semibold text-ink-muted transition-colors hover:border-accent hover:text-ink"
      >
        {open ? "▾" : "▸"} {DRAWER.title}
      </button>

      {open && (
        <div
          id="assumptions-panel"
          className="mt-3 rounded-card border border-border bg-surface p-4 sm:p-5"
        >
          <p className="text-[13px] leading-relaxed text-ink-muted">{DRAWER.intro}</p>
          {groups.map(([group, items]) => (
            <div key={group} className="mt-4">
              <h3 className="text-[12px] font-semibold uppercase tracking-wide text-ink">{group}</h3>
              <div className="mt-1.5 overflow-x-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-[12px]">
                  <thead>
                    <tr className="border-b border-border text-[10px] uppercase tracking-wide text-ink-faint">
                      <th className="py-1.5 pr-3 font-semibold">{DRAWER.colFigure}</th>
                      <th className="py-1.5 pr-3 font-semibold">{DRAWER.colValue}</th>
                      <th className="py-1.5 pr-3 font-semibold">{DRAWER.colSource}</th>
                      <th className="py-1.5 pr-3 font-semibold">{DRAWER.colDate}</th>
                      <th className="py-1.5 font-semibold">{DRAWER.colStatus}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((r, i) => (
                      <tr key={i} className="border-b border-border/50 align-top">
                        <td className="py-1.5 pr-3 font-medium text-ink">{r.label}</td>
                        <td className="py-1.5 pr-3 tabular text-ink-muted">{r.value}</td>
                        <td className="py-1.5 pr-3 text-ink-faint">{r.source}</td>
                        <td className="py-1.5 pr-3 tabular text-ink-faint">{r.date}</td>
                        <td className="py-1.5 text-ink-faint">{r.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
          <p className="mt-4 border-t border-border pt-3 text-[11px] text-ink-faint">
            Data version {DATA_VERSION} · calculations v{ENGINE_VERSION} · app {APP_COMMIT}
          </p>
        </div>
      )}
    </section>
  );
}
