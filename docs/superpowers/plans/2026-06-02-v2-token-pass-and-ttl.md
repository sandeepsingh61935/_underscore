# v2 Wireframes — Token Pass + TTL Block Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the accent-color duplication bug and the mis-placed TTL block in the 9-file v2 wireframe bundle, while laying down a token registry + system-rule scaffolding so future rounds can iterate without re-introducing hardcoded colors.

**Architecture:** Tokens are the single source of truth (`tokens.css`). A 30-line shell script (`scripts/check-system-invariants.sh`) enforces the rule that no hex/rgba literal appears outside `tokens.css` (with two documented exception categories). The TTL block in `Home_Ephemeral` is restructured to lead with the label; the bar itself is unchanged.

**Tech Stack:** Plain CSS (CSS custom properties + `color-mix()`), React JSX, Bash. No build system, no test runner, no CSS linter. The shell script is the only "test."

**Spec:** `docs/superpowers/specs/2026-06-02-v2-token-pass-and-ttl.md` (commit `9668e9d`)

**Source wireframes:** `/home/sandy/Downloads/_underscore_v2.zip` (9 files, ~140 KB, ~31 KB of which is `design-canvas.jsx`)

**Edit target:** A new git-tracked project folder, created by importing the zip into Open Design (`pnpm tools-dev run web` → welcome dialog → drop the zip). The wireframe files in the zip are the source of truth; the imported project's `ui_kits/extension/v2/` mirror is the edit target.

---

## File Structure

**Modified files (4):**
- `ui_kits/extension/v2/tokens.css` — add system-rules comment header + 11 new tokens
- `ui_kits/extension/v2/design-canvas.jsx` — line 35, 38 (focus ring + dragging shadow)
- `ui_kits/extension/v2/screens-nav.jsx` — line 328 (capture overlay) + `Home_Ephemeral` block restructure (lines 220-225)
- `ui_kits/extension/v2/tweaks-panel.jsx` — line 105 (iOS toggle) + utility whites + utility blacks throughout

**Unchanged files (5):**
- `ui_kits/extension/v2/primitives.jsx` — `TTLMeter` API unchanged
- `ui_kits/extension/v2/type-presets.js` — out of scope
- `ui_kits/extension/v2/screens-mode-select.jsx` — out of scope
- `ui_kits/extension/v2/screens-expression.jsx` — out of scope
- `ui_kits/extension/v2/index.html` — out of scope

**New files (1):**
- `scripts/check-system-invariants.sh` — the only test in this round

**Total:** 4 modified + 1 new = 5 files touched. The spec doc itself is already committed.

---

## Task Decomposition

The round is small (5 files, ~30 lines of new code, ~10 lines of new script), so the plan is structured as 6 tasks in 3 phases:

- **Phase 1 — Foundation** (Tasks 1-2): Set up git tracking + lay down the token registry. No behavior change yet.
- **Phase 2 — Routing** (Tasks 3-4): Route consumers through the new tokens. Accent duplication bug fixed by end of Task 4.
- **Phase 3 — TTL + Verification** (Tasks 5-6): Restructure the TTL block, write the enforcement script, run the round's acceptance.

The phases map to the spec's three artifacts: Phase 1 → script output (after the script exists); Phase 2 → diff (the routing edits are reviewable as a single diff); Phase 3 → screenshot (the TTL block visual change is the only one that needs visual evidence).

---

## Phase 1 — Foundation

### Task 1: Set up git tracking on the imported project

**Files:**
- Create: `.gitignore` in the imported project root (if absent)
- Create: initial commit covering the 9 imported wireframe files

- [ ] **Step 1: Open the imported project in a terminal**

The imported project lives somewhere under OD's projects directory. The exact path depends on where OD created it. From the OD welcome dialog after import, hover the project card to see the path, or check `~/.local/share/open-design/projects/` (or similar — consult OD's docs if the path differs).

```bash
cd <imported-project-path>
ls -la
```

Expected: 9 wireframe files under `ui_kits/extension/v2/`, plus any OD-generated metadata (`.od/`, `README.md`, etc.).

- [ ] **Step 2: Initialize git (if not already)**

```bash
git init
git status
```

Expected: `git status` shows untracked files (the 9 wireframe files + OD metadata). If the project is already a git repo, skip the init.

