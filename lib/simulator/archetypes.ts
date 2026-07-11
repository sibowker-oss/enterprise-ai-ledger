/**
 * Use-case scenarios — the editorial "illustrative, replace with your usage"
 * scaffolding (spec §6 / D4). These are DEMO INPUTS a buyer overrides, not moat
 * data: illustrative business volumes, which token-prior + integration/risk
 * BANDS apply, and a starting value driver. Every credibility-bearing number
 * (model prices, token amounts, repricing multiples, integration $) is resolved
 * from the four JSON files via the keys referenced here — nothing priced here.
 *
 * Faithful to the Investment-Case Simulator prototype (the numbers + voice
 * reference). The code-assistant scenario reproduces the validated worked
 * example exactly (see __tests__/simulator/engine.test.ts).
 */
import type { BandTier } from "./data";

export type ValueConfig =
  | {
      kind: "hours";
      driverLabel: string;
      driver: number;
      driverStep: number;
      rateLabel: string;
      rate: number;
      rateStep: number;
    }
  | { kind: "perTx"; driverLabel: string; driver: number; driverStep: number }
  | { kind: "perUnitMonth"; driverLabel: string; driver: number; driverStep: number };

/**
 * How the running cost beyond AI usage is shaped (CTO update v2, 0.3). Every
 * archetype carries a MONTHLY FIXED floor (platform, monitoring, the people
 * checking its work — from monthly_fixed_floor in the reference data, carried
 * whether one person uses it or a thousand) plus optional PER-USE marginals
 * (Layer-4 complexity / Layer-5 governance bands × units). The old pure
 * per-unit shape inverted scale economics ($13/mo at 1 agent); the old pure
 * fixed shape is the floor with the marginal off.
 */
export interface CostModel {
  /** Which end of the archetype's monthly_fixed_floor band the demo uses. */
  floorTier: BandTier;
  /** Per-unit marginal run cost (Layer-4 complexity band), if any. */
  l4Marginal?: { complexity: string; tier: BandTier };
  /** Per-unit governance carry (Layer-5 band) — only where checking genuinely scales per unit. */
  l5Marginal?: { governance: string; tier: BandTier };
}

export interface Archetype {
  /** Stable UI key. */
  key: string;
  label: string;
  /** Key into the Token Estimate Library use_cases (token_estimate_library_v1.json). */
  priorKey: string;
  /** Default model key into the price sheet. */
  defaultModelKey: string;
  /** Illustrative default business volume (units the buyer replaces). */
  units: number;
  /** Noun for a unit, e.g. "Developers", "Claims / month". */
  unitLabel: string;
  /** Plain hint under the volume input. */
  volHint: string;
  /** Illustrative business transactions per unit per month (fan-out is sourced
   *  separately from the library — model calls per transaction). For archetypes
   *  with a library volume hint this is the TYPICAL (mid) rate; the usage-
   *  intensity slider moves it across the library's low–high band. */
  txPerUnitMonth: number;
  /** Period of the library volume hint, where one exists — how a per-day or
   *  per-week rate becomes a monthly figure (day × 21 working days, week × 4).
   *  Absent for per-transaction archetypes whose volume IS the units input. */
  intensityPeriod?: "day" | "week";
  /**
   * Library stacking-envelope class (stacking_rules.combined_envelopes): caps
   * the billing-lever saving to what the evidence supports for this workload.
   * One of "chat_support" | "rag_interactive" | "rag_offline_batch".
   */
  workloadClass: string;
  costModel: CostModel;
  value: ValueConfig;
  /** Optional "you may mean the other one" note — points between near-neighbour
   *  use cases whose token scale differs by orders of magnitude (IDE chat vs
   *  agentic coding), so a buyer doesn't cost the wrong product. */
  pairNote?: string;
}

/** Working days per month baked into the illustrative volumes (21). */
export const WORKING_DAYS = 21;

