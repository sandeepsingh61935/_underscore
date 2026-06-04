#!/usr/bin/env bash
# check-legacy-ds.sh
#
# Detects legacy design-system references in source trees.
# Categories are defined in the CATEGORIES array below; adding a 12th is one line.
#
# Exit codes:
#   0 — no violations
#   1 — violations found
#   2 — usage error
#
# Usage:
#   bash scripts/check-legacy-ds.sh [path]              # default: src/, strict (exit 1 on violations)
#   bash scripts/check-legacy-ds.sh --soft [path]       # report only, exit 0 even with violations
#   bash scripts/check-legacy-ds.sh --help              # this message
#
# Output format (per category with violations):
#   cat-N-name: K violation(s)
#     <absolute-path>:<line>:<match>
#   ...
#   ---
#   Total: M violation(s) across N categories. Exit 1.

set -euo pipefail

# Parse flags.
SOFT=0
ROOT="src/"
for arg in "$@"; do
  case "$arg" in
    --help|-h) sed -n '2,32p' "$0"; exit 0 ;;
    --soft)    SOFT=1 ;;
    --strict)  SOFT=0 ;;
    -*)        echo "ERROR: unknown flag: $arg" >&2; exit 2 ;;
    *)         ROOT="$arg" ;;
  esac
done

if [[ ! -d "$ROOT" ]]; then
  echo "ERROR: path does not exist or is not a directory: $ROOT" >&2
  exit 2
fi

# Resolve ROOT to absolute path so grep matches are unambiguous.
ROOT_ABS="$(cd "$ROOT" && pwd)"

# Each category is "<label>|<include_glob>|<grep_pattern>".
# Use awk to support | in patterns (the separator is the FIRST |).
# A pattern that needs | in an alternation should be a single awk grep with -E.
# Adding a category = adding one line. Test fixture: tests/unit/harness/fixtures/cat-N-*.
CATEGORIES=(
  "cat-1-md3|*.ts*|var\\(--md-sys-"
  "cat-2-ink|*.ts*|var\\(--ink-"
  "cat-3-style-c|*.ts*|var\\(--(bg|accent|text-primary|text-secondary|text-tertiary|border|radius|shadow-hover)\\b"
  "cat-4-accent-tint|*.ts*|var\\(--accent-tint-"
  "cat-5-logo|*.ts*|var\\(--logo-"
  "cat-6-hex|*.tsx|#[0-9a-fA-F]{3,8}\\b"
  "cat-7-motion|*.ts*|duration-\\[[0-9]+ms\\]"
  "cat-8-touch|*.tsx|\\b(h-7|h-8|h-9|h-10)\\b"
  "cat-10-mode-names|*.ts*|\\b(walk|sprint|vault|neural)\\b"
  "cat-10-mode-names|*.md|\\b(walk|sprint|vault|neural)\\b"
  "cat-11-tailwind-banned|*.ts*|\\b(text-muted-foreground|bg-primary|text-on-surface|border-outline-variant|shadow-elevation-)\\b"
)

# Category 9 (emoji) is special: needs PCRE (\x{...}) which grep -E doesn't support.
# Keep it inline so the backslashes don't get mangled by array/shell quoting.
EMOJI_PATTERN='[\x{1F300}-\x{1F9FF}\x{1F600}-\x{1F64F}\x{1F680}-\x{1F6FF}\x{2600}-\x{26FF}\x{2700}-\x{27BF}]'
EMOJI_GLOB='*.ts*'
EMOJI_LABEL='cat-9-emoji'

# Aggregates — keyed by label so the same category across multiple globs reports once.
declare -A category_count
declare -A category_matches

run_category() {
  local label="$1"
  local glob="$2"
  local pattern="$3"
  local matches
  matches=$(grep -rEn "$pattern" --include="$glob" "$ROOT_ABS" 2>/dev/null || true)
  if [[ -n "$matches" ]]; then
    local count
    count=$(echo "$matches" | wc -l)
    category_count[$label]=$(( ${category_count[$label]:-0} + count ))
    category_matches[$label]+="${matches}"$'\n'
  fi
}

run_emoji_category() {
  local matches
  matches=$(grep -rPn "$EMOJI_PATTERN" --include="$EMOJI_GLOB" "$ROOT_ABS" 2>/dev/null || true)
  if [[ -n "$matches" ]]; then
    local count
    count=$(echo "$matches" | wc -l)
    category_count[$EMOJI_LABEL]=$(( ${category_count[$EMOJI_LABEL]:-0} + count ))
    category_matches[$EMOJI_LABEL]+="${matches}"$'\n'
  fi
}

# Run all categories.
for entry in "${CATEGORIES[@]}"; do
  IFS='|' read -r label glob pattern <<<"$entry"
  run_category "$label" "$glob" "$pattern"
done
run_emoji_category

# Report in stable order — sort by label.
total_violations=0
total_categories=0
for label in $(echo "${!category_count[@]}" | tr ' ' '\n' | sort); do
  count=${category_count[$label]}
  matches=${category_matches[$label]}
  total_violations=$((total_violations + count))
  total_categories=$((total_categories + 1))
  echo "$label: $count violation(s)"
  # Trim trailing newline and indent each line.
  echo "$matches" | sed '/^$/d' | sed 's/^/  /'
done

if [[ "$total_violations" -gt 0 ]]; then
  echo "---"
  if [[ "$SOFT" -eq 1 ]]; then
    echo "Total: $total_violations violation(s) across $total_categories categories. (--soft: exiting 0 for transition; remove --soft to enforce.)"
    exit 0
  fi
  echo "Total: $total_violations violation(s) across $total_categories categories. Exit 1."
  exit 1
fi

echo "OK — 0 violations across 11 categories."
exit 0
