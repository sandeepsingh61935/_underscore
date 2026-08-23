# PRD: Highlight Edit Format Tools (Restore Edit, Kill Presentation Chips)

**Date:** 2026-07-20  
**Status:** In progress (implementation landed with this PRD)  
**Triage:** `ready-for-agent` (local spec only — `gh` unavailable; not published to issue tracker)  
**Scope:** Collections highlight tile Edit surface — action row, markdown format toolbar, text persistence IPC  
**Supersedes (UI only):** Always-visible `metadata.presentation` chips from `feat(library): immutable quotes with presentation format tools`  
**Related:** `2026-07-14-highlight-markdown-body-design.md`, `2026-07-14-highlight-tile-editor-density-prd.md`, `2026-07-14-marginalia-inline-notes-tags-design.md`

---

## Problem Statement

Highlight tiles temporarily replaced the **Edit** control with four always-visible presentation chips (**As captured · Code · Bullets · Numbered**). That broke the unified action row contract and confused two different ideas:

1. **Curating the quote body** (markdown source the user owns in Collections).
2. **Non-destructive display modes** (metadata that restyles the same stored text).

Users lost the ability to open the markdown editor. The chips used product jargon ("As captured"), took permanent vertical space on every tile, and did not match V2 wireframes or the density PRD (notes · tags · **Edit** · Copy · Delete).

## Solution

Restore a single clear model:

**Read surface**

- Rendered markdown quote (clamped).
- Domain/path meta.
- One action row: notes/invite · tags · **Edit** · Copy · Delete.
- No presentation chips. No "As captured".

**Edit surface (Collections only, when save is wired)**

- Compact markdown **format toolbar** that **writes into the draft** (not a parallel display mode):
  - **B** bold · **I** italic · **Code** inline · **List** bullets · **1.** numbered · **Fence** code fence + pretty-print
- Markdown source textarea + live preview + shortcut cheat-sheet.
- Action row swaps to **Save / Cancel**; notes/tags stay on the row.
- Keyboard: `Ctrl/Cmd+B` / `I` / `E` / `Shift+K` (fence; `Shift+C` alias when host allows).

**Display defaults (no chip UI)**

- Captures with `sourceKind: code` may still render as code via existing display helpers.
- Legacy `metadata.presentation` may still affect render if already stored; there is **no UI to set it**. New curation goes through markdown body edit.

**Persistence**

- Save persists highlight **text** only (body). Does not rewrite ranges / TextQuote selectors.
- Notes/tags remain on the metadata channel.

## User Stories

1. As a Collections curator, I want an **Edit** button on the highlight action row, so I can open the body editor.
2. As a curator, I do not want **As captured / Code / Bullets / Numbered** chips on the closed tile, so the list stays dense and scannable.
3. As a curator in Edit, I want **B / I / Code** tools that wrap my selection in markdown markers, so I do not type asterisks and backticks by hand.
4. As a curator in Edit, I want a **List** tool that prefixes selected lines with `- `, so multi-line captures become bullet lists.
5. As a curator in Edit, I want a **1.** tool that prefixes selected lines with `1. 2. 3.`, so ordered lists are one click.
6. As a curator in Edit, I want list tools to toggle off when lines are already list-prefixed, so I can undo a mistaken apply.
7. As a curator in Edit, I want a **Fence** tool that wraps selection in a code fence and pretty-prints flattened code, so web-captured snippets become readable.
8. As a curator, I want the same transforms available via keyboard shortcuts while the textarea is focused, so power users stay on the keyboard.
9. As a curator, I want a short cheat-sheet under the textarea, so I know which chords work.
10. As a curator, I want a live **Preview** of the draft markdown, so I see bold/lists/fences before Save.
11. As a curator, I want **Save** to persist the draft body and exit Edit, so my curation is stored.
12. As a curator, I want **Cancel** to discard the draft and exit Edit without calling save, so accidents are cheap.
13. As a curator, I want notes/tags to remain on the action row while Save/Cancel replace Edit/Copy/Delete, so metadata context stays visible.
14. As a popup dashboard user, I want rendered quotes **without** Edit or format tools, so the small shell stays simple.
15. As a Guest or read-only surface, I want no empty hole reserved for Edit when save is not provided, so layout does not look broken.
16. As a reader of code captures, I want code blocks to still look like code when capture metadata says so, without needing a chip on every tile.
17. As a searcher, I want library search to match the stored markdown source after I edit lists/fences, so reformatted text remains findable.
18. As an exporter, I want export/copy to use the curated markdown body, so what I edited is what leaves the app.
19. As a page visitor, I want body edit to never rewrite `ranges[].selector.exact`, so in-page re-anchoring still works.
20. As a designer matching V2 Editorial, I want format tools and actions to use semantic tokens only (`--paper`, `--ink`, `--accent`, `--rule`, `--mono`), with no Tailwind or legacy tokens.
21. As a QA engineer, I want tests that assert Edit is present, chips are absent on read, toolbar appears only in Edit, and toolbar bold/list writes markdown into the draft.
22. As an implementer, I want pure wrap/list helpers shared by toolbar buttons and keyboard shortcuts, so both paths cannot drift.
23. As a web Collections user sharing HighlightCard, I want the same Edit + toolbar behavior, so extension and web do not fork.
24. As a curator who opened Edit by mistake, I want Cancel to restore the previous quote immediately, so density and content snap back.
25. As a product owner, I want one mental model — "Edit changes the quote markdown" — so we do not ship dual systems (body edit + display modes) as first-class equals.

