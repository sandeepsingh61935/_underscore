# Highlight Markdown Body

**Date:** 2026-07-14  
**Status:** Implemented (v1)  
**Triage label:** `ready-for-agent`  
**Scope:** Extension Collections + shared HighlightCard rendering (popup/dashboard read-only); web SPA Collections when using the same card  
**Design canvas:** `~/.cursor/projects/home-sandy-projects-underscore/canvases/highlight-quote-format.canvas.tsx`

---

## Problem Statement

Highlight body content (`text`) is stored as a plain capture string and rendered in `HighlightCard` as a single run of words. Newlines collapse, programming code is unreadable, and users cannot add structure (lists, emphasis, fences) after capture.

Users need:

1. **Default readable formatting** for untouched captures (preserve newlines / blank-line paragraphs, clamp long quotes).
2. The ability to **curate the body as markdown** (bold, lists, code fences, etc.) so code and structure survive for later reading.

Page re-anchoring must keep working: editing the reading body must **not** overwrite `ranges[].selector.exact`.

---

## Goals

- Treat highlight `text` as **markdown source** after the user opts to edit; capture continues to write plain text with no silent rewrite.
- Render a safe CommonMark-ish subset on every `HighlightCard` surface.
- Allow source-markdown editing (textarea + preview) on **Collections** cards only.
- Clamp rendered body (~4 lines) with Show more / Show less in list and popup; edit mode shows full source + full preview.
- Persist edited `text` through existing repository update paths (local + cloud); never mutate TextQuote selectors on format save.

## Non-Goals (v1)

- WYSIWYG / rich-text toolbar.
- Headings, tables, task lists, images, raw HTML.
- Language syntax highlighting.
- Auto-detecting code and wrapping fences on capture.
- Rewriting historical captures into markdown.
- Editing notes/marginalia as markdown (unchanged).
- Selection floating “Code” chip (superseded by full markdown edit).

---

## User Stories

1. As a reader in Collections, I want multi-line highlights to show paragraph breaks when the stored text has newlines, so I’m not stuck with a word stream.
2. As a reader, I want long highlights clamped with Show more / Show less, so section lists stay scannable.
3. As a curator in Collections, I want an Edit action on a highlight card, so I can open a markdown source editor.
4. As a curator, I want a live preview beside (or below) the source, so I can confirm fences/lists/bold before Save.
5. As a curator, I want to wrap programming code in fenced blocks and add newlines/indent, so code is readable later.
6. As a curator, I want Cancel to discard unsaved edits, so I don’t accidentally keep a bad draft.
7. As a popup user, I want to see the same rendered markdown (clamped) without an Edit control, so the small shell stays simple.
8. As a page visitor, I want in-page highlight re-anchoring to keep using the original quote selector, so formatting my library text doesn’t break the live DOM mark.
9. As a searcher, I want library search to match against the stored markdown source (including fence contents), so reformatted code remains findable.
10. As an exporter, I want export/copy to use the curated body sensibly, so I don’t double-escape already-markdown text.

---

## Markdown Subset (allowed)

| Construct | Allowed |
|-----------|---------|
| Paragraphs / soft line breaks | Yes |
| `**bold**` / `*italic*` | Yes |
| `` `inline code` `` | Yes |
| Fenced code blocks | Yes (language tag optional; no highlighting) |
| Unordered / ordered lists | Yes |
| Links | Yes — `https:` only |
| Headings | No |
| Tables / task lists / strikethrough | No |
| Images | No |
| Raw HTML | No (stripped / escaped) |

---

## UX

### Read mode (all surfaces using HighlightCard)

- Render sanitized markdown (or plain-with-newlines as markdown source).
- Pull-quote chrome unchanged (qmark + serif body hierarchy; code/monospace for code spans/blocks).
- ~4-line clamp + Show more / Show less; local expand state per card instance.
- Actions: existing Copy / Delete; Collections adds **Edit** when `onEdit` is provided.

### Edit mode (Collections only)

- Trigger: **Edit** action on the card.
- Layout: source `textarea` (mono) + live preview using the same renderer (no clamp in preview).
- Compact cheat-sheet: `**bold** · *italic* · \`code\` · \`\`\` fences \`\`\` · - list`.
- **Save** → persist `text`, exit edit mode, toast on failure.
- **Cancel** → discard draft, exit edit mode.
- One card editing at a time (recommended; if another Edit opens, cancel current draft).

### Wireframe

- Update `ui_kits/extension/v2/primitives.jsx` HighlightCard notes to match read/edit + clamp.
- Interactive reference: highlight-quote-format canvas (markdown revision).

---

## Data & Persistence

### Storage

