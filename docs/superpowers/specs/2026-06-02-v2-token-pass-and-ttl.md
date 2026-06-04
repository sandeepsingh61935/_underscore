# v2 wireframes — token pass + TTL block redesign

**Date:** 2026-06-02
**Status:** Draft (pre-review)
**Scope:** v2 wireframe bundle (9 files in `_underscore_v2.zip`), edited inside the Open Design project created by importing the zip.

---

## 1. Context

A 5-dimension critique of the 9-file v2 wireframe export identified two P0 items blocking the next round of evaluation:

1. **Accent duplication bug.** `tokens.css` defines `--accent`, but `design-canvas.jsx:35` and `design-canvas.jsx:38` hardcode `#c96442` for the focus ring and dragging shadow. The Tweaks panel's accent color picker writes to `documentElement.style.--accent`, so the canvas chrome never follows the live update.
2. **TTL block mis-placed.** In `Home_Ephemeral` (`screens-nav.jsx:~220-225`), the TTL meter is the *differentiator* of ephemeral mode (per the doc-intro at `index.html:139`), but it is currently the *fourth* element the eye lands on, after kicker → domain → count. The bar's reading direction is correct (full at fresh, empty at dying — battery metaphor); the block *order* is wrong.

The critique also identified ~12 P1/P2 polish items (type scale gap, dark-mode-no-caller, ExprSwatch contradiction, FOIT preconnect, kbd element, declaration-order trap, etc.). This round does not address them. They are deferred to Round 2.

The 9-file wireframe bundle is **a design system expressed as a wireframe**, not a typical "wireframe of a product." The doc-intro (`index.html:122-152`) is the *brief* for the system; the wireframes are the visual evidence. The implication: this round is not "fixing wireframes" but "evolving the design system" — so the bug fix is paired with system-rule scaffolding (token registry + comment header + enforcement script) to make the next round of fixes cheaper.

## 2. Non-goals (explicit)

- No change to the `_underscore` codebase (`src/`, `apps/`, Chrome extension source).
- No new files inside the wireframe bundle itself (only `scripts/check-system-invariants.sh` outside).
- No type-preset rework, no dark-mode caller, no ExprSwatch resolution.
- No registration of v2 as a reusable design system in OD (`meta.yaml` route).
- No re-running the 5-dimension critique with revised dimensions; that is Round 2's input.
- No port to a real build system (WXT, Vite, stylelint, etc.). The shell script is the *interim* enforcement; Round 2 swaps in stylelint.

## 3. Architecture

The system is three layers. Tokens are the single source of truth. Components consume tokens. Screens and tools consume components and tokens.

```
Layer 1 — Token registry (tokens.css)
  - :root { --accent, --accent-tint-{08,18,35,65}, --utility-overlay-{06,08,12,15,25}, --utility-surface-elevated, --utility-ok, --ink-1..4, --paper, --rule, --rule-soft }
  - .dark { ... } (unchanged, overrides for dark mode)
  - /* system-rules comment header */ (documented invariants)

Layer 2 — Component library (primitives.jsx)
  - Reads tokens via var(--...). No hex literals.
  - TTLMeter API UNCHANGED (no direction prop — see §5.1).

Layer 3 — Screens + tools
  - May have hardcoded color literals only if listed in tokens.css EXCEPTIONS block.
  - Enforced by scripts/check-system-invariants.sh.
```

### 3.1 Token registry

**`tokens.css` adds to `:root`:**

```css
--accent-tint-08: color-mix(in oklch, var(--accent) 8%, transparent);
--accent-tint-18: color-mix(in oklch, var(--accent) 18%, transparent);
--accent-tint-35: color-mix(in oklch, var(--accent) 35%, transparent);
--accent-tint-65: color-mix(in oklch, var(--accent) 65%, transparent);
--utility-overlay-06: rgba(0, 0, 0, 0.06);
--utility-overlay-08: rgba(0, 0, 0, 0.08);
--utility-overlay-12: rgba(0, 0, 0, 0.12);
--utility-overlay-15: rgba(0, 0, 0, 0.15);
--utility-overlay-25: rgba(0, 0, 0, 0.25);
--utility-surface-elevated: #fff;
--utility-ok: #34c759;  /* documented EXCEPTION — iOS toggle meta-tool */
```

