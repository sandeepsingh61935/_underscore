# v2 Wireframes — Round 2: 3 Leftover `#fff` Literals in Untouched Files

> Round 2 of the v2 wireframe critique. Round 1 (commit `4cf205a` … `d5b8b66`) shipped the token registry, fixed the accent duplication bug, restructured `Home_Ephemeral`, and added the `scripts/check-system-invariants.sh` gate. Round 2 picks the smallest remaining class of violations from the script's punch list.

## Goal

Route 3 leftover `#fff` text-color literals through the existing `--utility-surface-elevated` token, eliminating the same bug class Round 1 fixed in `design-canvas.jsx:35,38` (consumer hardcoded where a token existed, so the live accent picker could not influence them).

## Scope

**3 lines in 2 files:**

| File | Line | Current | After |
|---|---|---|---|
| `ui_kits/extension/v2/screens-mode-select.jsx` | 144 | `color: active ? "#fff" : "var(--ink-2)",` | `color: active ? "var(--utility-surface-elevated)" : "var(--ink-2)",` |
| `ui_kits/extension/v2/screens-mode-select.jsx` | 220 | `color: active ? "#fff" : "var(--ink-2)",` | `color: active ? "var(--utility-surface-elevated)" : "var(--ink-2)",` |
| `ui_kits/extension/v2/screens-expression.jsx` | 32 | `color: "#fff",` | `color: "var(--utility-surface-elevated)",` |

All three sites are text rendered on top of a solid colored background (live accent or live mode color). The contract: text on a filled accent uses the elevated surface color for legibility.

## Out of Scope (deferred to later rounds)

- **22 violations in `tweaks-panel.jsx`** — text-color literals `rgba(41,38,27,*)` at 5 distinct alphas (`.45`, `.5`, `.55`, `.6`, `.72`) and out-of-scope alpha overlays (`.1`, `.18`, `.2`, `.5`, `.78`, `.85`, `.88`, `.6`). Round 3 will introduce a new `--ink-text-{NN}` token family.
- **27 violations in `design-canvas.jsx`** — artboard palette (`DC.bg`, `DC.label`, `DC.title`, `DC.subtitle`, `DC.postitText`) and modal/viewer chrome. Round 4.
- **Replacing `scripts/check-system-invariants.sh` with stylelint** — Round 5+, when the wireframe bundle is ported to a real build system.
- **Visual design changes** — no new screens, no layout changes, no tweaks to the wireframe aesthetic.
- **Porting wireframes to `src/`** — production-app track, different spec.

## Token Choice

`var(--utility-surface-elevated)` was defined in Round 1 (`tokens.css:58`). It resolves to `#fff` in both light and dark mode (the `.dark` block at line 93 does not override it, which is intentional — text on the live accent is `#fff` regardless of theme because the accent itself is the same in both modes).

Routing through the token rather than the literal makes the contract explicit and theme-able for future rounds. No new tokens are introduced in Round 2.

## Branch & Commits

**Branch:** `fix/v2-round-2-fff-untouched`, based on `fix/v2-token-pass-and-ttl` (Round 1's branch). This keeps Round 1's 6 commits as the base; if you want Round 2 as a standalone PR off `main` or `dev`, rebase before opening the PR.

**Commits (2):**

1. `fix(mode-select): route active tile text through --utility-surface-elevated` — edits `screens-mode-select.jsx` lines 144 and 220 in one commit (same file, same fix pattern).
2. `fix(expression): route color block text through --utility-surface-elevated` — edits `screens-expression.jsx` line 32.

Round 1 had 6 commits because it touched 4 files + 1 new script. Round 2 touches 2 files with no new artifacts, so 2 commits.

## Acceptance

1. **Line-level:** `grep -n '"#fff"' ui_kits/extension/v2/screens-mode-select.jsx ui_kits/extension/v2/screens-expression.jsx` returns 0 hits.
2. **Bundle-level:** `grep -rn '#fff' ui_kits/extension/v2/` returns hits only in `tokens.css` (the `--utility-surface-elevated` definition and `--paper-2` related tokens, depending on the file's other content).
3. **Script gate:** `bash scripts/check-system-invariants.sh` reports a violation count of 49 (down from 52 — a delta of −3).
4. **Visual:** Open `ui_kits/extension/v2/index.html` in a browser. On the `ModeSelect` and `Expression` artboards, change the Tweaks accent swatch and confirm the active tile text and color block text remain legible. Same browser check Round 1 used.
5. **Punch list shrink:** the script's per-file summary now lists only 2 files (`tweaks-panel.jsx`, `design-canvas.jsx`) — `screens-mode-select.jsx` and `screens-expression.jsx` drop out.

## Round Boundaries

The plan-end hand-off of Round 1's spec said "Round 2 picks 2–3 items." The punch list had 3 distinct work classes:

| Work class | Violations | Round |
|---|---|---|
| `#fff` on active tile text (same bug class as Round 1) | 3 | **Round 2 (this spec)** |
| `rgba(41,38,27,*)` text colors + out-of-scope alpha overlays in `tweaks-panel.jsx` | 22 | Round 3 (new token family) |
| Artboard palette + modal/viewer chrome in `design-canvas.jsx` | 27 | Round 4 (largest, most architectural) |

The per-round split keeps each round reviewable in a single diff and each commit stream cohesive (one fix shape per round).

## References

- Round 1 spec: `docs/superpowers/specs/2026-06-02-v2-token-pass-and-ttl.md` (commit `9668e9d`)
- Round 1 plan: `docs/superpowers/plans/2026-06-02-v2-token-pass-and-ttl.md` (commit `5d19c17`)
- Round 1 commits: `4cf205a` … `d5b8b66` on branch `fix/v2-token-pass-and-ttl`
- Token registry: `ui_kits/extension/v2/tokens.css:1-103`
- Gate: `scripts/check-system-invariants.sh`
