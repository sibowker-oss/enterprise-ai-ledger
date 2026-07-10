#!/usr/bin/env bash
# Build the static export and publish it to the gh-pages branch (GitHub Pages).
#
# Usage:
#   ./deploy.sh                      # project-path deploy (github.io/enterprise-ai-ledger)
#   ./deploy.sh ""                   # root deploy (custom subdomain at root)
#   ./deploy.sh "" enterprise.hepburnadvisory.com.au   # root deploy + set CNAME (subdomain cutover)
#
# Requires: gh auth (credential helper) configured for the target repo.
set -euo pipefail

REPO="sibowker-oss/enterprise-ai-ledger"
BASEPATH="${1-/enterprise-ai-ledger}"   # default project path; pass "" for root
CNAME="${2-}"                            # optional custom domain for the gh-pages CNAME file

# Reproducible deploy (update v2, 0.4): only a CLEAN COMMIT ships. If the tree
# is dirty, the published site could not be rebuilt from committed source —
# exactly the state this guard exists to prevent. Never hand-edit gh-pages.
if [ -n "$(git status --porcelain)" ]; then
  echo "✗ Working tree is not clean. Commit (or stash) first — deploys ship committed source only." >&2
  git status --short >&2
  exit 1
fi
GIT_SHA="$(git rev-parse --short HEAD)"
echo "▶ Deploying commit ${GIT_SHA} (clean tree)."

echo "▶ Release check: validating the token estimate library (wq-120a guard)…"
npm run validate:library        # set -e aborts the deploy if the demand-side data has drifted

echo "▶ Release check: assumptions registry gate (prices verified + in date)…"
npm run validate:assumptions

echo "▶ Building static export (basePath='${BASEPATH}')…"
NEXT_PUBLIC_BASE_PATH="${BASEPATH}" NEXT_PUBLIC_GIT_SHA="${GIT_SHA}" npm run build

echo "▶ Preparing gh-pages payload…"
touch out/.nojekyll                      # _next/ has leading underscore — Jekyll would drop it
if [ -n "${CNAME}" ]; then
  echo "${CNAME}" > out/CNAME
  echo "  wrote CNAME → ${CNAME}"
fi

echo "▶ Publishing to gh-pages…"
pushd out >/dev/null
rm -rf .git
git init -q -b gh-pages
git add -A
git -c user.email="deploy@hepburnadvisory.com.au" -c user.name="EAL Deploy" commit -q -m "Deploy static export (source: ${GIT_SHA})"
git push -q -f "https://github.com/${REPO}.git" gh-pages
rm -rf .git
popd >/dev/null

echo "✓ Pushed. GitHub Pages will rebuild in ~1–2 min."