**`--accent` is the single source of truth.** No alias layer (`--canvas-accent` was considered and dropped; see §6.1). Dark mode (when it arrives) will override `--accent` in `.dark` like the existing `--paper`/`--ink` overrides do.

### 3.2 System-rules comment header

A 20-line comment block at the top of `tokens.css`, before `:root`. Lists 9 rules. Drift between the header and the script is *bounded* to the EXCEPTIONS enum (rule 5 / `THEME_EXCEPTIONS` in the script) — see §4.

```css
/* _underscore v2 — design system rules
 *
 * 1. SINGLE ACCENT. All theme color flows from --accent.
 * 2. TINTS. Use --accent-tint-{08,18,35,65} for opacity layers.
 * 3. UTILITY OPACITIES. Hover/press states use --utility-overlay-{06,08,12}.
 * 4. UTILITY SURFACE. Elevated surfaces (tweaks thumbs, primary buttons)
 *    use --utility-surface-elevated. The 34c759 iOS toggle "on" is
 *    a system meta-tool, not a theme color — see --utility-ok.
 * 5. EXCEPTIONS. The following hex values are NOT part of the theme
 *    and may NOT be tokenized:
 *      - #fef4a8 — DCPostIt sticky-note yellow
 *      - #fdfcf8, #222, #333 — FauxPage article surface (different surface)
 *      - #34c759 — iOS toggle "on" (now exposed as --utility-ok)
 * 6. TYPE. App-wide type preset is selected by Tweaks; do not hardcode
 *    font-family outside type-presets.js.
 * 7. DENSITY. Row height 44px minimum. Compact density is a Tweak, not
 *    a per-screen override.
 * 8. MODES. Modes are distinguished by glyph + label, not color.
 *    The single accent appears as active state and brand color only.
 * 9. ROW MOTION. Wireframes may not declare motion. Production code
 *    listens to prefers-reduced-motion.
 */
```

### 3.3 Component layer (primitives.jsx)

**`TTLMeter` API is unchanged.** No `direction` prop, no new `TTLDepletionBar` component. The bar draws "full at fresh, empty at dying" (battery metaphor). What changes is the *block composition around the bar* in `Home_Ephemeral` — the label leads, the bar follows.

The reasoning: the bar's reading direction is *correct*. A depleted bar *should* read as "least alive." What was counter-intuitive in `Home_Ephemeral` was the *block order* — the label said `1h 12m` (urgent) but the bar at 5% was visible before the label, and the eye landed on the bar first. The fix is structural (order), not visual (direction).

## 4. Enforcement — `scripts/check-system-invariants.sh`

The script is the only test in this round. ~30 lines, two exception categories.

### 4.1 Categories

- **THEME_EXCEPTIONS** — a small enum of hex literals that are *not* part of the theme and may not be tokenized. Mirrors rule 5 of the `tokens.css` header. To add a new exception, edit both the header and `THEME_EXCEPTIONS` in the same commit.
- **UTILITY_OVERLAYS** — a regex pattern matching any `rgba(0,0,0,*)` or `rgba(255,255,255,*)` alpha layer. Lives only in the script; the header does not enumerate opacities. To add a new overlay color (e.g., `rgba(128,128,128,*)`), edit the pattern.

### 4.2 Script structure (sketch)

```bash
#!/usr/bin/env bash
# Fails if any color literal appears outside tokens.css
# outside the documented exceptions.
set -euo pipefail
ROOT="${1:-ui_kits/extension/v2}"

THEME_EXCEPTIONS='fef4a8|fdfcf8|222|333|34c759'
UTILITY_OVERLAYS='rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)|rgba\(255,\s*255,\s*255,\s*0\.[0-9]+\)'

violations=$(
  grep -rEn '#[0-9a-fA-F]{3,8}\b|rgba?\(' \
    --include='*.css' --include='*.jsx' --include='*.js' \
    "$ROOT" \
  | grep -vE "^[^:]+:.*tokens\.css:[0-9]+:" \
  | grep -vE "#(${THEME_EXCEPTIONS})\b" \
  | grep -vE "${UTILITY_OVERLAYS}" \
  || true
)

if [[ -n "$violations" ]]; then
  echo "System invariant violations:"
  echo "$violations"
  exit 1
fi
echo "OK — no hardcoded colors outside tokens.css."
```

