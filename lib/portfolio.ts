/**
 * Portfolio selectors — pure aggregation functions over the use-case list.
 *
 * Every headline number in the prototype derives from these (never invented in
 * code). The functions take `UseCase[]` explicitly so they are pure and
 * unit-testable; `computePortfolioRollup` reassembles the line-item-derived
 * subset of `PortfolioRollup`, and the test asserts it equals the roll-up baked
 * into the JSON — guaranteeing charts and the JSON can never drift apart.
 *
 * Convenience values bound to the seed data live at the bottom of this file.
 */
import { useCases as seedUseCases, benchmarks as seedBenchmarks } from "./seed";
import type {
  Benchmarks,
  Confidence,
  CostComponent,
  Decision,
  RAG,
  UseCase,
} from "./types";

/** Canonical key orders — iterate these so records are deterministic + complete. */
export const DECISIONS: readonly Decision[] = ["scale", "fix", "stop"];
export const RAGS: readonly RAG[] = ["green", "amber", "red"];
export const COST_COMPONENTS: readonly CostComponent[] = [
  "licences",
  "tokens",
  "cloud",
  "integration",
  "people",
];
/** Confidence levels treated as "solid" outcome evidence (BUILD_SPEC §5.4). */
export const EVIDENCE_BACKED_CONFIDENCE: readonly Confidence[] = [
  "high",
  "medium-high",
];

function zeroRecord<K extends string>(keys: readonly K[]): Record<K, number> {
  return keys.reduce(
    (acc, k) => ((acc[k] = 0), acc),
    {} as Record<K, number>,
  );
}

/** Total annual AI spend across the portfolio. */
export function totalAnnualSpend(useCases: UseCase[]): number {
  return useCases.reduce((sum, uc) => sum + uc.cost.totalAnnual, 0);
}

/** A$ of annual spend grouped by scale/fix/stop decision. */
export function spendByDecision(useCases: UseCase[]): Record<Decision, number> {
  const out = zeroRecord(DECISIONS);
  for (const uc of useCases) out[uc.decision] += uc.cost.totalAnnual;
  return out;
}

/** Count of use cases grouped by decision. */
export function countByDecision(useCases: UseCase[]): Record<Decision, number> {
  const out = zeroRecord(DECISIONS);
  for (const uc of useCases) out[uc.decision] += 1;
  return out;
}

/** A$ of annual spend grouped by RAG risk rating. */
export function spendByRisk(useCases: UseCase[]): Record<RAG, number> {
  const out = zeroRecord(RAGS);
  for (const uc of useCases) out[uc.risk.rag] += uc.cost.totalAnnual;
  return out;
}

/** Count of use cases grouped by RAG risk rating. */
export function countByRisk(useCases: UseCase[]): Record<RAG, number> {
  const out = zeroRecord(RAGS);
  for (const uc of useCases) out[uc.risk.rag] += 1;
  return out;
}

/** A$ of annual spend grouped by cost component (the donut). */
export function spendByCostType(
  useCases: UseCase[],
): Record<CostComponent, number> {
  const out = zeroRecord(COST_COMPONENTS);
  for (const uc of useCases) {
    for (const c of COST_COMPONENTS) out[c] += uc.cost[c];
  }
  return out;
}

/** Reclaimable spend = spend sitting in "stop" use cases. */
export function reclaimableSpend(useCases: UseCase[]): number {
  return spendByDecision(useCases).stop;
}

/** Unmanaged-risk spend = spend carrying a red RAG rating. */
export function atRiskUnmanagedSpend(useCases: UseCase[]): number {
  return spendByRisk(useCases).red;
}

/**
 * Evidence-backed spend (BUILD_SPEC §5.4 what-if): spend on use cases whose
 * outcome confidence is high or medium-high. In the seed data this is
 * A$2,066,000 across UC-01, UC-02, UC-05, UC-07.
 */
