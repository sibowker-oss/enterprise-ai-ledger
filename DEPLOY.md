# Deployment & custom subdomain

The prototype is a **static site** published to **GitHub Pages** from the
`gh-pages` branch of `sibowker-oss/enterprise-ai-ledger`. It is a fully separate
deployment from the TAIL site (`ai-index.hepburnadvisory.com.au`) and shares no
infrastructure with it.

## Reproducible deploys (the only supported path)

Deploys ship **committed source only** — `./deploy.sh` refuses to run on a
dirty working tree, stamps the short commit hash into the bundle
(`NEXT_PUBLIC_GIT_SHA`, shown in the simulator footer as `app <hash>`), and
runs two release gates before building:

1. `npm run validate:library` — the token-estimate-library guard;
2. `npm run validate:assumptions` — the assumptions-registry gate: fails if
   any archetype-default or floor-eligible model price is unverified or past
   its `review_by` date, if any editorial band is undated, or if the band
   files' use-case keys drift apart.

Both gates also run automatically before every `next build` (npm `prebuild`).
**Never hand-edit the `gh-pages` branch** — the acceptance rule is that a
clean checkout of the commit named in the live footer rebuilds the deployed
output exactly (`git checkout <hash> && ./deploy.sh`).

## Current live URL (no DNS required)

```
https://sibowker-oss.github.io/enterprise-ai-ledger/
```

This works immediately. The build uses `basePath=/enterprise-ai-ledger` so all
assets resolve under that project path.

## Branded subdomain — enterprise.hepburnadvisory.com.au

The domain `hepburnadvisory.com.au` is on **Cloudflare** (proxied). Pointing a
branded subdomain at this Pages site needs **one additive DNS record** plus a
root rebuild. None of it touches `ai-index` or any existing record.

### Step 1 — add the Cloudflare DNS record (needs Cloudflare access)

In the Cloudflare dashboard for `hepburnadvisory.com.au` → **DNS** → **Add record**:

| Field   | Value                     |
|---------|---------------------------|
| Type    | `CNAME`                   |
| Name    | `enterprise`              |
| Target  | `sibowker-oss.github.io`  |
| Proxy   | Proxied (orange cloud) — matches how `ai-index` is set up |
| TTL     | Auto                      |

### Step 2 — rebuild at root + write the CNAME, then redeploy

Because the subdomain serves at the **root** (not a project path), rebuild with
an empty `basePath` and stamp the Pages `CNAME`:

```bash
./deploy.sh "" enterprise.hepburnadvisory.com.au
```

### Step 3 — set the Pages custom domain

```bash
gh api -X PUT repos/sibowker-oss/enterprise-ai-ledger/pages \
  -f 'cname=enterprise.hepburnadvisory.com.au' -F 'https_enforced=true'
```

GitHub then provisions the TLS cert (a few minutes). The site is live at
`https://enterprise.hepburnadvisory.com.au/`.

> Do **not** do Step 2/3 before Step 1's DNS record exists — setting the custom
> domain first makes the working `github.io` URL 301-redirect to a domain that
> doesn't resolve yet, which breaks the demo link.
