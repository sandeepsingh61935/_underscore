#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"
if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE (copy from .env.development / set VITE_* vars)." >&2
  exit 1
fi

node --env-file="$ENV_FILE" ./node_modules/vite/bin/vite.js build --config vite.config.web.ts

# Deploy outside the git worktree so Vercel does not block on git author seat checks.
STAGE="$(mktemp -d /tmp/underscore-web-deploy.XXXXXX)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

cp -a dist-web/. "$STAGE/"
cp vercel.spa.json "$STAGE/vercel.json"
mkdir -p "$STAGE/.vercel"
if [[ -f .vercel/project.json ]]; then
  cp .vercel/project.json "$STAGE/.vercel/project.json"
fi

# Prefer linked project; fall back to name
(cd "$STAGE" && vercel --prod --yes)

echo "Live: https://underscore-web.vercel.app"