export function evidenceBackedSpend(useCases: UseCase[]): number {
  return useCases
    .filter((uc) =>
      EVIDENCE_BACKED_CONFIDENCE.includes(uc.outcome.confidence),
    )
    .reduce((sum, uc) => sum + uc.cost.totalAnnual, 0);
}

/** Use cases that count as evidence-backed, in id order. */
export function evidenceBackedUseCases(useCases: UseCase[]): UseCase[] {
  return useCases.filter((uc) =>
    EVIDENCE_BACKED_CONFIDENCE.includes(uc.outcome.confidence),
  );
}

/**
 * Per-line integrity: each use case's reconciled `totalAnnual` must equal the
 * sum of its five cost components. A break here means the JSON itself is
 * internally inconsistent.
 */
export function costComponentsReconcile(uc: UseCase): boolean {
  const sum = COST_COMPONENTS.reduce((s, c) => s + uc.cost[c], 0);
  return sum === uc.cost.totalAnnual;
}

/**
 * The line-item-derived subset of the portfolio roll-up. This intentionally
 * omits the editorial headline counts `businessUnits` and `vendorsInUse`, which
 * are NOT naive distinct-counts of the granular fields and are carried as
 * declared metadata on the JSON instead.
 */
export interface DerivedRollup {
  totalAnnualSpendAud: number;
  useCaseCount: number;
  spendByDecision: Record<Decision, number>;
  countByDecision: Record<Decision, number>;
  spendByRisk: Record<RAG, number>;
  countByRisk: Record<RAG, number>;
  spendByCostType: Record<CostComponent, number>;
  reclaimableAnnualSpendAud: number;
  atRiskUnmanagedSpendAud: number;
}

export function computePortfolioRollup(useCases: UseCase[]): DerivedRollup {
  return {
    totalAnnualSpendAud: totalAnnualSpend(useCases),
    useCaseCount: useCases.length,
    spendByDecision: spendByDecision(useCases),
    countByDecision: countByDecision(useCases),
    spendByRisk: spendByRisk(useCases),
    countByRisk: countByRisk(useCases),
    spendByCostType: spendByCostType(useCases),
    reclaimableAnnualSpendAud: reclaimableSpend(useCases),
    atRiskUnmanagedSpendAud: atRiskUnmanagedSpend(useCases),
  };
}

// ── Business-unit grouping ───────────────────────────────────────────────────
// The granular `businessUnit` field has 9 distinct values, but the headline
// counts 7 BUs. Resolved rule (Simon, 2026-06-22): collapse the three
// "Retail Banking - *" sub-teams into one "Retail Banking" BU, and treat each
// "Group - *" sub-function as its own BU (strip the "Group - " prefix). Yields
// exactly 7: Retail Banking, Business Banking, Wealth, Financial Crime,
// Technology, Marketing, Risk & Compliance.

/** Map a granular businessUnit string to its headline BU group. */
export function businessUnitGroup(businessUnit: string): string {
  if (businessUnit.startsWith("Retail Banking")) return "Retail Banking";
  if (businessUnit.startsWith("Group - ")) {
    return businessUnit.slice("Group - ".length);
  }
  return businessUnit;
}

export interface BusinessUnitSpend {
  businessUnit: string;
  spend: number;
  useCaseCount: number;
}

/** Spend grouped to the 7 headline BUs, sorted by spend desc. */
export function spendByBusinessUnit(useCases: UseCase[]): BusinessUnitSpend[] {
  const map = new Map<string, BusinessUnitSpend>();
  for (const uc of useCases) {
    const bu = businessUnitGroup(uc.businessUnit);
    const row = map.get(bu) ?? { businessUnit: bu, spend: 0, useCaseCount: 0 };
    row.spend += uc.cost.totalAnnual;
    row.useCaseCount += 1;
    map.set(bu, row);
  }
  return [...map.values()].sort((a, b) => b.spend - a.spend);
}

/** Count of distinct headline BUs (== portfolioRollup.businessUnits == 7). */
export function businessUnitCount(useCases: UseCase[]): number {
  return spendByBusinessUnit(useCases).length;
}

