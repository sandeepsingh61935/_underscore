# Spec: Inline Notes | Tags Marginalia Band

**Date:** 2026-07-14  
**Status:** Ready for implementation  
**Scope:** `MarginaliaStrip` expanded + collapsed layout (UI only; save/IPC unchanged)  
**Mockup:** `~/.cursor/projects/home-sandy-projects-underscore/canvases/marginalia-inline-notes-tags.canvas.tsx`

## Goal

Keep notes and tags in the **same highlight item** on one visual band: Notes (flex) | Tags (hug), optimally using horizontal space, wrapping tags under notes when crowded.

## Locked decisions (grilling)

| # | Decision |
|---|----------|
| 1 | One row, two segments: Notes \| Tags |
| 2 | Notes flex; Tags hug |
| 3 | Tags wrap under Notes (same strip) when crowded |
| 4 | Notes: single-line at rest; grow vertically on focus/overflow |
| 5 | Add-tag input inline after chips |
| 6 | Collapsed mirrors expanded band |
| 7 | No NOTE header row; Done/Saving folded into tray, **top-right** |
| 8 | One shared bordered tray (gap only between segments; no vertical hairline) |
| 9 | Empty: keep dashed `+ Add note or label` invite |
| 10 | Done/Saving always top-right of tray when band reflows |

## Out of scope

- Search-chip exclusive selection (already shipped)
- Tag library / repository / IPC changes
- Changing save debounce, dirty-guard, or accordion expand ownership

## Visual contract

### Empty (`!isExpanded && !hasContent`)
- Unchanged: dashed invite button, copy `+ Add note or label`

### Collapsed (`!isExpanded && hasContent`)
- Accent left rule + `paper-2` strip (unchanged shell)
- **Inside:** one shared bordered tray (`paper` fill, `rule-soft` border)
  - Left: note preview (italic, ellipsis / clamp), flex grow
  - Right: readonly `TagPill`s (hug) + trailing `Edit`
  - Tags may wrap under the note inside the tray

### Expanded (`isExpanded`)
- Same outer strip shell (accent rule + `paper-2`)
- **No** uppercase `NOTE` header row
- One shared bordered tray:
  - `position: relative`; `padding-right` reserved for Done/Saving
  - **Notes (flex):** auto-growing single-line `textarea` (or equivalent), placeholder `What stood out?`, never disabled by `isSaving`
  - **Tags (hug):** `LabelInputRow` embedded **without its own border/padding tray** — pills + draft input + ghost suggestions wrap in-segment
  - **Done** / **Saving…**: absolutely positioned top-right of the tray
- When tags overflow, they wrap to a second line **under** notes, still inside the same tray

## Component changes

### `LabelInputRow`
- Add optional `variant?: 'tray' | 'embedded'` (default `'tray'` preserves current bordered row for any other callers)
- `embedded`: no outer border/background/minHeight padding — pure flex-wrap content for use inside Marginalia's shared tray
- Behavior (Enter/comma, ghosts, draft contract) unchanged

### `MarginaliaStrip`
- Collapsed + expanded layouts match the visual contract above
- File header comment updated to reference this spec + canvas (not stacked textarea/header)

### Wireframe
- Update `ui_kits/extension/v2/primitives.jsx` `MarginaliaStrip` expanded/collapsed to the inline band

## TDD seams (confirmed for this work)

1. **`MarginaliaStrip` public UI** — observable via Testing Library roles/labels/text:
   - Empty invite still present
   - Expanded: **no** `Note` header label; Done/Saving present; notes control + Add label input share one bordered ancestor
   - Collapsed: note + tags + Edit in one tray; no stacked “note above tags-only row” requiring a separate tags-only box
   - Saving still shows `Saving…` and does **not** disable the notes control
2. **`LabelInputRow` `embedded` variant** — no own `border` when embedded; still commits on Enter and shows ghosts

## Non-goals for tests

- Exact pixel widths / flex basis numbers
- Auto-grow character thresholds (assert control exists and can receive multi-line input; not scrollHeight math)
- Full popup view integration

## Acceptance checklist

- [x] Empty invite unchanged
- [x] Expanded: shared tray; no NOTE header; Done top-right
- [x] Expanded: notes + tags on one band; tags wrap under when many
- [x] Collapsed: mirrors Notes | Tags tray
- [x] LabelInputRow default tray still works; embedded used by Marginalia
- [x] Existing save/debounce/dirty-guard behavior preserved
- [x] Wireframe updated
- [x] Unit tests at seams above green
