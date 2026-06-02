# v2 Wireframes — Round 2: 3 Leftover `#fff` Literals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Route 3 leftover `#fff` text-color literals in 2 untouched wireframe files through the existing `--utility-surface-elevated` token, eliminating the same bug class Round 1 fixed in `design-canvas.jsx:35,38` (consumer hardcoded where a token existed, so the live accent picker could not influence them).

**Architecture:** Single-token replacement at 3 known sites. No new tokens, no new files, no new tests — the existing `scripts/check-system-invariants.sh` is the gate. Two commits, one per file.

**Tech Stack:** Plain CSS custom properties, React JSX (wireframe-only, no build), Bash. No build system, no test runner, no CSS linter. The shell script is the only test.

**Spec:** `docs/superpowers/specs/2026-06-02-v2-round-2-fff-untouched.md` (commit `18771c2`)

**Branch base:** `fix/v2-token-pass-and-ttl` (Round 1's branch, 6 commits ahead of `main`)

**New branch:** `fix/v2-round-2-fff-untouched`

---

## File Structure

**Modified files (2):**
- `ui_kits/extension/v2/screens-mode-select.jsx` — 2 lines (144, 220)
- `ui_kits/extension/v2/screens-expression.jsx` — 1 line (32)

**Unchanged files (read-only references):**
- `ui_kits/extension/v2/tokens.css` — `--utility-surface-elevated` defined at line 58
- `scripts/check-system-invariants.sh` — verification script (gate)
- All 7 other files in `ui_kits/extension/v2/` — out of scope

**New files (0):**

**Total:** 2 modified + 0 new = 2 files touched. The spec doc itself is already committed.

---

## Task Decomposition

Round 2 is small (3 lines, 2 files, 2 commits), so the plan is structured as 3 tasks in 1 phase:

- **Phase 1 — Routing** (Tasks 1-2): Route each file's `#fff` literal through `--utility-surface-elevated`. One commit per file.
- **Phase 2 — Verification** (Task 3): Re-run the gate, confirm count drops 52 → 49, document the per-round split.

The phases map directly to the spec's three artifacts: Phase 1 → diff (one commit per file is reviewable as a sub-diff), Phase 2 → script output (the gate).

---

## Phase 1 — Routing

### Task 1: Route `screens-mode-select.jsx` `#fff` literals through `--utility-surface-elevated`

**Files:**
- Modify: `ui_kits/extension/v2/screens-mode-select.jsx:144`
- Modify: `ui_kits/extension/v2/screens-mode-select.jsx:220`

- [ ] **Step 1: Verify the current state of the file (baseline)**

```bash
git diff HEAD -- ui_kits/extension/v2/screens-mode-select.jsx
```

Expected: empty output. (If non-empty, an earlier round changed it; investigate before continuing.)

- [ ] **Step 2: Confirm both target lines exist and are identical**

```bash
grep -n 'color: active ? "#fff"' ui_kits/extension/v2/screens-mode-select.jsx
```

Expected: 2 hits, both showing the pattern `color: active ? "#fff" : "var(--ink-2)",` (lines 144 and 220). If the line numbers differ, the find-string is the same; use the Edit tool with the literal pattern to match.

- [ ] **Step 3: Replace line 144**

```
old:               color: active ? "#fff" : "var(--ink-2)",
new:               color: active ? "var(--utility-surface-elevated)" : "var(--ink-2)",
```

- [ ] **Step 4: Replace line 220**

```
old:                 color: active ? "#fff" : "var(--ink-2)",
new:                 color: active ? "var(--utility-surface-elevated)" : "var(--ink-2)",
```

(Indentation is 14 spaces on line 220 vs 14 spaces on line 144 — the deeper nesting is inside a `<button>` element. Match the literal text on each line, including the leading whitespace. The Edit tool's `old_string` must be unique; if both lines have identical indentation, anchor with surrounding context — e.g. the `border:` line just above each one is a different value, so each `color:` line is uniquely findable.)

- [ ] **Step 5: Verify no `#fff` survives in this file**

```bash
grep -n '"#fff"\|: "#fff"' ui_kits/extension/v2/screens-mode-select.jsx
```

Expected: empty output.

- [ ] **Step 6: Verify both edits used the token**

```bash
grep -n 'utility-surface-elevated' ui_kits/extension/v2/screens-mode-select.jsx
```

Expected: 2 hits (one per edited line).

- [ ] **Step 7: Commit**

```bash
git add ui_kits/extension/v2/screens-mode-select.jsx
git commit -m "$(cat <<'EOF'
fix(mode-select): route active tile text through --utility-surface-elevated

Lines 144 and 220 hardcoded "#fff" as the text color for the
active mode/vault/expression tile, but the background was a live
accent. Routing the text through --utility-surface-elevated makes
the contract explicit (text on filled accent uses the elevated
surface color) and means future token edits propagate. Same fix
shape as commit f644af3 (design-canvas.jsx accent duplication).

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Route `screens-expression.jsx` `#fff` literal through `--utility-surface-elevated`

**Files:**
- Modify: `ui_kits/extension/v2/screens-expression.jsx:32`

- [ ] **Step 1: Verify the current state of the file (baseline)**

```bash
git diff HEAD -- ui_kits/extension/v2/screens-expression.jsx
```

Expected: empty output. (If non-empty, an earlier round changed it; investigate before continuing.)

- [ ] **Step 2: Confirm the target line**

```bash
grep -n 'color: "#fff"' ui_kits/extension/v2/screens-expression.jsx
```

Expected: 1 hit at line 32: `<div key={m.id} style={{ background: m.accent, color: "#fff", padding: 12, ...`.

- [ ] **Step 3: Replace the literal**

```
old:           <div key={m.id} style={{ background: m.accent, color: "#fff", padding: 12, minHeight: 90, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
new:           <div key={m.id} style={{ background: m.accent, color: "var(--utility-surface-elevated)", padding: 12, minHeight: 90, display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
```

- [ ] **Step 4: Verify no `#fff` survives in this file**

```bash
grep -n '"#fff"\|: "#fff"' ui_kits/extension/v2/screens-expression.jsx
```

Expected: empty output.

- [ ] **Step 5: Verify the token is used**

```bash
grep -n 'utility-surface-elevated' ui_kits/extension/v2/screens-expression.jsx
```

Expected: 1 hit (line 32).

- [ ] **Step 6: Commit**

```bash
git add ui_kits/extension/v2/screens-expression.jsx
git commit -m "$(cat <<'EOF'
fix(expression): route color block text through --utility-surface-elevated

Line 32 hardcoded "#fff" as the text color for the B Color-blocks
tile, but the background is the live mode accent (m.accent).
Routing the text through --utility-surface-elevated keeps the
contract identical to the active tile text in mode-select.jsx
(commit <hash-of-Task-1>) and means future token edits propagate.

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>
EOF
)"
```

---

## Phase 2 — Verification

### Task 3: Run the gate and confirm the count delta

**Files:** None modified. Read-only verification.

- [ ] **Step 1: Run the enforcement script and capture the count**

```bash
bash scripts/check-system-invariants.sh 2>&1 | head -1
```

Expected: `System invariant violations: 49` (down from 52 — a delta of −3).

- [ ] **Step 2: Confirm the two target files are no longer in the punch list**

```bash
bash scripts/check-system-invariants.sh 2>&1 | grep -A 10 "Round 2 punch list"
```

Expected: the punch list footer now lists only 2 files (`tweaks-panel.jsx` and `design-canvas.jsx`). `screens-mode-select.jsx` and `screens-expression.jsx` are absent.

- [ ] **Step 3: Confirm no `#fff` literals remain in the bundle outside `tokens.css`**

```bash
grep -rn '"#fff"\|: "#fff"' ui_kits/extension/v2/ --exclude=tokens.css
```

Expected: empty output.

- [ ] **Step 4: Visual verification (browser check)**

Open `ui_kits/extension/v2/index.html` in a browser. The bundle is self-contained — `index.html` references the `.jsx` files inline as `<script type="text/babel">` with React 18 + Babel Standalone loaded from unpkg.

Verification target:
1. Scroll to the `ModeSelect` artboard. The active tile text should be white (or whatever `--utility-surface-elevated` resolves to) on the live accent background.
2. Scroll to the `Expression` artboard. The B · Color blocks tile text should be the same.
3. Open the Tweaks panel, change the accent swatch. The text on both artboards should remain legible across accent changes.

If the text becomes hard to read against a particular accent (e.g., a near-white accent), the live-update path is broken — debug before declaring done. The most common cause: the Tweaks panel writes `--accent` to `documentElement` and a consumer reads from a different scope. Check the Tweaks panel's `setProperty` call site and the consumer's `var(--accent)` call site are both on `documentElement` / its descendants.

- [ ] **Step 5: Confirm the round boundary**

```bash
git log --oneline fix/v2-token-pass-and-ttl..HEAD
```

Expected: 2 commits ahead of Round 1's branch. The 2 commits are the Task 1 commit and the Task 2 commit.

- [ ] **Step 6: Verify the spec's punch-list claim is accurate**

```bash
# Confirm the remaining violations are exactly the Round 3 and Round 4 work
bash scripts/check-system-invariants.sh 2>&1 | tail -10
```

Expected: the punch list footer shows 2 files (`tweaks-panel.jsx` with 22 violations, `design-canvas.jsx` with 27 violations), confirming that Round 2 has fully drained its 3 violations and the remaining 49 belong to Rounds 3 and 4.

---

## Self-Review

**1. Spec coverage:**

| Spec section | Task |
|---|---|
| §Goal — 3 leftover `#fff` literals | Tasks 1, 2 |
| §Scope — `screens-mode-select.jsx:144,220` | Task 1 |
| §Scope — `screens-expression.jsx:32` | Task 2 |
| §Out of Scope — Rounds 3-4 deferred | Implicit (no task) |
| §Token Choice — `--utility-surface-elevated` | Tasks 1, 2 (no new tokens needed) |
| §Branch & Commits — 2 commits | Tasks 1, 2 |
| §Acceptance #1 (line-level grep) | Task 1 Step 5, Task 2 Step 4 |
| §Acceptance #2 (bundle-level grep) | Task 3 Step 3 |
| §Acceptance #3 (script count delta) | Task 3 Step 1 |
| §Acceptance #4 (visual) | Task 3 Step 4 |
| §Acceptance #5 (punch list shrink) | Task 3 Step 2 |
| §Round Boundaries — 3 + 22 + 27 split | Task 3 Step 6 |
| §References — Round 1 spec/plan, branch base | Implicit (no task) |

**Gap:** none. Every spec section has a corresponding task or step.

**2. Placeholder scan:**

No "TBD" / "TODO" / "implement later" / "similar to Task N" / "fill in details." Every edit step shows the actual `old_string` and `new_string` content. The plan references only types, functions, and tokens that exist in the codebase (`--utility-surface-elevated` is in `tokens.css:58`, the `setProperty` call site referenced in Step 4 is in `tweaks-panel.jsx`).

**3. Type / property name consistency:**

- `--utility-surface-elevated` — same name used in Tasks 1, 2 (the edits) and the spec. ✓
- The `#fff` literal pattern `color: active ? "#fff" : "var(--ink-2)"` — matches both lines 144 and 220. The line-220 edit has different indentation (deeper nesting); the plan accounts for this by saying "Match the literal text on each line, including the leading whitespace." ✓
- The `color: "#fff"` pattern in `screens-expression.jsx:32` — unique in the file. ✓
- Commit hash placeholder `<hash-of-Task-1>` in Task 2's commit message is intentional — fill it in at commit time with the actual hash from `git log -1 --format=%H`. ✓
- The shell-script line `System invariant violations: 49` is the literal expected output the script prints (the script's first output line is `System invariant violations: <count>`). ✓

**4. Other consistency checks:**

- Branch base: `fix/v2-token-pass-and-ttl`. The plan creates `fix/v2-round-2-fff-untouched` off this branch. ✓
- Commit count: 2. Spec says 2. ✓
- The Task 1 commit message references `f644af3` (the design-canvas.jsx fix from Round 1, commit hash). If the hash changes in your checkout, run `git log --oneline -- ui_kits/extension/v2/design-canvas.jsx` to find the actual hash. ✓
- The Task 2 commit message has a placeholder `<hash-of-Task-1>`. Fill in at commit time. ✓

No fixes needed.

---

## Plan-End Checklist (Manual)

The plan is **done** when, in addition to the 2 task commits, the contributor produces one more artifact:

- [ ] **Screenshot of `ModeSelect` and `Expression` artboards** in the imported OD project, with the Tweaks panel open and the accent set to a non-default value. The screenshot must show:
  - Active tile text on `ModeSelect` is white (or whatever `--utility-surface-elevated` resolves to) on the live accent.
  - Color block text on `Expression` (B · Color blocks) is the same.
  - The Tweaks panel's accent swatch and the text on both artboards in the same non-default color (proves the live update path).

If the text and the accent background are visually *unreadable* (low contrast), the live update path is broken — debug before declaring done. The most common cause: the Tweaks panel writes `--accent` on `documentElement` and a consumer reads from a different scope. Check the Tweaks panel's `setProperty` call site and the consumer's `var(--utility-surface-elevated)` (which is static — should always resolve correctly) and `var(--accent)` call site are both on `documentElement` / its descendants.

## Hand-off to Round 3

Round 3's input is:
1. Round 2's 2 commits (the delta from this round).
2. The 22 violations in `tweaks-panel.jsx` (the text-color literals `rgba(41,38,27,*)` at 5 distinct alphas, plus the 17 out-of-scope alpha overlays at `.1`, `.18`, `.2`, `.5`, `.55`, `.6`, `.72`, `.78`, `.85`, `.88`).
3. The need for a new `--ink-text-{NN}` token family (or equivalent) — this is the architectural decision Round 3's spec should make.

Round 3 applies the same fix-and-document shape: identify the new token family, write a system-rules header amendment, route consumers, run the gate, commit.
