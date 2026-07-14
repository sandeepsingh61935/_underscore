# PRD: Highlight Tile Editor UX, Unified Action Row, and Density

**Date:** 2026-07-14  
**Status:** Ready for implementation  
**Triage:** `ready-for-agent` (local spec only — `gh` unavailable; not published to issue tracker)  
**Scope:** Collections highlight tile (extension popup + web when sharing the same card), markdown editor affordances, code-block chrome, single action row, vertical density  
**Baseline (already shipped):** markdown body render + Collections edit/save (`HighlightMarkdownBody`, `UPDATE_HIGHLIGHT_TEXT`), inline Notes|Tags marginalia band  
**Mockups (PNG + HTML):** `docs/mockups/highlight-markdown-editor-ux/`  
**Cursor canvases:** `highlight-markdown-editor-ux.canvas.tsx`, `highlight-quote-format.canvas.tsx`, `marginalia-inline-notes-tags.canvas.tsx`  
**Related specs:** `2026-07-14-highlight-markdown-body-design.md` (v1 implemented), `2026-07-14-marginalia-inline-notes-tags-design.md`

---

## Problem Statement

Highlight tiles still waste attention and space in three ways:

1. **Editor is underpowered.** Markdown edit exists as a plain textarea, but Obsidian-style shortcuts do not work. Wrapping flattened programming code (common after web capture) requires hand-typing fences and manual pretty-print. Rendered code blocks lack a ChatGPT-like panel with per-block Copy of the inner code.

2. **Chrome is split.** Notes, tags, Edit, Copy, and Delete live on separate bands (card meta row + MarginaliaStrip). Users experience two UIs on one tile and more vertical chrome than content.

3. **Bottom gap is structural.** Inline Edit/Copy/Delete use a 44px min-height (appropriate for full-width primary buttons, not list-row text actions). Combined with comfortable card bottom padding, strip margin under every tile, double chrome, and trailing markdown paragraph margin, short quotes sit in tall empty cells. In a 400×600 popup list, only ~2 tiles are scannable where ~3.5–4 should fit.

Users need the tile to **read well** (markdown + code), **edit quickly** (shortcuts + fence+pretty), and **pack densely** without shrinking quote type size.

---

## Solution

Ship one cohesive highlight-tile UX pass:

1. **Markdown editor v2** — native selection shortcuts (`Ctrl/Cmd+B` / `I` / `E` / `Shift+C`), fence wrap that pretty-prints flattened code, empty-selection inserts markers/empty fence.
2. **Code block chrome** — rendered fences show mono panel, optional language label, **Copy** = inner code only (no syntax highlighting, no default language on wrap).
3. **Unified single action row** — under the quote (and domain meta): notes/invite · tags · Edit · Copy · Delete on one baseline. Edit mode swaps Edit/Copy/Delete for Save/Cancel; notes/tags remain on the row.
4. **Density rules** — drop 44px min-height on inline actions; asymmetric card pad (≈10–12 top / 8 bottom); kill separate strip bottom margin when unified; collapse last markdown block margin; domain → action row gap ≤ 6px.

Capture path, anchor selectors, markdown subset, and Collections-only edit surface stay as locked in the markdown-body v1 spec.

---

## User Stories