- Field: `HighlightDataV2.text` (existing string, max 10000) — now **may contain markdown**.
- Capture path unchanged: `selection.toString().trim()` (or equivalent) still writes plain text.
- On Save from editor: `repository.update(id, { text })` only. **Do not** modify `ranges`, `contentHash`, or `metadata` for this action (unless separately required later).
- **Never** rewrite `ranges[].selector.exact` or range text when updating formatted body.

### New IPC

`UPDATE_HIGHLIGHT_TEXT` payload: `{ id: string; text: string }`

- Validate length against schema max (10000).
- Trim trailing whitespace; reject empty after trim.
- Gate with same “can mutate curated library fields” posture as metadata write (`tags` / `metadataWrite` capability — Basic + Pro when collections available).
- Extension: background updates via `repositoryFacade` / active scoped repo; notify library changed.
- Web: parallel update via Supabase highlight update (`text` column) mirrored in `useUpdateHighlightText` web path (same pattern as `useUpdateHighlightMetadata`).

### Modes

| Surface | Render | Edit |
|---------|--------|------|
| Collections (section / domain / library search hits using HighlightCard) | Yes | Yes (when capability allows) |
| Popup dashboard recent | Yes | No |
| In-page DOM highlight | Unchanged (DOM mark, not card) | N/A |

---

## Security

- Parse markdown → HTML (or React elements) with a **restricted** plugin/component set.
- Run HTML through **DOMPurify** (already a dependency) with an allowlist matching the subset (e.g. `p`, `br`, `strong`, `em`, `code`, `pre`, `ul`, `ol`, `li`, `a`).
- Links: force `https:`; `target="_blank"` + `rel="noopener noreferrer"`; strip `javascript:` and other schemes.
- No `dangerouslySetInnerHTML` without sanitize. Prefer `react-markdown` custom components that never emit disallowed tags.

---

## Export & Copy

- **Copy** on card: copy stored markdown source (curated text), not HTML.
- **Library markdown export** (`format-markdown.ts`): embed body as a markdown block rather than wrapping the entire string in a single escaped `> "…"` quote when the body already contains fences/lists. Concrete rule for implementers:
  - Prefer a blockquote paragraph stream or fenced body section that does not re-escape backticks destructively.
  - Keep existing metadata lines (`[note]`, `[tags]`, url) unchanged.
- Update export unit tests for a body containing a fence + list.

---

## Architecture (implementation sketch)

```
HighlightCard (read)
  └─ HighlightMarkdownBody (clamp + Show more)
       └─ shared markdown renderer (sanitize)

HighlightCard (edit, Collections)
  └─ source TextArea + HighlightMarkdownBody (no clamp)
  └─ onSave → useUpdateHighlightText → UPDATE_HIGHLIGHT_TEXT / web update
```

Key files:

| Area | Path |
|------|------|
| Card UI | `src/ui-system/components/primitives/HighlightCard.tsx` |
| Renderer | `src/ui-system/components/primitives/HighlightMarkdownBody.tsx` (new) or `src/shared/utils/highlight-markdown.ts` + thin view |
| Schema / IPC | `src/shared/schemas/message-schemas.ts`, auth/message validators |
| Hook | `src/features/collections/hooks/useUpdateHighlightText.ts` (new) |
| Background | `src/entrypoints/background.ts` subscriber |
| Call sites | `SubDomainView`, `DomainDetailsView`, `CollectionsView` (Edit); popup Dashboard read-only |
| Export | `src/shared/highlight-export/format-markdown.ts` |
| Tests | HighlightCard, renderer, IPC/hook, export |
| Wireframe | `ui_kits/extension/v2/primitives.jsx` |

---

## Testing

- Unit: markdown subset rendering (bold, fence, list, link scheme reject).
- Unit: clamp / Show more behavior.
- Unit: Save updates text only; selector fixture unchanged.
- Unit: empty / oversize text rejected.
- Unit: export with fenced body.
- Component: Edit → Save / Cancel wiring (Collections).
- Type-check + relevant vitest suites before mark complete.

---

## Implementation Decisions (locked)

| Decision | Choice |
|----------|--------|
| Body format | Markdown in `text` |
| Default for untouched capture | Render as markdown source as-is (paragraphs from blank lines); no silent rewrite |
| Editor | Source textarea + preview (not WYSIWYG) |
| Subset | Bold/italic/inline code/fences/lists/https links |
| Edit surface | Collections only |
| Clamp | ~4 lines + Show more on read surfaces |
| Affordance | Edit action next to Copy / Delete |
| Anchoring | Never rewrite `selector.exact` |
| Supersedes | Paragraph-only + code-span-metadata plan |

---

## Open Follow-ups (out of v1)

- Optional later: WYSIWYG toggle; headings; capture-time newline injection between block elements.
- Dedicated ADR only if we introduce a second stored field (e.g. `displayText` vs `anchorText`) — not required under current “edit `text`, keep selector” model.