### 4.3 Drift contract

The drift surface between `tokens.css` rule 5 and the script's `THEME_EXCEPTIONS` is **bounded to the EXCEPTIONS enum**. Rules 1-4 (theme + tints + utility opacities + utility surface) and rules 6-9 (type/density/modes/motion) are *not* mirrored in the script — they are documentation only. The contributor who wants to add a new color exception edits both the header and the script in the same commit. The contributor who wants to change a non-color rule edits only the header.

### 4.4 What the script does NOT catch

- A typo in a `var(--token-name)` reference (e.g., `var(--accentt)` — silent fallback).
- A wrong value assigned to a token in `tokens.css`.
- A future dark-mode override that breaks the alias chain.
- A `color-mix(in oklch, var(--accent) 18%, transparent)` literal that bypasses the tint tokens.

These are deferred to Round 2, which will adopt stylelint with `color-no-hex` and `declaration-property-value-disallowed-list`.

## 5. File-by-file changes

### 5.1 `tokens.css`

- Add 20-line system-rules comment header at top.
- Add 11 token declarations to `:root` (see §3.1).
- **No change to existing tokens.** `--accent`, `--ink-*`, `--paper`, `--rule*`, `--mode-*`, `--pop-w/h`, `--radius`, `--step-*`, font stacks — all unchanged.

### 5.2 `design-canvas.jsx`

- Line ~35 (the `.dc-editable:focus` rule): replace `box-shadow:0 0 0 1.5px #c96442` with `box-shadow:0 0 0 1.5px var(--accent)`.
- Line ~38 (the `.dc-dragging .dc-card` rule): replace `box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442` with `box-shadow:0 12px 40px var(--utility-overlay-25),0 0 0 2px var(--accent)`. The 0.25 alpha has its own token (`--utility-overlay-25`); no literal `rgba()` remains.
- **No change to motion, drag-reorder, focus overlay, or wheel/gesture handling.**

### 5.3 `screens-nav.jsx`

- Line ~328 (capture overlay in `FauxPage`): replace `rgba(201,100,66,0.18)` with `var(--accent-tint-18)`.
- In `Home_Ephemeral` (~line 220-225), restructure the block order:
  - LEAD: kicker "Ephemeral · expires in" (existing kicker, 10px mono, ink-3).
  - LEAD: label "1h 12m" — 15px, `var(--ink-2)`, weight 500, `font-variant-numeric: tabular-nums`. The label value is derived from the existing `ms={3.5 * 3600_000 + 22 * 60_000}` prop passed to `TTLMeter`. The demo ms is read as *time-remaining* (the more natural TTL reading: a TTL meter shows how much life is left, not how much has passed). At 3h 30m remaining on a 24h budget, the meter renders ~14% full (3.5/24) and the label reads "3h 30m" — not "1h 12m" as the original prompt sketch suggested. The agent computes the label from `ms` (e.g., `Math.floor(ms / 3600_000) + "h " + Math.floor((ms % 3600_000) / 60_000) + "m"`) and renders it.
  - FOLLOW: existing `<TTLMeter ms={3.5 * 3600_000 + 22 * 60_000} />`, rendering unchanged.
  - FOLLOW: existing "Current page" block (kicker → domain → count).
- **No change to other Home variants, Nav_B, LibraryHierarchy, FauxPage, or any other `screens-nav.jsx` content.**

### 5.4 `tweaks-panel.jsx`

