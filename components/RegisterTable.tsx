"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Decision, RAG, UseCase } from "@/lib/types";
import { aiRoleCategory } from "@/lib/portfolio";
import { aud } from "@/lib/format";
import { DecisionChip, RagChip } from "./StatusChip";
import { ConfidenceDots } from "./ConfidenceDots";

type SortKey = "id" | "name" | "businessUnit" | "cost";
type SortDir = "asc" | "desc";

const ALL = "All";

function Select({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: string[];
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-xs">
      <span className="font-medium uppercase tracking-wide text-ink-faint">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-control border border-border bg-surface px-2.5 py-1.5 text-sm text-ink"
      >
        {[ALL, ...options].map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  );
}

function SortHeader({
  label,
  col,
  sort,
  dir,
  onSort,
  align = "left",
}: {
  label: string;
  col: SortKey;
  sort: SortKey;
  dir: SortDir;
  onSort: (c: SortKey) => void;
  align?: "left" | "right";
}) {
  const active = sort === col;
  return (
    <th className={`px-3 py-2 font-medium ${align === "right" ? "text-right" : "text-left"}`}>
      <button
        type="button"
        onClick={() => onSort(col)}
        className={`inline-flex items-center gap-1 hover:text-ink ${active ? "text-ink" : ""}`}
        aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : "none"}
      >
        {label}
        <span aria-hidden="true" className="text-[10px]">
          {active ? (dir === "asc" ? "▲" : "▼") : "↕"}
        </span>
      </button>
    </th>
  );
}

/**
 * The Use Case Register table (BUILD_SPEC §5.2). Client-side filter by BU /
 * decision / risk / AI role, free-text search, and sortable columns. Row →
 * detail at /register/:id.
 */