export interface CostMatrixRow {
  key: string;
  label: string;
  sublabel?: string;
  licences: number;
  tokens: number;
  cloud: number;
  integration: number;
  people: number;
  total: number;
}

/** Per-use-case cost matrix (the Cost Ledger "by use case" lens). */
export function costMatrixByUseCase(useCases: UseCase[]): CostMatrixRow[] {
  return useCases.map((uc) => ({
    key: uc.id,
    label: uc.name,
    sublabel: `${uc.id} · ${uc.businessUnit}`,
    licences: uc.cost.licences,
    tokens: uc.cost.tokens,
    cloud: uc.cost.cloud,
    integration: uc.cost.integration,
    people: uc.cost.people,
    total: uc.cost.totalAnnual,
  }));
}

/** Per-BU cost matrix (the Cost Ledger "by business unit" lens), 7 rows. */
export function costMatrixByBusinessUnit(useCases: UseCase[]): CostMatrixRow[] {
  const map = new Map<string, CostMatrixRow>();
  for (const uc of useCases) {
    const bu = businessUnitGroup(uc.businessUnit);
    const row =
      map.get(bu) ??
      { key: bu, label: bu, licences: 0, tokens: 0, cloud: 0, integration: 0, people: 0, total: 0 };
    row.licences += uc.cost.licences;
    row.tokens += uc.cost.tokens;
    row.cloud += uc.cost.cloud;
    row.integration += uc.cost.integration;
    row.people += uc.cost.people;
    row.total += uc.cost.totalAnnual;
    map.set(bu, row);
  }
  return [...map.values()].sort((a, b) => b.total - a.total);
}

// ── Vendor parsing ───────────────────────────────────────────────────────────
// The `vendor` field mixes external vendors and "in-house" with "+"/"/"
// separators. The headline "6 vendors in use" counts distinct EXTERNAL vendors
// (Microsoft, Anthropic, OpenAI, Google, GitHub, Adobe — "in-house" excluded).

/** Distinct external vendors across the portfolio, in first-seen order. */
export function externalVendors(useCases: UseCase[]): string[] {
  const seen: string[] = [];
  for (const uc of useCases) {
    for (const part of uc.vendor.split(/[+/]/)) {
      const name = part.trim();
      if (!name || /^in-house$/i.test(name)) continue;
      if (!seen.some((v) => v.toLowerCase() === name.toLowerCase())) {
        seen.push(name);
      }
    }
  }
  return seen;
}

export function vendorCount(useCases: UseCase[]): number {
  return externalVendors(useCases).length;
}

// ── Ranking & ordering helpers ───────────────────────────────────────────────

/** Top N use cases by annual spend (Control Room preview, default 5). */
export function topUseCasesBySpend(useCases: UseCase[], n = 5): UseCase[] {
  return [...useCases].sort((a, b) => b.cost.totalAnnual - a.cost.totalAnnual).slice(0, n);
}

/** Collapse the prose `aiRole` to a filterable category (BUILD_SPEC §5.2). */
export function aiRoleCategory(uc: UseCase): "Assistive" | "Agentic" {
  return /^agentic/i.test(uc.aiRole) ? "Agentic" : "Assistive";
}

/** Look up a use case by id (detail routes, cross-links). */
export function findUseCase(useCases: UseCase[], id: string): UseCase | undefined {
  return useCases.find((uc) => uc.id === id);
}

/** Confidence ranked low → high, for sorting the Outcome Ledger. */
export const CONFIDENCE_ORDER: Record<Confidence, number> = {
  low: 0,
  medium: 1,
  "medium-high": 2,
  high: 3,
};

/** Risk ranked by severity, red worst, for "show worst first" sorts. */
export const RAG_SEVERITY: Record<RAG, number> = { green: 0, amber: 1, red: 2 };

// ── Blind spots (BUILD_SPEC §5.3, deck slide 41) ─────────────────────────────
// Derived from the data, not hardcoded prose. Two kinds:
//   1. Token-heavy lines — where tokens are the single largest cost component
//      (the cost finance teams never see).
//   2. Reclaimable idle spend — "stop" use cases, annotated from their own
//      `evidence` / `nextAction` strings.