- Line ~105 (the `.twk-toggle[data-on="1"]` rule): replace `background:#34c759` with `background:var(--utility-ok)`.
- For tweaks panel utility *whites* (slider thumb bg, toggle thumb bg, primary button bg, `.twk-num` elevated bg): replace literal `#fff` with `var(--utility-surface-elevated)`. Keep `rgba(255,255,255,0.6)` and similar alpha overlays as inline literals (they are alpha layers, not theme colors).
- For tweaks panel utility *blacks* in `rgba(0,0,0,0.06 / 0.08 / 0.12 / 0.15 / 0.25)`: route through `--utility-overlay-{06,08,12,15,25}`. No inline `rgba(0,0,0,*)` literals remain.
- **No change to drag-to-move, segment-thumb animation, host protocol, or any other tweaks panel behavior.**

### 5.5 `primitives.jsx`

**No changes.** The `TTLMeter` API is unchanged. The block composition around it is owned by the screen file.

### 5.6 `scripts/check-system-invariants.sh` (new)

- ~30 lines, two exception categories.
- See §4.2 for the full sketch.
- Lives at `scripts/check-system-invariants.sh` (next to the design doc, not inside the wireframe bundle).

## 6. Decisions and rejections (load-bearing)

### 6.1 Rejected: `--canvas-accent` alias

Considered as a forward-compat alias so dark mode (when it arrives) could flip the canvas chrome without touching `--accent`. Rejected because dark mode is not in scope this round, not in Round 2, and not in any open issue. Adding an alias "for the day dark mode arrives" is YAGNI. The alias introduces drift risk (a contributor writing `var(--canvas-accent)` and a contributor writing `var(--accent)` would expect different things). `--accent` is the single source; dark mode will override it in `.dark` like the existing `--paper`/`--ink` overrides do.

### 6.2 Rejected: `TTLDepletionBar` component / `direction` prop on `TTLMeter`

Considered adding a new component for the leading TTL block. Rejected because the bar's reading direction (full at fresh, empty at dying) is *correct* — a depleted bar should read as "least alive," and the battery metaphor is 50 years old. The counter-intuition in the original `Home_Ephemeral` was the *block order* (bar before label), not the bar's *direction*. The fix is structural (reorder the block), not visual (add a direction flag). `TTLMeter` API stays unchanged. The block composition is owned by `Home_Ephemeral`, not by the primitive.

### 6.3 Rejected: Drop the system-rules header; let the script be the only documentation

Considered dropping the `tokens.css` comment header in favor of `--help` text at the top of the script. Rejected because the header covers *non-color* rules (type, density, modes, motion) that the script doesn't check. The header has a scope *broader* than the script; the script is a *subset* of the header. The drift surface is bounded to the `THEME_EXCEPTIONS` enum.

### 6.4 Rejected: Auto-generate the header from the script

Considered having the script write the header. Rejected because the script's rules are a *subset* of the header's rules (color only). Generating the narrower set from the wider set loses information. Manual upkeep of the two, with the bounded-drift contract in §4.3, is the right call.

### 6.5 Rejected: Add all `rgba(255,255,255,*)` to `THEME_EXCEPTIONS` instead of `--utility-surface-elevated`

Considered keeping the tweaks panel's 5-6 utility whites as inline literals and adding them to the exception list. Rejected because future dark-mode-tweaks (or any theming of the meta-tools) would be a 6-file grep-and-replace. A `--utility-surface-elevated` token makes that a one-line change.

### 6.6 Rejected: Replace the shell script with stylelint this round

Considered adopting stylelint with `color-no-hex` and `declaration-property-value-disallowed-list` in this round. Rejected because adopting stylelint is its own half-day of work (config file, package.json script, baseline, CI hook). The shell script is ~30 minutes and gives the same enforcement at this scale. Round 2 swaps in stylelint when the wireframe bundle gets ported to a real build system.

## 7. Acceptance — three artifacts

The round is **done** when all three of the following artifacts are produced:

### 7.1 Artifact 1 — script output

```bash
bash scripts/check-system-invariants.sh
```

Expected: `OK — no hardcoded colors outside tokens.css.`

### 7.2 Artifact 2 — one screenshot