1. As a curator in Collections, I want `Ctrl/Cmd+B` to wrap my selection in bold markers, so I can emphasize without typing asterisks.
2. As a curator, I want `Ctrl/Cmd+I` to wrap selection in italic markers, so emphasis matches Obsidian habit.
3. As a curator, I want `Ctrl/Cmd+E` to wrap selection in inline code backticks, so identifiers stay monospaced.
4. As a curator, I want `Ctrl/Cmd+Shift+C` to wrap a selection in a fenced code block, so programming snippets become readable.
5. As a curator wrapping flattened C++/Java from a webpage, I want fence wrap to **pretty-print** braces/semicolons into indented lines, so I do not reformat by hand.
6. As a curator with no selection, I want fence shortcut to insert an empty fence pair with the cursor inside, so I can paste or type code immediately.
7. As a curator with no selection, I want bold/italic/inline-code shortcuts to insert empty markers with the cursor between them, so I can type the content next.
8. As a curator, I want plain ` ``` ` fences by default (no language auto-tag), so I can type `cpp` myself when I care.
9. As a reader, I want fenced code to render in a mono panel with a language label when present (else “code”), so blocks are visually distinct from prose.
10. As a reader, I want a **Copy** control on each code block that copies **inner code only**, so I can paste into an IDE without fence markers.
11. As a reader, I do not want syntax highlighting colors in v1, so rendering stays fast and on-token.
12. As a reader of long quotes, I want ~4-line clamp with Show more / Show less on rendered markdown, so lists stay scannable.
13. As a curator, I want Edit to open source markdown + live preview with a shortcut cheat-sheet, so I know what works.
14. As a curator, I want Save to persist only highlight `text` and Cancel to discard the draft, so anchors stay safe.
15. As a popup dashboard user, I want the same rendered markdown (clamped) without Edit, so the small shell stays simple.
16. As a Collections user, I want **Add note or label**, tags, **Edit**, **Copy**, and **Delete** on **one row** under the quote, so the tile feels like one unit.
17. As a Collections user with a note and tags, I want the note to truncate left and tags to hug before actions, so the row does not wrap into a second UI band by default.
18. As a Collections user with no note/tags, I want a dashed invite on that same row as Edit/Copy/Delete, so I do not get an empty second strip.
19. As a curator in edit mode, I want notes/tags to stay visible on the action row while Save/Cancel replace Edit/Copy/Delete, so metadata context remains while I reformat the body.
20. As a user scanning a section list, I want short highlights to use minimal bottom chrome, so more tiles fit in the popup viewport.
21. As a user, I want inline Edit/Copy/Delete hit targets to stay tappable (~28–32px via padding) without a full 44px empty band under every quote.
22. As a user, I want card vertical padding to favor content (asymmetric top/bottom) with the tile border as the separator, so lists do not look airy.
23. As a user, I want no dedicated strip margin under every tile once notes live on the action row, so stacked cards are tight.
24. As a reader, I want the last markdown paragraph not to leave a trailing 10px gap above the action row, so whitespace follows content.
25. As a page visitor, I want reformatting highlight `text` to never rewrite `ranges[].selector.exact`, so in-page re-anchoring still works.
26. As a searcher, I want library search to match the stored markdown source (including fence contents), so reformatted code remains findable.
27. As an exporter, I want export/copy of the card body to use curated markdown source sensibly, so fences are not double-escaped.
28. As a Basic or Pro user with collections, I want the same edit and density behavior whenever I can mutate library fields, so modes do not fork the tile layout.
29. As a Guest user without library edit, I want read-only dense rendering without broken empty action holes, so the tile does not reserve space for missing controls incorrectly.
30. As a web Collections user (when sharing HighlightCard), I want the same unified row and density rules, so extension and web do not drift.
31. As a keyboard user, I want shortcuts to work only while the markdown source textarea is focused, so they do not steal browser or popup shortcuts elsewhere.
32. As a curator on a long code selection that is already multi-line with indentation, I want pretty-print to leave it alone, so existing formatting is not destroyed.
33. As a designer matching V2 Editorial, I want code chrome and action row to use semantic tokens (`--paper`, `--ink`, `--accent`, `--rule`, `--mono`, `--serif`) with no Tailwind or legacy tokens.
34. As a QA engineer, I want unit tests on wrap helpers, shortcuts, code Copy payload, and density-related layout contracts, so regressions on empty air and broken Ctrl+B are caught.
35. As an implementer, I want pure wrap/pretty-print helpers testable without the DOM, so keyboard and button paths share one implementation.
36. As a user of domain/library search hit cards, I want the same tile chrome as section drill-down (minus edit if not provided), so formatting is consistent.
37. As a user expanding Show more, I want the action row to stay below the full body, so controls do not jump into the quote.
38. As a user who accidentally opens Edit, I want Cancel to restore the previous source without saving, so density and metadata are unchanged.
39. As a support engineer, I want failure toasts on Save to keep the user in edit mode with draft intact, so network blips do not discard work.
40. As a product owner, I want this PRD to supersede ad-hoc canvas-only decisions for editor shortcuts, unified row, and density while keeping markdown-body v1 subset and persistence contracts.

---

## Implementation Decisions

### A. Baseline (do not re-litigate)

- Highlight `text` is markdown source after user edit; capture still writes plain text with **no silent rewrite**.
- Allowed subset: paragraphs/soft breaks, bold, italic, inline code, fenced code, lists, https-only links. No headings/tables/HTML/images.
- Edit only on Collections when save capability is provided; popup/dashboard read-only render.
- Persist via existing update-text path only; **never** mutate range selectors / `selector.exact`.
- Clamp ~4 lines + Show more on read; full source + full preview in edit.

### B. Markdown editor shortcuts and fence wrap

| Decision | Choice |
|----------|--------|
| Shortcut set | `Ctrl/Cmd+B` bold, `I` italic, `E` inline code, `Shift+C` fence+pretty |
| Selection present | Wrap selection with markers / fence |
| No selection | Insert empty markers or empty fence; cursor inside |
| Fence language | Plain ` ``` ` (no default language) |
| Pretty-print | Yes on fence wrap of a non-empty selection; lightweight brace/semicolon heuristic; skip if selection already multi-line with indentation |
| Implementation seat | Pure helpers + keydown on source textarea (not canvas-only) |