/** Weeks per month baked into the illustrative weekly volumes (4). */
export const WEEKS_PER_MONTH = 4;

export const ARCHETYPES: Archetype[] = [
  {
    key: "code_assistant",
    label: "Code assistant (IDE chat & autocomplete)",
    priorKey: "code_assistant",
    defaultModelKey: "claude_sonnet_4_6",
    units: 200,
    unitLabel: "Developers",
    volHint: "About 30 uses per developer a day.",
    txPerUnitMonth: 30 * WORKING_DAYS, // library volume: ~30 uses/dev/day (mid — the typical rate, not the heavy end)
    intensityPeriod: "day",
    workloadClass: "chat_support",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "mid" } },
    pairNote:
      "This is in-editor chat & autocomplete — short prompts, Copilot-style, priced per interaction. If you mean Claude Code, Cursor's agent or Devin — where you hand over a whole task and it runs many steps on its own — switch to “Agentic coding”, which uses far more per task (and costs multiples more per developer).",
    value: {
      kind: "hours",
      driverLabel: "Hours saved per developer each week",
      driver: 3,
      driverStep: 0.5,
      rateLabel: "Cost per hour (incl. on-costs)",
      rate: 90,
      rateStep: 5,
    },
  },
  {
    key: "summarisation",
    label: "Contact-centre summaries",
    priorKey: "contact_centre_summarisation",
    defaultModelKey: "claude_haiku_4_5",
    units: 800,
    unitLabel: "Agents",
    volHint: "About 40 calls per agent a day.",
    txPerUnitMonth: 40 * WORKING_DAYS,
    intensityPeriod: "day",
    workloadClass: "chat_support",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "mid" } },
    value: { kind: "perTx", driverLabel: "$ saved per call", driver: 0.25, driverStep: 0.05 },
  },
  {
    key: "rag_search",
    label: "Company knowledge search",
    priorKey: "enterprise_rag_search",
    defaultModelKey: "gemini_2_5_pro",
    units: 500,
    unitLabel: "Staff using it",
    volHint: "About 8 questions per person a day.",
    txPerUnitMonth: 8 * WORKING_DAYS,
    intensityPeriod: "day",
    workloadClass: "rag_interactive",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "low" } },
    value: { kind: "perUnitMonth", driverLabel: "$ value per person each month", driver: 22, driverStep: 1 },
  },
  {
    key: "claims",
    label: "Claims / document processing",
    priorKey: "document_claims_processing",
    defaultModelKey: "claude_sonnet_4_6",
    units: 40000,
    unitLabel: "Claims / month",
    volHint: "Each claim can take several AI steps to process.",
    txPerUnitMonth: 1,
    workloadClass: "rag_offline_batch",
    costModel: { floorTier: "mid" },
    value: { kind: "perTx", driverLabel: "$ saved per claim", driver: 4, driverStep: 1 },
  },
  {
    key: "reconciliation",
    label: "Back-office reconciliation",
    priorKey: "back_office_reconciliation",
    defaultModelKey: "claude_sonnet_4_6",
    units: 30000,
    unitLabel: "Reconciliations / month",
    volHint: "Each run takes a few AI steps.",
    txPerUnitMonth: 1,
    workloadClass: "rag_offline_batch",
    costModel: { floorTier: "mid" },
    value: { kind: "perTx", driverLabel: "$ saved per reconciliation", driver: 3, driverStep: 1 },
  },
  {
    key: "agentic_coding",
    label: "Agentic coding (Claude Code / Cursor)",
    priorKey: "agentic_coding",
    defaultModelKey: "claude_sonnet_4_6",
    units: 200,
    unitLabel: "Developers",
    volHint: "Each delegated task is a whole multi-step job the AI runs on its own.",
    txPerUnitMonth: 8 * WORKING_DAYS, // library volume: ~8 tasks/dev/active-day (mid)
    intensityPeriod: "day",
    workloadClass: "agentic",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "low" } },
    pairNote:
      "This is delegated agentic work — Claude Code, Cursor's agent or Devin: many steps, the whole context replayed on every call, so it burns roughly 50–100× the tokens of in-editor chat. Anthropic's own figure for this is about US$150–250 per developer a month. For lighter autocomplete & chat, see “Code assistant”.",
    value: {
      kind: "hours",
      driverLabel: "Hours saved per developer each week",
      driver: 4,
      driverStep: 0.5,
      rateLabel: "Cost per hour (incl. on-costs)",
      rate: 90,
      rateStep: 5,
    },
  },
  {
    key: "deep_research",
    label: "Deep research reports",
    priorKey: "deep_research",
    defaultModelKey: "gemini_2_5_pro",
    units: 40,
    unitLabel: "Analysts",
    volHint: "Each report is a long, multi-step research job — search, read, synthesise.",
    txPerUnitMonth: 8 * 4, // library volume: ~8 reports/analyst/week (mid)
    intensityPeriod: "week",
    workloadClass: "agentic",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "low" } },
    value: { kind: "perTx", driverLabel: "$ saved per report (analyst time)", driver: 70, driverStep: 10 },
  },
  {
    key: "support_chatbot",
    label: "Customer support chatbot",
    priorKey: "customer_support_chatbot",
    defaultModelKey: "claude_sonnet_4_6",
    units: 50000,
    unitLabel: "Conversations / month",
    volHint: "Count only the conversations the bot handles end-to-end (deflected).",
    txPerUnitMonth: 1,
    workloadClass: "chat_support",
    costModel: { floorTier: "mid" },
    value: { kind: "perTx", driverLabel: "$ saved per contained conversation", driver: 2.5, driverStep: 0.5 },
  },
  {
    key: "legal_review",
    label: "Contract / policy review",
    priorKey: "hr_legal_document_review",
    defaultModelKey: "claude_sonnet_4_6",
    units: 40,
    unitLabel: "Reviewers",
    volHint: "About 15 documents per reviewer a day.",
    txPerUnitMonth: 15 * WORKING_DAYS, // library volume: ~15 docs/reviewer/day (mid)
    intensityPeriod: "day",
    workloadClass: "rag_offline_batch",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "heavy", tier: "mid" } },
    value: {
      kind: "hours",
      driverLabel: "Hours saved per reviewer each week",
      driver: 3,
      driverStep: 0.5,
      rateLabel: "Cost per hour (incl. on-costs)",
      rate: 120,
      rateStep: 5,
    },
  },
  {
    key: "text_to_sql",
    label: "Ask-your-data analytics",
    priorKey: "text_to_sql_analytics",
    defaultModelKey: "claude_sonnet_4_6",
    units: 50,
    unitLabel: "Analysts",
    volHint: "About 15 questions per analyst a day.",
    txPerUnitMonth: 15 * WORKING_DAYS, // library volume: ~15 questions/analyst/day (mid)
    intensityPeriod: "day",
    workloadClass: "chat_support",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "medium", tier: "mid" } },
    value: {
      kind: "hours",
      driverLabel: "Hours saved per analyst each week",
      driver: 2,
      driverStep: 0.5,
      rateLabel: "Cost per hour (incl. on-costs)",
      rate: 100,
      rateStep: 5,
    },
  },
  {
    key: "marketing_content",
    label: "Marketing content",
    priorKey: "marketing_content",
    defaultModelKey: "gemini_2_5_flash",
    units: 20,
    unitLabel: "Marketers",
    volHint: "Each finished asset is drafted and refined over many rounds, not one shot.",
    txPerUnitMonth: 10 * 4, // library volume: ~10 assets/marketer/week (mid)
    intensityPeriod: "week",
    workloadClass: "chat_support",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "mid" } },
    value: {
      kind: "hours",
      driverLabel: "Hours saved per marketer each week",
      driver: 3,
      driverStep: 0.5,
      rateLabel: "Cost per hour (incl. on-costs)",
      rate: 75,
      rateStep: 5,
    },
  },
  {
    key: "meeting_intelligence",
    label: "Meeting notes & actions",
    priorKey: "meeting_intelligence",
    defaultModelKey: "claude_haiku_4_5",
    units: 500,
    unitLabel: "Employees",
    volHint: "One meeting-hour written up — the summary only (recording/transcription is a separate cost).",
    txPerUnitMonth: 5 * 4, // library volume: ~5 meeting-hours/employee/week (mid)
    intensityPeriod: "week",
    workloadClass: "rag_offline_batch",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "mid" } },
    value: { kind: "perTx", driverLabel: "$ saved per meeting-hour", driver: 3, driverStep: 0.5 },
  },
  {
    key: "email_drafting",
    label: "Sales email drafting",
    priorKey: "email_crm_drafting",
    defaultModelKey: "claude_haiku_4_5",
    units: 30,
    unitLabel: "Sales reps",
    volHint: "About 50 personalised emails per rep a day.",
    txPerUnitMonth: 50 * WORKING_DAYS, // library volume: ~50 emails/rep/day (mid)
    intensityPeriod: "day",
    workloadClass: "rag_offline_batch",
    costModel: { floorTier: "mid", l4Marginal: { complexity: "light", tier: "low" } },
    value: {
      kind: "hours",
      driverLabel: "Hours saved per rep each week",
      driver: 1.5,
      driverStep: 0.5,
      rateLabel: "Cost per hour (incl. on-costs)",
      rate: 70,
      rateStep: 5,
    },
  },
  {
    key: "translation",
    label: "Translation / localisation",
    priorKey: "translation_localisation",
    defaultModelKey: "mistral_small_3_2",
    units: 5000,
    unitLabel: "Thousand-word units / month",
    volHint: "Count your source text in thousands of words per month.",
    txPerUnitMonth: 1,
    workloadClass: "rag_offline_batch",
    costModel: { floorTier: "mid" },
    value: { kind: "perTx", driverLabel: "$ saved per 1,000 words", driver: 12, driverStep: 2 },
  },
  {
    key: "voice_agents",
    label: "Voice agents",
    priorKey: "voice_agents",
    defaultModelKey: "claude_sonnet_4_6",
    units: 200000,
    unitLabel: "Call minutes / month",
    volHint: "One minute of live conversation — the AI's thinking only (voice-to-text and the spoken reply are separate costs).",
    txPerUnitMonth: 1,
    workloadClass: "chat_support",
    costModel: { floorTier: "mid" },
    value: { kind: "perTx", driverLabel: "$ saved per call-minute", driver: 0.08, driverStep: 0.02 },
  },
];

export const ARCHETYPE_BY_KEY: Record<string, Archetype> = Object.fromEntries(
  ARCHETYPES.map((a) => [a.key, a]),
);

/** Per-seat archetypes have no "/" in the unit label (Developers vs Claims / month). */
export function isPerSeat(a: Archetype): boolean {
  return !a.unitLabel.includes("/");
}

/** Singular, lower-case unit word for copy ("developer", "claim", "call minute"). */
export function unitWord(a: Archetype): string {
  const label = a.unitLabel.replace(" / month", "").toLowerCase();
  if (label === "staff using it") return "person"; // "each staff using it" doesn't read
  return label.replace(/s$/, "");
}

/** The business-transaction noun for perTx value drivers ("call", "claim",
 *  "report") — pulled from the driver label, since the units can be SEATS
 *  (agents) while the value is priced per EVENT (calls). */
export function txWord(a: Archetype): string {
  if (a.value.kind !== "perTx") return unitWord(a);
  const m = a.value.driverLabel.match(/per ([^(]+)/i);
  return m ? m[1].trim() : unitWord(a);
}