A single screenshot of `Home_Ephemeral` in the imported OD project, with the Tweaks panel open and the accent set to a non-default value. The screenshot must show:
- The TTL block leading the reading order (kicker → label → bar, in that order).
- The TTL bar at ~14% full (3.5h remaining on a 24h budget, demonstrating the "full at fresh → empty at dying" direction).
- The Tweaks panel's accent swatch showing a non-default color.
- The `TTLMeter` fill in the *same* non-default color as the swatch (proves the live update reaches the bar, and by transitivity `--accent` reaches every other consumer of the token, including the canvas chrome).

### 7.3 Artifact 3 — the diff

`git diff` of the 4 modified files (`tokens.css`, `design-canvas.jsx`, `screens-nav.jsx`, `tweaks-panel.jsx`). Plus the new file `scripts/check-system-invariants.sh`. Plus a one-line summary from the agent of how the TTL block in `Home_Ephemeral` now reads.

## 8. Rollback

The imported project should be git-tracked from day one:

```bash
cd <imported-project-folder>
git init
git add -A
git commit -m "import: v2 wireframes from claude-design export"
```

Every round's edit is a commit. Rollback is `git revert <commit>`. The script lives in the repo, so reverting the commit removes it.

Alternative: re-import the zip. OD's welcome dialog → drop the zip → new project. The "bad" project is deleted. This is *not* a clean rollback (it loses any other work), but for a round that only edits wireframe files, it's effectively a fresh start.

## 9. Hand-off to Round 2

Round 2's input is:

1. **`tokens.css` system-rules header** — the 9 rules are the lens for the revised 5-dimension critique. Round 2's critique is "is the wireframe consistent with the rules it documents?"
2. **`check-system-invariants.sh` output** — Round 2 starts by running the script. If it fails, Round 2 fixes that *first*, before doing anything else. The script is the gate.
3. **The 4 modified files' diff** — Round 2 sees the *delta* from this round and reasons about what is still in the file.
4. **The P1/P2 punch list still open** from the original critique:
   - Type scale gap (no 24/32/40; body 13px below comfort floor; mono 9-10px below WCAG-readable)
   - Dark-mode-no-caller (every `PopupFrame` accepts `dark`, no caller passes it)
   - ExprSwatch contradiction with the "single accent" rule (`screens-expression.jsx:26-42`)
   - FOIT preconnect on type-preset switch (only editorial is preconnected)
   - FauxPage surface split (`#fdfcf8 / #222 / #333` literals)
   - DCPostIt hardcoded `#fef4a8` (now an EXCEPTION — but consider whether the sticky-note yellow should be a future surface token)
   - Quote-mark size inconsistency (28px in `HighlightCard`, 22px in `LibraryHierarchy L4`)
   - Headline italic vs subtitle weight contrast (`ModeSelect_A:14`)
   - Declaration-order trap (`onWheel` references `isGesturing` declared below it)
   - RAF-pacing promise in doc-intro with no actual 1s tick in the wireframe
   - Drag-reorder sibling transition (only the dragged card transitions; siblings snap)
   - Kbd hint in empty states (Unicode glyph instead of `<kbd>` element)
   - Nav_B expand affordance (only one section open by default)
   - Empty_B secondary copy bridge (18px headline jumps to 13px italic body)
   - ModeSelect_D axis labels (9px, ink-3 — below readable)

Round 2 picks 2-3 items from this list, runs the revised 5-dimension critique as the *input* to picking, applies the same A+ shape of fix-and-document. Same shape as this round, different items. Round 2 also adopts stylelint as the long-term replacement for the shell script.

## 10. Out of scope, longer term

- OD `meta.yaml` registration of v2 as a reusable design system.
- Port to the `_underscore` React codebase (`src/ui-system/`, `src/features/`, etc.).
- Type-preset typographic-system rework (each preset as a true typographic system, not a font swap).
- Dark mode implementation (the `--canvas-accent` alias was considered and dropped, §6.1 — dark mode will override `--accent` directly in `.dark`).
- A visual regression test suite (Playwright, Chromatic, etc.) — out of scope until the wireframe bundle is ported to a real build system.
