# PRD: Section Label Rename (Domain Details)

**Date:** 2026-07-17  
**Status:** Ready for implementation  
**Triage:** `ready-for-agent`  
**Scope:** Extension popup Domain Details section rows; local label store + hook  
**Baseline (broken):** `[edit]` UI from `05fe9ca` with stub `handleSaveEdit` (`console.log` only)  
**Related:** Granular delete PRD (domain/section glossary); isolated Basic/Pro storage; `getSectionKey`

---

## Problem Statement

On Domain Details, users can click **[edit]** next to a section and type a new name, but the name never sticks. Saving either logs to the console or is discarded on blur. Section titles always snap back to the derived path key (`/`, `/docs`, `blog · /docs`, etc.).

Users believe they can rename sections. The product currently promises rename UX without persistence.

---

## Solution

Persist **display-only** section labels in mode-scoped `chrome.storage.local`. Wire Domain Details **[edit]** to that store. Keep canonical section keys for nav, delete, search, and AI.

v1 is device-local, no IPC, no cloud. Orphan keys after domain delete are acceptable.

---

## User Stories

1. As a user, I want Enter to save a section label so the name sticks after reopen.
2. As a user, I want Escape to cancel so mistakes are cheap.
3. As a user, I want blur to save when the value changed so I need no hidden submit control.
4. As a user, I want empty/whitespace label to restore the default title (`Home` for `/`, else the section key).
5. As a guest, I want labels stored under Basic scope so they do not appear in the signed-in library.
6. As a signed-in user, I want labels stored under Pro scope so guest renames stay separate.
7. As a user, I want renamed sections to still open the same highlights (display-only).
8. As a developer, I want no IPC for this map so the fix stays small.
9. As a web user without `chrome.storage`, I do not see a broken **[edit]** control.

---

## Implementation Decisions

- **Display alias only** — no rewrite of highlight `url` / `path` / section keys.
- **Storage keys:** `section_labels:basic` | `section_labels:pro`  
  Shape: `Record<domain, Record<sectionKey, label>>`.
- **Trim** labels; empty after trim deletes the override.
- Popup/hook reads and writes `chrome.storage.local` (same class as mode prefs / MCP UI flags).
- No background handlers, no Zod IPC, no cloud, no delete cascade in v1.
- Hide **[edit]** outside extension context (`isExtensionContext`).
- Default title: `sectionKey === '/' ? 'Home' : sectionKey`.
- Prefill edit field with **current display title**.

### UX

| Action | Behavior |
|--------|----------|
| Enter | Save if changed; close edit |
| Escape | Discard; close edit |
| Blur | Save if dirty; else close |
| Empty/whitespace | Clear override → default title |

---

## Testing Decisions

- Unit-test store get/set/clear + mode isolation with mocked `chrome.storage.local`.
- Unit-test pure merge helpers and default title.
- Optional: hook/view save/cancel if low-cost.
- No IPC or e2e requirements for v1.

---

## Out of Scope

- Domain hostname nicknames on Collections list
- Path rewrite / re-keying highlights
- Cloud/Supabase sync
- Export showing custom labels
- Delete cascade cleanup
- Web SPA edit parity

---

## Further Notes

Root cause was unfinished UI (`05fe9ca`), not a storage race. Optional later: IPC if content script needs labels; Supabase if cross-device nicknames matter.
