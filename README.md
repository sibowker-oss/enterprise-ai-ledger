# Enterprise AI Ledger — interactive prototype

A publishable, interactive prototype of the **Enterprise AI Ledger** — a Hepburn
Advisory product concept that makes AI cost-to-outcome control tangible for a
CFO/CIO. Populated with a **fictional** financial-services company, **Meridian
Financial Group**.

> **Illustrative demo.** Meridian Financial Group is fictional. All names,
> figures, vendors and outcomes are illustrative and do not represent any real
> organisation.

## What it shows

Four modules tell the complete cost-to-outcome story:

| Module | Job |
|--------|-----|
| **Executive Control Room** | Portfolio economics, scale/fix/stop, risk, board pack |
| **AI Use Case Register** | The system of record — 10 use cases, filterable |
| **Cost Ledger** | What AI actually costs — licences, tokens, cloud, integration, people |
| **Outcome Ledger** | Whether AI earns back — evidence + confidence, with a what-if toggle |

Two further modules (Token Optimisation, Governance Evidence) appear in the nav
as disabled "Coming in platform" items.

## Data

`data/seed-data.json` is the single source of truth. Every figure on the site is
derived from it by the selectors in `lib/portfolio.ts` — no numbers are invented
in component code. The selectors are unit-tested against the JSON's pre-computed
`portfolioRollup` (`npm test`) so charts and data can never drift.

## Stack

Next.js (App Router) + TypeScript + Tailwind, Recharts, static export. No
backend, no auth, no persistence. Design tokens are centralised in
`styles/tokens.ts` for a one-file reskin.

```bash
npm install
npm run dev          # local dev at http://localhost:3000
npm test             # selector ↔ rollup reconciliation
npm run build        # static export to ./out
```

## Deploy

`./deploy.sh` builds a static export and publishes it to the `gh-pages` branch
(GitHub Pages). See `DEPLOY.md` for the GitHub Pages + custom-subdomain setup.