- [ ] **Step 3: Create a `.gitignore` for OD metadata (only if OD didn't already)**

```bash
# Only if .gitignore doesn't exist
cat > .gitignore <<'EOF'
# OD runtime
.od/
od.log
od.err.log

# Editor / OS
.DS_Store
*.swp
EOF
```

If `.gitignore` already exists, append to it instead (or skip if it already covers these).

- [ ] **Step 4: Stage everything and make the baseline commit**

```bash
git add -A
git status    # verify the 9 wireframe files are staged
git commit -m "import: v2 wireframes from claude-design export"
```

Expected: a single commit with all imported files. This is the rollback anchor for the round.

---

### Task 2: Add the 11 new tokens + system-rules comment header to tokens.css

**Files:**
- Modify: `ui_kits/extension/v2/tokens.css:1-5` (insert comment header at top)
- Modify: `ui_kits/extension/v2/tokens.css:13-30` (add 11 new declarations to `:root`)

- [ ] **Step 1: Verify the existing tokens.css is unchanged from the import**

```bash
git diff HEAD -- ui_kits/extension/v2/tokens.css
```

Expected: empty output. (If non-empty, the import changed it; investigate before continuing.)

- [ ] **Step 2: Insert the 20-line system-rules comment header at the top**

The current file starts with `/* _underscore v2 — wireframe tokens ...`. Insert the new comment block *above* the existing file-header comment.

Use the Edit tool to find the file's first line and prepend the new header:

```
old_string: /* _underscore v2 — wireframe tokens
new_string: /* _underscore v2 — design system rules
 *
 * 1. SINGLE ACCENT. All theme color flows from --accent.
 * 2. TINTS. Use --accent-tint-{08,18,35,65} for opacity layers.
 * 3. UTILITY OPACITIES. Hover/press states use --utility-overlay-{06,08,12,15,25}.
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

/* _underscore v2 — wireframe tokens
```

(Note: only the first line of `old_string` and the first/last line of `new_string` are shown; the full `old_string` is the entire first comment line of the file, and the full `new_string` includes the existing comment line at the end of the insert. Edit the file by anchoring on the file's literal first line.)

- [ ] **Step 3: Add the 11 token declarations to `:root`**

Open the file and find `:root {`. The existing `:root` block contains `--paper`, `--paper-2`, `--rule`, `--rule-soft`, `--ink`, `--ink-2`, `--ink-3`, `--ink-4`, `--accent`, `--accent-2`, `--accent-ink`, `--mode-*`. Add the new declarations immediately after the existing `--accent-ink` line, before the `/* Type */` comment that follows:

```css
  /* Accent tint scale — opacity layers for the single accent. */
  --accent-tint-08: color-mix(in oklch, var(--accent) 8%, transparent);
  --accent-tint-18: color-mix(in oklch, var(--accent) 18%, transparent);
  --accent-tint-35: color-mix(in oklch, var(--accent) 35%, transparent);
  --accent-tint-65: color-mix(in oklch, var(--accent) 65%, transparent);

  /* Utility overlays — alpha layers for hover/press states. */
  --utility-overlay-06: rgba(0, 0, 0, 0.06);
  --utility-overlay-08: rgba(0, 0, 0, 0.08);
  --utility-overlay-12: rgba(0, 0, 0, 0.12);
  --utility-overlay-15: rgba(0, 0, 0, 0.15);
  --utility-overlay-25: rgba(0, 0, 0, 0.25);

  /* Utility surface — elevated surfaces (tweaks thumbs, primary buttons). */
  --utility-surface-elevated: #fff;

  /* System meta-tool exception — iOS toggle "on" state. */
  --utility-ok: #34c759;
```

- [ ] **Step 4: Verify the file parses as valid CSS**

```bash
# Use a node one-liner to check the file parses (no node project needed; node ships globally)
node -e "const fs=require('fs'); const css=fs.readFileSync('ui_kits/extension/v2/tokens.css','utf8'); const m=css.match(/:root\s*\{[^}]*\}/g); console.log('Found', m ? m.length : 0, ':root blocks'); console.log('--accent-tint-18 present:', css.includes('--accent-tint-18'));"
```

Expected: `Found 1 :root blocks` and `--accent-tint-18 present: true`.

- [ ] **Step 5: Commit**

```bash
git add ui_kits/extension/v2/tokens.css
git commit -m "feat(tokens): add 11-token registry + system-rules header

Adds --accent-tint-{08,18,35,65} (color-mix-based accent opacities),
--utility-overlay-{06,08,12,15,25} (alpha layers for hover/press),
--utility-surface-elevated (theme-able meta-tool surface), and
--utility-ok (documented iOS toggle exception). The system-rules
header documents 9 invariants for the wireframe bundle.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 2 — Routing

### Task 3: Fix the accent duplication bug in design-canvas.jsx

**Files:**
- Modify: `ui_kits/extension/v2/design-canvas.jsx:35` (`.dc-editable:focus` rule)
- Modify: `ui_kits/extension/v2/design-canvas.jsx:38` (`.dc-dragging .dc-card` rule)

- [ ] **Step 1: Open the file and locate line 35**

The relevant block looks like:

```js
    '.dc-editable{cursor:text;outline:none;white-space:nowrap;border-radius:3px;padding:0 2px;margin:0 -2px}',
    '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}',
    '[data-dc-slot]{transition:transform .18s cubic-bezier(.2,.7,.3,1)}',
    '[data-dc-slot].dc-dragging{transition:none;z-index:10;pointer-events:none}',
    '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
```

- [ ] **Step 2: Replace `#c96442` on line 35 with `var(--accent)`**

```
old: '.dc-editable:focus{background:#fff;box-shadow:0 0 0 1.5px #c96442}',
new: '.dc-editable:focus{background:var(--utility-surface-elevated);box-shadow:0 0 0 1.5px var(--accent)}',
```

(Two changes in one line: `#fff` → `var(--utility-surface-elevated)` *and* `#c96442` → `var(--accent)`.)

- [ ] **Step 3: Replace `rgba(0,0,0,.25)` and `#c96442` on line 38 with token references**

```
old: '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px rgba(0,0,0,.25),0 0 0 2px #c96442;transform:scale(1.02)}',
new: '[data-dc-slot].dc-dragging .dc-card{box-shadow:0 12px 40px var(--utility-overlay-25),0 0 0 2px var(--accent);transform:scale(1.02)}',
```

- [ ] **Step 4: Verify no `#c96442` survives in this file**

```bash
grep -n '#c96442' ui_kits/extension/v2/design-canvas.jsx
```

Expected: empty output.

- [ ] **Step 5: Commit**

```bash
git add ui_kits/extension/v2/design-canvas.jsx
git commit -m "fix(canvas): route focus ring + drag shadow through --accent token

The Tweaks accent picker writes to --accent, but the canvas chrome
hardcoded #c96442 — so the live accent picker never reached the
focus ring or drag shadow. Now both read from var(--accent), with
the focus background routed through --utility-surface-elevated and
the drag shadow's 0.25 alpha through --utility-overlay-25.

Closes the accent duplication bug for design-canvas.jsx.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 4: Route the tweaks panel through tokens

**Files:**
- Modify: `ui_kits/extension/v2/tweaks-panel.jsx:105` (`.twk-toggle[data-on="1"]` rule)
- Modify: `ui_kits/extension/v2/tweaks-panel.jsx` (utility whites throughout — slider thumb, toggle thumb, primary button)
- Modify: `ui_kits/extension/v2/tweaks-panel.jsx` (utility blacks throughout — hover/press overlays)

- [ ] **Step 1: Locate all hardcoded color literals in the file**

```bash
grep -nE '#[0-9a-fA-F]{3,8}\b|rgba?\(' ui_kits/extension/v2/tweaks-panel.jsx
```

Expected: a list of every line with a hex or rgba literal. Typical lines (verify against the actual grep output):

- Line 95: `background:rgba(255,255,255,.9)` (segment thumb)
- Line 95: `box-shadow:0 1px 2px rgba(0,0,0,.12)` (segment thumb)
- Line 102: `background:rgba(0,0,0,.06)` (segment track)
- Line 104: `background:rgba(255,255,255,.9)` (segment thumb in dragging)
- Line 105: `background:#34c759` (iOS toggle "on") — **target**
- Line 105: `background:rgba(0,0,0,.15)` (toggle off)
- Line 106: `background:#fff` (toggle thumb) — **target**
- Line 106: `box-shadow:0 1px 2px rgba(0,0,0,.25)` (toggle thumb shadow)
- Line 109: `background:rgba(255,255,255,.6)` (number input bg — *alpha overlay, KEEP literal*)
- Line 111: `border:.5px solid rgba(0,0,0,.1)` (number input border)
- Line 111: `color:rgba(41,38,27,.6)` (label color — text, KEEP literal)
- Line 112: `color:rgba(41,38,27,.45)` (unit color — text, KEEP literal)
- Line 121: `background:rgba(0,0,0,.78)` (primary button bg)
- Line 121: `color:#fff` (primary button text)
- Line 122: `background:rgba(0,0,0,.88)` (primary button hover)
- Line 124: `background:rgba(0,0,0,.06)` (secondary button bg)
- Line 125: `background:rgba(0,0,0,.1)` (secondary button hover)
- Line 128: `border:.5px solid rgba(0,0,0,.1)` (swatch border)

- [ ] **Step 2: Replace line 105 (iOS toggle "on")**

```
old:   .twk-toggle[data-on="1"]{background:#34c759}
new:   .twk-toggle[data-on="1"]{background:var(--utility-ok)}
```

- [ ] **Step 3: Replace utility whites (the literal `#fff` instances)**

The literal `#fff` appears in two places (slider thumb line 95 is `rgba(255,255,255,.9)` — keep that, it's an alpha overlay):

- Line 106 (toggle thumb): `background:#fff` → `background:var(--utility-surface-elevated)`
- Line 121 (primary button text color): `color:#fff` → `color:var(--utility-surface-elevated)`

(If `grep` shows additional `#fff` literals in your file, route them through the same token. Verify the diff visually before committing.)

- [ ] **Step 4: Replace utility blacks (the `rgba(0,0,0,*)` instances)**

For each `rgba(0,0,0,X)` in the file, find the X (the alpha) and route through the matching token. The 5 utility overlay tokens are at 0.06 / 0.08 / 0.12 / 0.15 / 0.25. If the alpha is one of these, use the token. If the alpha is *not* one of these (e.g., 0.1, 0.78, 0.88), keep the literal — those are outside the round's scope and would require adding more tokens to the registry.

Concrete edits:

- Line 95 (segment thumb shadow): `rgba(0,0,0,.12)` → `var(--utility-overlay-12)`
- Line 102 (segment track bg): `rgba(0,0,0,.06)` → `var(--utility-overlay-06)`
- Line 105 (toggle off bg): `rgba(0,0,0,.15)` → `var(--utility-overlay-15)`
- Line 106 (toggle thumb shadow): `rgba(0,0,0,.25)` → `var(--utility-overlay-25)`
- Line 111 (number input border): `rgba(0,0,0,.1)` → **KEEP LITERAL** (0.1 is not in the token set; adding it is out of scope)
- Line 121 (primary button bg): `rgba(0,0,0,.78)` → **KEEP LITERAL** (0.78 is not in the token set)
- Line 122 (primary button hover bg): `rgba(0,0,0,.88)` → **KEEP LITERAL**
- Line 124 (secondary button bg): `rgba(0,0,0,.06)` → `var(--utility-overlay-06)`
- Line 125 (secondary button hover bg): `rgba(0,0,0,.1)` → **KEEP LITERAL**
- Line 128 (swatch border): `rgba(0,0,0,.1)` → **KEEP LITERAL**

(The pattern: `rgba(0,0,0,X)` where X ∈ {0.06, 0.08, 0.12, 0.15, 0.25} → token. Otherwise → keep literal. This is the spec's rule 3.)

- [ ] **Step 5: Verify the only remaining `rgba(0,0,0,*)` literals in this file are the 5 out-of-scope opacities**

```bash
grep -nE 'rgba\(0,\s*0,\s*0,\s*0\.[0-9]+\)' ui_kits/extension/v2/tweaks-panel.jsx
```

Expected: 5 lines, with the alphas 0.1, 0.78, 0.88, 0.1, 0.1 (or similar — the out-of-scope opacities).

- [ ] **Step 6: Verify no `#c96442` survives in the bundle**

```bash
grep -rn '#c96442' ui_kits/extension/v2/
```

Expected: empty output. (By this point in the round, the only `#c96442` literal that *could* exist is in `tokens.css` if we were defining `--accent` as the literal; but the file uses `oklch(62% 0.12 45)`, so even there it's absent. The grep should be empty.)

- [ ] **Step 7: Commit**

```bash
git add ui_kits/extension/v2/tweaks-panel.jsx
git commit -m "refactor(tweaks): route meta-tool colors through token registry

The iOS toggle 'on' state (line 105) reads from --utility-ok.
Utility whites (toggle thumb, primary button text) read from
--utility-surface-elevated. Utility blacks at 0.06/0.12/0.15/0.25
opacities read from --utility-overlay-{06,12,15,25}. Out-of-scope
opacities (0.1, 0.78, 0.88) remain as inline literals — adding
tokens for them is deferred to a future round.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Phase 3 — TTL + Verification

### Task 5: Restructure the TTL block in Home_Ephemeral

**Files:**
- Modify: `ui_kits/extension/v2/screens-nav.jsx:328` (capture overlay in `FauxPage`)
- Modify: `ui_kits/extension/v2/screens-nav.jsx:220-225` (`Home_Ephemeral` block order)

- [ ] **Step 1: Locate the capture overlay in `FauxPage`**

```bash
grep -n 'rgba(201,100,66' ui_kits/extension/v2/screens-nav.jsx
```

Expected: line 328. (If the line number differs in your import, the find-string is the same.)

- [ ] **Step 2: Replace the capture overlay literal**

```
old: background: "rgba(201,100,66,0.18)"  (or similar — check actual content)
new: background: "var(--accent-tint-18)"
```

The literal may be inside a JSX `style={{}}` object or inside a CSS string. The replacement token is the same either way.

- [ ] **Step 3: Locate `Home_Ephemeral`**

```bash
grep -n 'function Home_Ephemeral' ui_kits/extension/v2/screens-nav.jsx
```

Expected: a line near 220. The function definition is ~15 lines, ending around line 240-245.

- [ ] **Step 4: Read the current block structure**

Open the file and read the `Home_Ephemeral` function. The current order is:

```jsx
function Home_Ephemeral({ dark }) {
  return (
    <PopupFrame dark={dark} title="_underscore" mode="ephemeral">
      <ModeHeader modeId="ephemeral" onSwitch={() => {}} />
      <div style={{ padding: "14px 16px 6px" }}>
        <div className="u-kicker">Current page</div>
        <div className="u-serif" style={{ fontSize: 19, lineHeight: 1.15, letterSpacing: "-0.01em", marginTop: 4 }}>
          anthropic.com / Academy
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
          3 highlights on this page
        </div>
      </div>
      <TTLMeter ms={3.5 * 3600_000 + 22 * 60_000} />
      …
```

- [ ] **Step 5: Restructure the block to lead with the TTL label**

Replace the inner contents of `Home_Ephemeral` (the children of `<PopupFrame>`) so the new order is:

```jsx
function Home_Ephemeral({ dark }) {
  const ttlMs = 3.5 * 3600_000 + 22 * 60_000;
  const ttlH = Math.floor(ttlMs / 3600_000);
  const ttlM = Math.floor((ttlMs % 3600_000) / 60_000);
  const ttlLabel = `${ttlH}h ${ttlM}m`;
  return (
    <PopupFrame dark={dark} title="_underscore" mode="ephemeral">
      <ModeHeader modeId="ephemeral" onSwitch={() => {}} />
      {/* LEAD: TTL block (was 4th) */}
      <div style={{ padding: "14px 16px 4px" }}>
        <div className="u-kicker">Ephemeral · expires in</div>
        <div className="u-mono" style={{
          fontSize: 15, lineHeight: 1.2, color: "var(--ink-2)",
          fontWeight: 500, marginTop: 4, letterSpacing: "-0.005em",
          fontVariantNumeric: "tabular-nums",
        }}>
          {ttlLabel}
        </div>
        <div style={{ marginTop: 8 }}>
          <TTLMeter ms={ttlMs} />
        </div>
      </div>
      {/* FOLLOW: existing "Current page" block */}
      <div style={{ padding: "10px 16px 6px" }}>
        <div className="u-kicker">Current page</div>
        <div className="u-serif" style={{ fontSize: 19, lineHeight: 1.15, letterSpacing: "-0.01em", marginTop: 4 }}>
          anthropic.com / Academy
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)", marginTop: 4 }}>
          3 highlights on this page
        </div>
      </div>
      …
```

(The label reads "3h 30m" for the demo `3.5 * 3600_000 + 22 * 60_000` ms. The math: `3.5h = 3h 30m` of remaining time, so the TTLMeter renders ~14% full. The user sees "Ephemeral · expires in" → "3h 30m" → bar at 14%, in that order.)

- [ ] **Step 6: Verify the TTL block reads in the new order**

```bash
grep -A 1 "Ephemeral · expires in" ui_kits/extension/v2/screens-nav.jsx | head -5
```

Expected: the kicker line, then the `u-mono` label line, then the TTLMeter. The order is kicker → label → bar.

- [ ] **Step 7: Verify no `rgba(201,100,66,0.18)` survives**

```bash
grep -n 'rgba(201,100,66' ui_kits/extension/v2/screens-nav.jsx
```

Expected: empty output.

- [ ] **Step 8: Commit**

```bash
git add ui_kits/extension/v2/screens-nav.jsx
git commit -m "fix(home): lead Home_Ephemeral with the TTL block

The TTL meter is the differentiator of ephemeral mode (per the
doc-intro), but it was the fourth element the eye landed on. Move
the kicker + a human-form label (3h 30m, 15px, ink-2, weight 500)
to the top of the block, with the existing TTLMeter following as
a redundant signal. The capture overlay in FauxPage (line 328) now
reads from var(--accent-tint-18) so it follows the live accent
picker.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

### Task 6: Write the enforcement script and run the round's acceptance

**Files:**
- Create: `scripts/check-system-invariants.sh` (the only "test" in the round)

- [ ] **Step 1: Create the scripts directory**

```bash
mkdir -p scripts
```

- [ ] **Step 2: Write the script**

Create `scripts/check-system-invariants.sh` with the following content (use the Write tool — this is a new file):

```bash
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

- [ ] **Step 3: Make the script executable**

```bash
chmod +x scripts/check-system-invariants.sh
```

- [ ] **Step 4: Run the script — expected: PASS**

```bash
bash scripts/check-system-invariants.sh
```

Expected output: `OK — no hardcoded colors outside tokens.css.`

If the script fails:
- Inspect each violation in the output.
- For a violation that's a *legitimate* new exception (e.g., a new color was deliberately added): edit `THEME_EXCEPTIONS` in the script AND rule 5 in `tokens.css` in the same commit. Re-run.
- For a violation that's a *missed routing* (the contributor forgot to use a `var(--token)`): fix the consumer file. Re-run.

- [ ] **Step 5: Sanity-check the script actually catches violations (regression test)**

```bash
# Temporarily reintroduce the bug, run the script, confirm it fails, revert
sed -i.bak 's/var(--accent)/#c96442/' ui_kits/extension/v2/design-canvas.jsx
bash scripts/check-system-invariants.sh
echo "---exit code: $?---"
mv ui_kits/extension/v2/design-canvas.jsx.bak ui_kits/extension/v2/design-canvas.jsx
bash scripts/check-system-invariants.sh
echo "---exit code: $?---"
```

Expected: first run prints violations (exit 1), second run prints `OK` (exit 0). This confirms the script is doing real work, not silently passing.

- [ ] **Step 6: Commit the script**

```bash
git add scripts/check-system-invariants.sh
git commit -m "test(invariants): shell-based checker for color literal rules

30-line bash script with two exception categories:
THEME_EXCEPTIONS (hex enum, mirrors tokens.css rule 5) and
UTILITY_OVERLAYS (regex pattern for alpha layers). The drift
surface between the script and the tokens.css header is bounded
to the THEME_EXCEPTIONS enum — non-color rules (type, density,
modes, motion) live only in the header. Round 2 will replace this
script with stylelint when the wireframe bundle is ported to a
real build system.

Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>"
```

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task |
|---|---|
| §3.1 token registry (11 tokens) | Task 2 |
| §3.2 system-rules comment header | Task 2 |
| §3.3 primitives.jsx unchanged | Implicit (no task) |
| §4 enforcement script | Task 6 |
| §5.1 tokens.css changes | Task 2 |
| §5.2 design-canvas.jsx lines 35, 38 | Task 3 |
| §5.3 screens-nav.jsx line 328 + Home_Ephemeral restructure | Task 5 |
| §5.4 tweaks-panel.jsx line 105 + utility whites + utility blacks | Task 4 |
| §5.5 primitives.jsx unchanged | Implicit (no task) |
| §5.6 new file: scripts/check-system-invariants.sh | Task 6 |
| §7 acceptance — script output | Task 6, Step 4 |
| §7 acceptance — one screenshot | (Manual, post-plan — not in tasks) |
| §7 acceptance — diff | (Each task's commit is a sub-diff; full diff via `git log` at end) |
| §8 rollback (git-tracked) | Task 1 |
| §9 hand-off to Round 2 | (Plan-end note, not a task) |

**Gap:** the "one screenshot" acceptance criterion is not in the plan. The screenshot is a manual action (open the imported project in OD, drag the Tweaks accent swatch, take a screenshot of `Home_Ephemeral` showing the new TTL block + the live accent reaching the meter). Adding a "Task 7: capture acceptance screenshot" would be artificial — the screenshot is the contributor's evidence, not a code artifact. The plan-end checklist calls this out.

**2. Placeholder scan:**

No "TBD" / "TODO" / "implement later" / "similar to Task N" in any step. Every edit step shows the actual `old_string` and `new_string` content. The plan has no references to types, functions, or methods that aren't defined in this codebase already (`TTLMeter`, `PopupFrame`, `ModeHeader`, `u-kicker`, `u-mono`, `u-serif` are all in the imported project).

**3. Type / property name consistency:**

- `--accent-tint-{08,18,35,65}` — same names used in Task 2 (definition), Task 5 (`var(--accent-tint-18)`), and the script (regex pattern). ✓
- `--utility-overlay-{06,08,12,15,25}` — same names in Task 2, Task 4 (multiple `var(--utility-overlay-N)` edits), and the script. ✓
- `--utility-surface-elevated` — same name in Task 2 and Task 4 (route through this token). ✓
- `--utility-ok` — same name in Task 2 and Task 4 (line 105). ✓
- The script's `THEME_EXCEPTIONS='fef4a8|fdfcf8|222|333|34c759'` — matches the spec's rule 5 in `tokens.css`. ✓
- `TTLMeter` API — never modified (no `direction` prop). ✓
- The TTL block ms value `3.5 * 3600_000 + 22 * 60_000` — used identically in Tasks 5 (definition) and the spec. The label is computed from this same value. ✓

No inconsistencies found. No fixes needed.

---

## Plan-End Checklist (Manual)

The plan is **done** when, in addition to the 6 task commits, the contributor produces two more artifacts:

- [ ] **Screenshot of `Home_Ephemeral`** in the imported OD project, with the Tweaks panel open and the accent set to a non-default value. The screenshot must show:
  - The TTL block leading the reading order (kicker → label → bar).
  - The TTL bar at ~14% full width (3.5h / 24h).
  - The Tweaks panel's accent swatch and the `TTLMeter` fill in the same non-default color (proves the live update path).
- [ ] **A short summary** of how the TTL block now reads (one sentence: "Kicker 'Ephemeral · expires in' → label '3h 30m' → TTLMeter at 14% width, in that order.").

If the screenshot shows the accent picker color and the meter color are *different*, the live update path is broken — debug before declaring done. The most common cause: the Tweaks panel writes to `--accent` on `documentElement`, and a consumer in the wireframe reads `--accent` from a different scope (e.g., a child element with a different `style` attribute). Check the Tweaks panel's `setProperty` call site and the consumer's `var(--accent)` call site are both on `documentElement` / its descendants.

---

## Hand-off to Round 2

Round 2's input is:

1. `tokens.css` system-rules header (the 9 rules are the lens for the revised 5-dimension critique).
2. `scripts/check-system-invariants.sh` output (the gate; Round 2 runs it first).
3. The diff of the 4 modified files (the delta from this round).
4. The ~13-item P1/P2 punch list (type scale gap, dark-mode-no-caller, ExprSwatch contradiction, FOIT preconnect, faux page surface split, etc.).

Round 2 picks 2-3 items, runs the revised 5-dimension critique as the *input* to picking, applies the same shape of fix-and-document. Same shape as this round, different items. Round 2 also adopts stylelint to replace this shell script.