export function RegisterTable({ useCases }: { useCases: UseCase[] }) {
  const [query, setQuery] = useState("");
  const [bu, setBu] = useState(ALL);
  const [decision, setDecision] = useState(ALL);
  const [risk, setRisk] = useState(ALL);
  const [role, setRole] = useState(ALL);
  const [sort, setSort] = useState<SortKey>("cost");
  const [dir, setDir] = useState<SortDir>("desc");

  const businessUnits = useMemo(
    () => [...new Set(useCases.map((u) => u.businessUnit))].sort(),
    [useCases],
  );

  const onSort = (col: SortKey) => {
    if (col === sort) {
      setDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSort(col);
      setDir(col === "cost" ? "desc" : "asc");
    }
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = useCases.filter((uc) => {
      if (bu !== ALL && uc.businessUnit !== bu) return false;
      if (decision !== ALL && uc.decision !== (decision.toLowerCase() as Decision)) return false;
      if (risk !== ALL && uc.risk.rag !== (risk.toLowerCase() as RAG)) return false;
      if (role !== ALL && aiRoleCategory(uc) !== role) return false;
      if (q) {
        const hay = `${uc.id} ${uc.name} ${uc.owner} ${uc.vendor} ${uc.model} ${uc.businessUnit}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    const sorted = [...filtered].sort((a, b) => {
      let cmp = 0;
      if (sort === "cost") cmp = a.cost.totalAnnual - b.cost.totalAnnual;
      else if (sort === "id") cmp = a.id.localeCompare(b.id);
      else if (sort === "name") cmp = a.name.localeCompare(b.name);
      else if (sort === "businessUnit") cmp = a.businessUnit.localeCompare(b.businessUnit);
      return dir === "asc" ? cmp : -cmp;
    });
    return sorted;
  }, [useCases, query, bu, decision, risk, role, sort, dir]);

  const resetAll = () => {
    setQuery("");
    setBu(ALL);
    setDecision(ALL);
    setRisk(ALL);
    setRole(ALL);
  };

  const filtersActive = query || bu !== ALL || decision !== ALL || risk !== ALL || role !== ALL;

  return (
    <div>
      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-card border border-border bg-surface p-4">
        <div className="flex flex-wrap items-end gap-3">
          <label className="flex flex-1 flex-col gap-1 text-xs" style={{ minWidth: 200 }}>
            <span className="font-medium uppercase tracking-wide text-ink-faint">Search</span>
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Name, owner, vendor…"
              className="rounded-control border border-border bg-surface px-3 py-1.5 text-sm text-ink"
            />
          </label>
          <Select label="Business unit" value={bu} options={businessUnits} onChange={setBu} />
          <Select label="Decision" value={decision} options={["Scale", "Fix", "Stop"]} onChange={setDecision} />
          <Select label="Risk" value={risk} options={["Green", "Amber", "Red"]} onChange={setRisk} />
          <Select label="AI role" value={role} options={["Assistive", "Agentic"]} onChange={setRole} />
        </div>
        <div className="flex items-center justify-between text-sm text-ink-faint">
          <span className="tabular">
            Showing <strong className="font-semibold text-ink">{rows.length}</strong> of {useCases.length} use cases
          </span>
          {filtersActive && (
            <button type="button" onClick={resetAll} className="text-accent hover:underline">
              Clear filters
            </button>
          )}
        </div>
      </div>

      {/* Mobile: stacked cards (the table is unreadable on a phone). */}
      <ul className="mt-4 space-y-3 lg:hidden">
        {rows.map((uc) => (
          <li key={uc.id}>
            <Link
              href={`/register/${uc.id}`}
              className="block rounded-card border border-border bg-surface p-4 active:bg-surface-muted"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-ink">{uc.name}</p>
                  <p className="mt-0.5 text-xs text-ink-faint">{uc.id} · {uc.businessUnit}</p>
                </div>
                <span className="tabular shrink-0 text-right font-semibold text-ink">{aud(uc.cost.totalAnnual)}</span>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <RagChip rag={uc.risk.rag} size="sm" />
                <DecisionChip decision={uc.decision} size="sm" />
                <span className="inline-flex items-center gap-1.5 text-xs text-ink-muted">
                  <ConfidenceDots confidence={uc.outcome.confidence} showLabel={false} />
                  evidence
                </span>
                <span className="text-xs text-ink-faint">{aiRoleCategory(uc)} · {uc.vendor}</span>
              </div>
            </Link>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="rounded-card border border-border bg-surface px-4 py-10 text-center text-ink-faint">
            No use cases match these filters.
          </li>
        )}
      </ul>

      {/* Desktop: full table */}
      <div className="mt-4 hidden overflow-x-auto rounded-card border border-border bg-surface lg:block">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-border bg-surface-muted/50 text-xs uppercase tracking-wide text-ink-faint">
              <SortHeader label="ID" col="id" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader label="Use case" col="name" sort={sort} dir={dir} onSort={onSort} />
              <SortHeader label="Business unit" col="businessUnit" sort={sort} dir={dir} onSort={onSort} />
              <th className="px-3 py-2 text-left font-medium">Vendor / model</th>
              <th className="px-3 py-2 text-left font-medium">AI role</th>
              <SortHeader label="Annual cost" col="cost" sort={sort} dir={dir} onSort={onSort} align="right" />
              <th className="px-3 py-2 text-left font-medium">Risk</th>
              <th className="px-3 py-2 text-left font-medium">Confidence</th>
              <th className="px-3 py-2 text-left font-medium">Decision</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((uc) => (
              <tr key={uc.id} className="border-b border-border/60 hover:bg-surface-muted/40">
                <td className="tabular px-3 py-2.5 text-ink-faint">{uc.id}</td>
                <td className="px-3 py-2.5">
                  <Link href={`/register/${uc.id}`} className="font-medium text-ink hover:text-accent hover:underline">
                    {uc.name}
                  </Link>
                </td>
                <td className="px-3 py-2.5 text-ink-muted">{uc.businessUnit}</td>
                <td className="px-3 py-2.5 text-ink-muted">
                  {uc.vendor}
                  <span className="block text-xs text-ink-faint">{uc.model}</span>
                </td>
                <td className="px-3 py-2.5 text-ink-muted">{aiRoleCategory(uc)}</td>
                <td className="tabular px-3 py-2.5 text-right font-medium text-ink">{aud(uc.cost.totalAnnual)}</td>
                <td className="px-3 py-2.5"><RagChip rag={uc.risk.rag} size="sm" /></td>
                <td className="px-3 py-2.5"><ConfidenceDots confidence={uc.outcome.confidence} showLabel={false} /></td>
                <td className="px-3 py-2.5"><DecisionChip decision={uc.decision} size="sm" /></td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-3 py-10 text-center text-ink-faint">
                  No use cases match these filters.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
