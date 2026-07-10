/**
 * Static buyer-facing copy for the simulator, in one place. Centralised so
 * __tests__/simulator/voice.test.ts can scan every sentence for the banned
 * jargon (concept.md §4). Plain language only — the machinery stays under the
 * hood. Dynamic sentences live in lib/simulator/copy.ts.
 */

export const BRAND = {
  company: "Hepburn Advisory",
  eyebrow: "Investment-Case Simulator",
  title: "AI Use-Case Cost Calculator",
  subtitle:
    "A quick way to check whether an AI use case is worth doing — not just what it costs today, but whether it still adds up once prices rise and usage grows. Pick a use case on the left, change the numbers to match your business, and read down the five steps to a verdict.",
  ribbon:
    "Demo — the figures here are realistic examples, not a quote. The full version runs on your own numbers.",
  illustrativeTag: "illustrative — replace with your usage",
} as const;

export const CONFIG = {
  heading: "Configure",
  useCase: "Use case",
  volume: "Business volume",
  leanness: "How well-organised is the setup?",
  leannessHint:
    "This one slider is your context, prompts and output length rolled together — how much the AI has to read and write on every request. It's the biggest thing driving the bill, and the one no price list shows: careless setup can cost many times more than a lean one.",
  leannessCovers: "Covers: organising context · prompt design · trimming retrieved documents · keeping answers concise",
  leanLeft: "Loose",
  leanRight: "Lean",
  model: "Model",
  modelHint: "Which model you pick is usually the biggest thing you can change.",
} as const;

export const Q1 = {
  title: "How many tokens will you use?",
  /** The usage band IS the tool's answer — label it as our estimate, not a placeholder. */
  bandHeading: "Estimated monthly usage",
  estimateTag: "our estimate",
} as const;

export const Q2 = {
  title: "Price inflation risk",
  intro:
    "A price list can't answer this. To know whether today's price will last, you have to look at what these AI companies actually earn and spend — which is what The AI Ledger tracks.",
  tileRecovery: "You pay about",
  tileRecoverySub: "of what it really costs them",
  tileUnderwater: "Below break-even",
  tileUnderwaterSub: "of their own sales",
  tileRevPerEmp: "Sales per employee",
  tileRevPerEmpSub: "how fast they can grow",
  tileHeadroom: "Room to rise",
  tileHeadroomSub: "before they cover costs",
  lowRisk: "Low risk of a price jump",
  neutralChip: "Not tracked — no forecast available",
  figuresAsOfPrefix: "Figures as of",
  footnote:
    "In the full version we keep this up to date for each provider. Here it's the latest published figures.",
  footnoteUntracked:
    "We only forecast prices for the providers we track. For everything else the cost figures still work — there's just no read on where the price goes, in either direction.",
} as const;

export const COST = {
  title: "What it really costs to run",
  intro:
    "What that usage actually costs each month, shown three ways. Each bar is the AI itself, plus the cost of running it — a fixed monthly floor (the platform, the monitoring, the people checking its work) and a small per-use part. Only the AI part moves — with the model you pick, and with where prices go.",
  segFloor: "Cheapest you'd consider",
  segToday: "Your model, today",
  segRepriced: "Your model, if prices rise",
  aiUsage: "AI usage",
  buildRun: "running it",
  bucketFixed: "monthly fixed",
  bucketPerUse: "per use",
  legendAi: "AI usage — moves with the model you pick and where prices go",
  legendBuild: "Running it — a fixed monthly floor (platform, monitoring, checking) plus a per-use part",
  floorHint: "Untick providers below the model picker and this column recalculates.",
} as const;

export const Q3 = {
  title: "What can you control?",
  intro: "A few changes cut the bill without changing what people get. Drag them — the cost above updates.",
  familiesNote:
    "These three make each token cheaper. The other big lever — using fewer tokens in the first place, through tighter context, sharper prompts and shorter answers — is the setup slider on the left. Not every lever fits every job: batching, for one, only suits work that can wait.",
  // Proper name + a plain one-liner + a fuller "what's involved" detail (in the ⓘ).
  cacheName: "Caching",
  cacheShort: "Reuse the same background — up to ~90% off the repeated part",
  cacheDetail:
    "The AI re-reads the same instructions and documents on every request. Caching stores that shared part so you're not charged full price for it each time — typically up to 90% off the repeated portion, with no change to the answer.",
  batchName: "Batching",
  batchShort: "Run non-urgent work in a batch — about 50% cheaper",
  batchDetail:
    "Work that doesn't need an instant answer can be sent in bulk and run when there's spare capacity, for about half the price. Not available for live, interactive work.",
  routeName: "Model routing",
  routeShort: "Send easy jobs to a cheaper model",
  routeDetail:
    "A quick check sends easy requests to a cheaper, smaller model and keeps the top model only for the hard ones — cutting cost while holding quality where it matters.",
  infoOpen: "What's involved",
  nowLabel: "Doing now",
  plannedLabel: "Planning to",
  nowHint:
    "Set each to what you already do today — the cost above runs on that, starting from nothing. What you're planning shows as a separate saving, never quietly baked in.",
  /** Shown on a lever that doesn't apply to the selected use case (kept visible, greyed). */
  unavailableHere: "Not available for this use case",
  batchUnavailable: "Not available for live, interactive work — answers here can't wait for a batch.",
  clampNote:
    "That's about as far as these go together for this kind of work. Push further and the savings start to overlap each other — the full version measures the real overlap on your own traffic instead of stacking them up.",
  footer:
    "These stack on top of the setup slider on the left — that one changes how much the AI reads and writes; these make each part cheaper. Together they usually take a good chunk off, enough to cover a lot of the price rises above.",
} as const;