Prototype decision shape (from canvas helper — behavior contract, not paste-as-prod):

```text
wrapSelection(text, start, end, before, after)
  → empty selection: insert before+after, cursor between
  → else: wrap selected span, keep selection on inner content

fenceWrapPretty(text, start, end)
  → empty: insert ```\n\n```, cursor on inner line
  → else: prettyPrintCode(selected) then wrap in ```\n...\n```
```

### C. Code block chrome (read + live preview)

| Decision | Choice |
|----------|--------|
| Panel | Mono body, light panel, top bar |
| Label | Fence language if present, else “code” |
| Copy | Inner code only |
| Highlighting | None in this PRD |

### D. Unified single action row

| Decision | Choice |
|----------|--------|
| Row contents (read) | Notes/invite (flex) · tags + Add… (hug) · Edit · Copy · Delete (pinned right) |
| Empty notes/tags | Dashed `+ Add note or label` on the same row — no second strip |
| Domain meta | Above the action row (or under quote), not competing with actions on a separate tall meta band |
| Edit mode | Notes/tags remain; actions become Save / Cancel |
| Expand notes/tags | Expanding the invite may grow the row (multiline note) but must not reintroduce a separate MarginaliaStrip margin band under the card |
| Composition | Prefer one visual unit (HighlightCard + integrated marginalia) over two independently padded children |

### E. Density (kill bottom waste)

| Source today | Fix |
|--------------|-----|
| Inline action `minHeight: 44` | Remove for list-row actions; use padding for ~28–32px hit area. Keep 44px for primary full-width buttons elsewhere |
| Card padY 14 bottom (comfortable) | Asymmetric ≈10–12 top / 8 bottom |
| Strip `margin-bottom: 8` on every tile | 0–4px when unified; tile `border-bottom` separates items |
| Double chrome (meta + strip) | Single action row |
| Last markdown `p` margin 10 | `:last-child { margin-bottom: 0 }` (or equivalent) |
| Domain → actions | Gap ≤ 6px |

Target: short-quote chrome roughly **~28–36px** under content instead of **~70–90px**. List goal in 400×560 body: ~3.5–4 short tiles visible vs ~2.2 today (mock 08).

### F. Modules / seams (product-level)

| Module | Change |
|--------|--------|
| Markdown body renderer | Code block chrome + Copy; last-child margin collapse; keep clamp |
| Highlight card | Shortcuts in edit textarea; integrate or host action row; density padding; no 44px inline actions |
| Marginalia / notes-tags | Fold into single row with tile actions; preserve save debounce, dirty-guard, expand ownership semantics |
| Wrap/pretty helpers | New pure util (shared) used by card keydown and any toolbar buttons |
| Wireframe | Update V2 primitives HighlightCard / marginalia notes to match unified dense tile |
| Export/copy | Card Copy stays source markdown; code-block Copy is inner only (distinct) |

Do not introduce a second stored body field (`displayText` vs `anchorText`) in this PRD.

### G. Security