export interface BlindSpot {
  kind: "tokens" | "reclaimable";
  useCaseId: string;
  useCaseName: string;
  amount: number;
  detail: string;
}

export function blindSpots(useCases: UseCase[]): BlindSpot[] {
  const out: BlindSpot[] = [];
  for (const uc of useCases) {
    const largest = COST_COMPONENTS.reduce(
      (max, c) => (uc.cost[c] > uc.cost[max] ? c : max),
      COST_COMPONENTS[0],
    );
    if (largest === "tokens" && uc.cost.tokens > 0) {
      out.push({
        kind: "tokens",
        useCaseId: uc.id,
        useCaseName: uc.name,
        amount: uc.cost.tokens,
        detail: `Tokens are the single largest cost line — ${Math.round(
          (uc.cost.tokens / uc.cost.totalAnnual) * 100,
        )}% of this use case's spend, and rarely visible to finance.`,
      });
    }
    if (uc.decision === "stop") {
      out.push({
        kind: "reclaimable",
        useCaseId: uc.id,
        useCaseName: uc.name,
        amount: uc.cost.totalAnnual,
        detail: `${uc.outcome.evidence} ${uc.nextAction}.`,
      });
    }
  }
  return out;
}

// ── ROI / value (BUILD addendum — dollarised return, not operational metrics) ─

/** Net annual value = benefit − cost. */
export function netValue(uc: UseCase): number {
  return uc.value.annualBenefitAud - uc.cost.totalAnnual;
}

/** ROI as a whole percent: (benefit − cost) / cost × 100. */
export function roiPct(uc: UseCase): number {
  if (uc.cost.totalAnnual === 0) return 0;
  return Math.round((netValue(uc) / uc.cost.totalAnnual) * 100);
}

/** Payback in months (null when benefit ≤ 0 — never pays back). */
export function paybackMonths(uc: UseCase): number | null {
  if (uc.value.annualBenefitAud <= 0) return null;
  return Math.round((uc.cost.totalAnnual / uc.value.annualBenefitAud) * 12 * 10) / 10;
}

/** Banked (actual P&L) value for a use case. */
export function bankedValue(uc: UseCase): number {
  return uc.value.bankedValueAud;
}

/** Share of theoretical value actually banked, as a whole percent. */
export function bankedConversionPct(uc: UseCase): number {
  if (uc.value.annualBenefitAud <= 0) return 0;
  return Math.round((uc.value.bankedValueAud / uc.value.annualBenefitAud) * 100);
}

export interface DerivedValueRollup {
  totalAnnualBenefitAud: number;
  netValueAud: number;
  portfolioRoiPct: number;
  evidenceBackedBenefitAud: number;
  evidenceBackedCostAud: number;
  evidenceBackedNetValueAud: number;
  evidenceBackedRoiPct: number;
  unprovenBenefitAud: number;
  unprovenCostAud: number;
  unprovenNetValueAud: number;
  benefitByDecision: Record<Decision, number>;
  netValueByDecision: Record<Decision, number>;
  totalBankedValueAud: number;
  bankedConversionPct: number;
  bankedNetValueAud: number;
  evidenceBackedBankedAud: number;
  evidenceBackedBankedNetAud: number;
  evidenceBackedBankedConversionPct: number;
  bankedByDecision: Record<Decision, number>;
}

const isEvidenceBacked = (uc: UseCase) =>
  EVIDENCE_BACKED_CONFIDENCE.includes(uc.outcome.confidence);

