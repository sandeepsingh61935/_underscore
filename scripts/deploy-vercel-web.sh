#!/usr/bin/env bash
# Deploy dist-web to Vercel production (SPA rewrites via vercel.spa.json).
# Local: needs .env.production and `vercel` CLI logged in (or VERCEL_TOKEN).
# CI: set VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID; optional SKIP_BUILD=1.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

ENV_FILE="${ENV_FILE:-.env.production}"

if [[ "${SKIP_BUILD:-}" != "1" ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Missing $ENV_FILE (copy from .env.development / set VITE_* vars)." >&2
    exit 1
  fi
  if command -v bun &>/dev/null; then
    bun run vite build --config vite.config.web.ts --mode production
  else
    node --env-file="$ENV_FILE" ./node_modules/vite/bin/vite.js build --config vite.config.web.ts --mode production
  fi
fi

if [[ ! -d dist-web ]] || [[ ! -f dist-web/index.html ]]; then
  echo "dist-web/ missing — run a production web build first (or unset SKIP_BUILD)." >&2
  exit 1
fi

# Deploy outside the git worktree so Vercel does not block on git author seat checks.
STAGE="$(mktemp -d /tmp/underscore-web-deploy.XXXXXX)"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

cp -a dist-web/. "$STAGE/"
cp vercel.spa.json "$STAGE/vercel.json"
mkdir -p "$STAGE/.vercel"

if [[ -f .vercel/project.json ]]; then
  cp .vercel/project.json "$STAGE/.vercel/project.json"
elif [[ -n "${VERCEL_ORG_ID:-}" && -n "${VERCEL_PROJECT_ID:-}" ]]; then
  # CI / headless: synthesize link file from secrets (project.json is gitignored).
  cat > "$STAGE/.vercel/project.json" <<EOF
{
  "projectId": "${VERCEL_PROJECT_ID}",
  "orgId": "${VERCEL_ORG_ID}",
  "projectName": "underscore-web"
}
EOF
else
  echo "Missing Vercel project link: set VERCEL_ORG_ID + VERCEL_PROJECT_ID or run vercel link locally." >&2
  exit 1
fi

VERCEL_ARGS=(--prod --yes)
if [[ -n "${VERCEL_TOKEN:-}" ]]; then
  VERCEL_ARGS+=(--token "$VERCEL_TOKEN")
fi

(cd "$STAGE" && npx vercel "${VERCEL_ARGS[@]}")

echo "Live: https://underscore-web.vercel.app"