Unchanged from markdown-body v1: restricted render, https-only links, no raw HTML, sanitize if HTML path is used.

---

## Testing Decisions

**Good tests** assert external behavior users can observe (keyboard outcomes, clipboard payload, visible structure, save/cancel), not flex pixel values or private CSS class names.

### Preferred seams (highest first)

1. **Pure wrap / pretty-print helpers** — string in, string + selection range out. Covers bold/italic/code/fence, empty selection, already-pretty skip.
2. **HighlightMarkdownBody / code chrome** — fence renders panel; Copy copies inner code only; https link policy; clamp Show more; last block has no trailing margin contract if exposed via DOM structure.
3. **Highlight card edit keyboard** — with Testing Library: type/select in markdown field, fire keydown modifiers, assert source value. Save/Cancel still call existing save seam.
4. **Unified tile composition** — one unit shows invite or note+tags on the same row as Edit/Copy/Delete (query by role/name); no second “orphan” empty strip when notes empty.
5. **Existing hooks/IPC** — reuse `useUpdateHighlightText` / update-text tests; do not re-test repository internals unless contract changes.
6. **Marginalia save behavior** — preserve dirty-guard and debounce tests; adapt selectors if DOM moves into the card row.

### Prior art

- `tests/unit/ui/highlight-markdown-body.test.tsx`
- `tests/unit/ui/HighlightCard.test.tsx` / primitives HighlightCard tests
- `tests/unit/features/collections/marginalia-strip.test.tsx`
- `tests/unit/features/collections/use-update-highlight-text.test.ts`

### Explicit non-goals for tests

- Exact flex basis or pixel widths of tag wrap
- Visual regression screenshots required for merge (PNG mockups are design truth, not CI)
- Pretty-print producing AST-perfect C++ (heuristic only)

---

## Out of Scope

- WYSIWYG / contenteditable editor
- Syntax highlighting (Prism/Highlight.js)
- Default language on fence wrap
- Capture-time DOM structure → newline injection (follow-up)
- Silent rewrite of historical flat captures into markdown
- Notes/tags as full markdown documents
- Headings, tables, task lists, images, raw HTML
- Changing highlight anchor / range model
- New Supabase columns or dual body fields
- Full-width primary button 44px min-height policy elsewhere in the app
- Search bar layout (already handled separately)
- Auth, MCP, AI settings work unrelated to the tile

---

## Further Notes

### Design artifacts (authoritative for this PRD)

| File | Content |
|------|---------|
| `docs/mockups/highlight-markdown-editor-ux/01-edit-flat-before.png` | Flat C++ selection before wrap |
| `…/02-edit-after-fence-pretty.png` | Fence + pretty-print + live preview |
| `…/03-read-code-chrome.png` | Code panel + Copy inner only |
| `…/04-shortcuts-bold-italic.png` | Select → shortcut → preview |
| `…/05-tile-single-row-actions.png` | Unified row empty / filled / edit |
| `…/06-tile-compare-before-after.png` | Two-band vs one-row |
| `…/07-tile-density-no-waste.png` | Waste audit + density rules |
| `…/08-tile-list-density-stack.png` | Popup list density before/after |

HTML sources sit beside each PNG for deterministic re-export.

### Relationship to prior specs

- **Markdown body v1** remains the render/persist contract; this PRD is the **editor + chrome + layout density** follow-up.
- **Marginalia inline Notes|Tags** remains the notes/tags interaction model; this PRD **relocates** that band onto the same baseline as tile actions and removes bottom waste.

### Implementation order (suggested)

1. Pure wrap/pretty helpers + tests  
2. Editor shortcuts on HighlightCard textarea  
3. Code block chrome + Copy on renderer  
4. Unified action row composition + marginalia integration  
5. Density pass (action min-height, pads, margins, last-child)  
6. Wireframe + mockup checklist sign-off  

### Publish note

Issue tracker publish skipped: `gh` CLI not available in this environment. Local path is the source of truth with triage `ready-for-agent`. When `gh` is available:

```bash
gh issue create --title "Highlight tile: editor shortcuts, code chrome, unified action row, density" \
  --label ready-for-agent \
  --body-file docs/superpowers/specs/2026-07-14-highlight-tile-editor-density-prd.md
```