## Implementation Decisions

- **Action row (read):** notes/invite · tags · Edit · Copy · Delete (pinned right). Unchanged density rules from the tile density PRD (no 44px min-height on text actions; asymmetric card pad).
- **Action row (edit):** notes/tags remain; Edit/Copy/Delete → Save / Cancel.
- **Format toolbar:** only mounted while `editing === true`. Labels: `B`, `I`, `Code`, `List`, `1.`, `Fence` (mono, uppercase, `--rule-soft` chips — tools, not exclusive mode pills).
- **Format semantics:** all tools call shared pure helpers that return a new draft string + selection range. They **mutate the edit draft**, not `metadata.presentation`.
- **Remove from UI:** `onPresentationChange` chip row; labels "As captured", presentation mode pills on the closed card.
- **Keep for display:** optional `presentation` / `sourceKind` / `language` props into the markdown body renderer for legacy rows and code captures.
- **Persistence:** restore `UPDATE_HIGHLIGHT_TEXT` channel and Collections hook to save body text; validate length/emptiness before write; notify library data changed; do not touch selectors.
- **Composition:** library tile owns save wiring so views pass highlight fields only.
- **Popup dashboard:** continues to render HighlightCard without `onSaveQuote` (read-only).
- **No schema migration required** for this PRD. Existing `metadata.presentation` may remain inert-from-UI.
- **Future (out of this PRD):** optional single "Display as" control if immutability advocates return — not both chip row and free edit as peers.

## Testing Decisions

Good tests assert **external behavior** through the card/tile public UI and pure helpers — not internal React state names.

**Seams (preferred, highest practical):**

1. **HighlightCard UI** — role/name queries: Edit visible when save provided; no format toolbar / no "As captured" on read; after Edit, toolbar present; Bold tool changes textarea value; Save calls `onSaveQuote` with draft; Cancel does not.
2. **LibraryHighlightTile** — Edit present; Save routes to text-update hook (mock at hook boundary already used in tile tests).
3. **markdown-wrap pure module** — bold/italic/code/fence regressions; new bullet/numbered apply + toggle; `applyMarkdownFormatAction` routes.
4. **HighlightWithMarginalia / unified row** — invite + Edit + Copy + Delete on one row; no format toolbar until Edit.

**Prior art:** existing `HighlightCard.test.tsx`, `markdown-wrap.test.ts`, `library-highlight-tile.test.tsx`, `highlight-with-marginalia.test.tsx`.

**Avoid:** asserting presentation metadata IPC from format tools; snapshotting full inline style strings beyond density contracts already locked.

## Out of Scope

- Removing `metadata.presentation` from schema/storage or backfilling old rows.
- WYSIWYG / contenteditable editor.
- Syntax highlighting colors in preview.
- New markdown features (tables, images, footnotes).
- Changing capture pipeline or TextQuote selectors.
- Popup dashboard Edit.
- AI rewrite of quotes.
- Mobile-specific touch redesign of the toolbar (min targets may stay compact list-row style consistent with Edit/Copy/Delete).

## Further Notes

- Root cause of the regression: "immutable quotes + presentation tools" replaced Edit instead of nesting tools **inside** Edit (and then presentation tools were the wrong abstraction for lists/code anyway).
- Preferred product language: **Original** (if ever needed) not "As captured"; prefer no label when default.
- Fence shortcut remains **Ctrl/Cmd+Shift+K** primary because Chrome steals Ctrl+Shift+C for Inspect in extension contexts.
- Wireframe reference still `ui_kits/extension/v2/primitives.jsx` HighlightCard (Edit affordance); format toolbar is an Edit-mode extension of the density PRD, not a second chrome band on read.