export const Q4 = {
  title: "Notional value",
  intro:
    "This figure is yours to set — we don't estimate it for you. Treat the values below as a starting point, enter your own, and the result is shown as a range rather than a single number.",
  inputGuide: "Your numbers — edit these to match your business",
  low: "Low",
  likely: "Likely",
  high: "High",
  rangeGuide:
    "All three points are yours. Low and high start at a sensible spread around likely — set them to your own view.",
  haircutLabel: "How much of that value should count?",
  haircutHint:
    "Not everyone uses it, and not all saved time turns into output. The verdict below only counts this share of the value you entered — a discount we apply against ourselves.",
  countedLabel: "Counted for the verdict",
} as const;

export const Q5 = {
  title: "The bottom line",
  marginLabel: "Margin of safety",
  marginSub: "counted value ÷ cost, if prices rise",
  breakEvenLabel: "Break-even value",
  breakEvenSub: "needed to cover the price-rise case",
  paybackLabel: "Pays back",
  paybackSub: "first year, on the rollout plan",
  paybackNone: "not in year 1",
  paybackMonthPrefix: "month",
} as const;

export const BUDGET = {
  title: "The first-year budget line",
  intro:
    "What a budget paper needs: the one-off cost to build it, the monthly bill to run it, and when the value delivered catches up with the money out the door.",
  buildLabel: "One-off build",
  buildSub: "before the monthly bill starts",
  runLabel: "Monthly run",
  runSub: "at today's prices, everyone on board",
  paybackLabel: "Pays back",
  paybackSub: "value catches the money out",
  rampHeading: "How fast people come on board",
  rampEditable: "A planning assumption — change it to match your rollout.",
  rampStart: "Month 1 share (%)",
  rampFull: "Everyone on by month",
  chartHeading: "First 12 months, running totals",
  chartCost: "Money out — build, then the monthly bills",
  chartValue: "Value in — counted value as people come on board",
} as const;

export const RAILS = {
  checkTag: "Worth a check",
} as const;

export const CONSIDER = {
  heading: "Which providers would you consider?",
  hint:
    "Untick any you wouldn't use and the 'cheapest you'd consider' column recalculates. Facts only — where each is based, and whether the model's weights are open (can be run in-house).",
  openTag: "open weights",
  hostedTag: "hosted only",
  unverifiedTag: "price unverified",
  emptyNote: "None left to consider — the cheapest column falls back to your chosen model.",
} as const;

export const DRAWER = {
  title: "Assumptions and sources",
  intro:
    "Every figure that drives a result here: what it is, where it comes from, when it was checked, and how sure we are. Anything unknown says unknown.",
  colFigure: "Figure",
  colValue: "Value",
  colSource: "Source",
  colDate: "As of",
  colStatus: "Status",
  close: "Close",
} as const;

export const CURRENCY = {
  usd: "US$",
  aud: "A$",
  label: "Show figures in",
  note: "A$ figures use the RBA rate — model and vendor seat prices stay quoted in US$.",
} as const;

export const A11Y = {
  skipToVerdict: "Skip to the bottom line",
} as const;

export const SEAT = {
  title: "Or just buy seats?",
  asOfPrefix: "Public seat prices as of",
  segLabel: "Vendor seats",
  segSub: "public per-seat prices × your seat count",
} as const;

export const TOOLBAR = {
  copyLink: "Copy link to this case",
  copied: "Link copied ✓",
  linkNote: "This link contains the numbers you typed.",
  print: "Print board summary",
  printHint: "One page — the case, the costs, the value and the verdict, ready for a board pack.",
  save: "Save this case",
  saveHint: "Downloads a small file with everything you set and everything it worked out — the record to bring to us.",
  importLabel: "Open a saved case",
} as const;

export const PRINT = {
  docTitle: "AI use-case investment view — one-page summary",
  preparedBy: "Prepared with the Hepburn Advisory AI Use-Case Cost Calculator",
  demoNote:
    "Illustrative demonstration — realistic example figures, not a quote. The full version runs on your own numbers.",
  inputsHeading: "The case as configured",
  costHeading: "What it costs",
  valueHeading: "What it's worth",
  verdictHeading: "The bottom line",
  pinsHeading: "Cases compared",
  asOfHeading: "Where the figures come from",
} as const;

export const CTA = {
  body:
    "This demo uses realistic examples for one use case. The full version uses your actual usage, keeps the price forecast current for each provider, and compares your costs with similar Australian companies.",
  gated:
    "The full version adds: your real numbers · an up-to-date price forecast · the cost of meeting your industry's rules · a one-page summary for your board.",
  button: "See it on your business →",
} as const;

export const FOOTER = {
  independence:
    "What's independent, and what's an example: the price-hold figures — what you pay vs the true cost, their losses, sales per employee, and room to rise — come from The AI Ledger's own research. From audited accounts means built from published, audited figures (OpenAI); our estimate means worked out from revenue and losses (Anthropic, Google). Everything else — model prices, usage estimates, and the running-cost and value figures — is a realistic example you'd replace with your own. Models we don't track, like open-source ones, are shown as examples only.",
  note:
    "A demonstration using a made-up company. No provider is accused of overcharging — today's prices are simply held down by investor funding, which is why GPT-5 prices doubled in April 2026 when some of that support pulled back.",
  attribution: "The AI Ledger supplies the numbers; Hepburn Advisory supplies the advice.",
} as const;

/** Where the single CTA points (brief decision 6 default: Hepburn contact). */
export const SIM_CTA_HREF = "https://hepburnadvisory.com.au/contact";

/**
 * Where "The AI Ledger" references click through to. Defaults to the sibling
 * Enterprise AI Ledger home in this deploy ("/"); swap for the public The AI
 * Ledger URL once it is live.
 */
export const AI_LEDGER_HREF = "/";