export function computeValueRollup(useCases: UseCase[]): DerivedValueRollup {
  const totalBenefit = useCases.reduce((s, uc) => s + uc.value.annualBenefitAud, 0);
  const totalBanked = useCases.reduce((s, uc) => s + uc.value.bankedValueAud, 0);
  const totalCost = totalAnnualSpend(useCases);
  const eb = useCases.filter(isEvidenceBacked);
  const ebCost = eb.reduce((s, uc) => s + uc.cost.totalAnnual, 0);
  const ebBenefit = eb.reduce((s, uc) => s + uc.value.annualBenefitAud, 0);
  const ebBanked = eb.reduce((s, uc) => s + uc.value.bankedValueAud, 0);
  const benefitByDecision = zeroRecord(DECISIONS);
  const netByDecision = zeroRecord(DECISIONS);
  const bankedByDecision = zeroRecord(DECISIONS);
  for (const uc of useCases) {
    benefitByDecision[uc.decision] += uc.value.annualBenefitAud;
    netByDecision[uc.decision] += netValue(uc);
    bankedByDecision[uc.decision] += uc.value.bankedValueAud;
  }
  const pct = (net: number, base: number) => (base === 0 ? 0 : Math.round((net / base) * 100));
  return {
    totalAnnualBenefitAud: totalBenefit,
    netValueAud: totalBenefit - totalCost,
    portfolioRoiPct: pct(totalBenefit - totalCost, totalCost),
    evidenceBackedBenefitAud: ebBenefit,
    evidenceBackedCostAud: ebCost,
    evidenceBackedNetValueAud: ebBenefit - ebCost,
    evidenceBackedRoiPct: pct(ebBenefit - ebCost, ebCost),
    unprovenBenefitAud: totalBenefit - ebBenefit,
    unprovenCostAud: totalCost - ebCost,
    unprovenNetValueAud: totalBenefit - ebBenefit - (totalCost - ebCost),
    benefitByDecision,
    netValueByDecision: netByDecision,
    totalBankedValueAud: totalBanked,
    bankedConversionPct: pct(totalBanked, totalBenefit),
    bankedNetValueAud: totalBanked - totalCost,
    evidenceBackedBankedAud: ebBanked,
    evidenceBackedBankedNetAud: ebBanked - ebCost,
    evidenceBackedBankedConversionPct: pct(ebBanked, ebBenefit),
    bankedByDecision,
  };
}

// ── The AI Ledger benchmark layer (differentiation — uses real TAIL data) ────

/** Blended market token price in A$/million tokens (TAIL USD rate × FX). */
export function audPerMillionTokens(b: Benchmarks = seedBenchmarks): number {
  return (
    Math.round(
      b.tokenEconomics.blendedGatewayUsdPerMillionTokens * b.meta.fx.audPerUsd * 100,
    ) / 100
  );
}

/**
 * Vendor-priced AI cost — the portion exposed to vendor-price normalisation
 * (licences + tokens + cloud). People + integration are internal delivery costs,
 * not subsidised vendor pricing, so they are excluded.
 */
export function vendorPricedCost(useCases: UseCase[]): number {
  return useCases.reduce((s, uc) => s + uc.cost.licences + uc.cost.tokens + uc.cost.cloud, 0);
}

/**
 * Subsidy-normalisation stress test (BUILD addendum — the AI-Ledger-unique CFO
 * insight). Today's vendor prices are VC-subsidised; the AI Ledger quantifies
 * the gap. At `multiple` (1.0 = today … priceToCostRecoveryMultiple = full
 * cost-recovery), the same vendor-priced usage costs:
 */
export function subsidyAdjustedVendorCost(useCases: UseCase[], multiple: number): number {
  return Math.round(vendorPricedCost(useCases) * multiple);
}

// ── Convenience values bound to the seed data (for UI consumption) ───────────
export const portfolio: DerivedRollup = computePortfolioRollup(seedUseCases);
export const value: DerivedValueRollup = computeValueRollup(seedUseCases);
export const buSpend: BusinessUnitSpend[] = spendByBusinessUnit(seedUseCases);
export const top5: UseCase[] = topUseCasesBySpend(seedUseCases, 5);
/** Headline counts (verified == JSON in the test): 7 BUs, 6 external vendors. */
export const businessUnitsCount: number = businessUnitCount(seedUseCases);
export const vendorsCount: number = vendorCount(seedUseCases);
