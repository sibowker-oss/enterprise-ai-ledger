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

echo "▶ Building static export (basePath='${BASEPATH}')…"
NEXT_PUBLIC_BASE_PATH="${BASEPATH}" npm run build

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
git -c user.email="deploy@hepburnadvisory.com.au" -c user.name="EAL Deploy" commit -q -m "Deploy static export"
git push -q -f "https://github.com/${REPO}.git" gh-pages
rm -rf .git
popd >/dev/null

echo "✓ Pushed. GitHub Pages will rebuild in ~1–2 min."
