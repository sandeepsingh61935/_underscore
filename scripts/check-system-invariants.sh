#!/usr/bin/env bash
# check-system-invariants.sh
#
# Fails if any hex/rgba color literal appears in the v2 wireframe
# bundle outside tokens.css, outside the documented exceptions.
#
# Two exception categories:
#   THEME_EXCEPTIONS — small enum of hex literals that are NOT
#     part of the theme. Mirrors rule 5 of the tokens.css header.
#     To add a new exception, edit this enum AND rule 5 in the
#     header in the same commit.
#   UTILITY_OVERLAYS — regex pattern matching any rgba(0,0,0,*)
#     or rgba(255,255,255,*) alpha layer. These are utility
#     opacities, not theme colors.
#
# Exit codes:
#   0 — no violations
#   1 — violations found (printed to stdout)

set -euo pipefail

ROOT="${1:-ui_kits/extension/v2}"

# Theme exceptions — mirrors rule 5 of the tokens.css header.
# Add a new entry here AND in rule 5 in the same commit.
THEME_EXCEPTIONS='fef4a8|fdfcf8|222|333|34c759'

# Utility overlays — alpha layers are not theme colors.
UTILITY_OVERLAYS='rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)|rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)'

violations=$(
  grep -rEn '(^|[^&])#[0-9a-fA-F]{3,8}\b|rgba?\(' \
    --include='*.css' --include='*.jsx' --include='*.js' \
    --exclude='tokens.css' \
    "$ROOT" \
  | grep -vE "(^|[^&])#(${THEME_EXCEPTIONS})\b" \
  | grep -vE "${UTILITY_OVERLAYS}" \
  || true
)

if [[ -n "$violations" ]]; then
  count=$(echo "$violations" | wc -l)
  echo "System invariant violations: $count"
  echo ""
  echo "$violations"
  echo ""
  echo "─── Round 2 punch list ─────────────────────────────────────"
  echo "$violations" | awk -F: '{print $1}' | sort -u
  exit 1
fi

echo "OK — no hardcoded colors outside tokens.css."
