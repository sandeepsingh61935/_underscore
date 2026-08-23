# PRD: Highlight persistence fix

**Status:** In progress  
**Date:** 2026-07-17  
**Owner:** Engineering  

## Problem

Users can create highlights on web pages (visible paint), but those highlights do not reliably appear in:

- Extension Library / Domains views  
- Account / cloud storage (signed-in)  
- Page restore after reload  

## Root causes

1. **IPC drop** — content writes tab-local cache first; `IPC_HIGHLIGHT_ADD` is fire-and-forget and fails on cold service worker without failing create.  
2. **Non-UUID ids** — generators produce `hl-…` while Supabase `highlights.id` is `uuid` → cloud insert fails.  
3. **Missing `url`** — Pro `saveHighlight` can persist without `url`; Library/query skip rows with no url.

## Goals

- Guest (Basic): create → Library domain list → domain detail → reload restores paint.  
- Signed-in (Pro / pro_xai): same local path + valid Supabase row (UUID id, non-empty url).  
- Cold SW: create still reaches background after short retry.

## Non-goals

- Merging Guest highlights into Account on sign-in  
- Migrating legacy `hl-…` local rows to UUID  
- Reordering full background bootstrap  
- Live popup refresh via `LIBRARY_DATA_CHANGED` on every add  

## Acceptance (P0)

| ID | Behavior |
|----|----------|
| A1 | New highlight ids are UUID v4 |
| A2 | Every persisted highlight has a non-empty page `url` |
| A3 | Content `add` sends `IPC_HIGHLIGHT_ADD` to background |
| A4 | Transient IPC failure retries then succeeds |
| A5 | Library collections only count highlights that have `url` |
| M1–M6 | Manual: guest library, reload, domain list, signed-in library, cloud row, cold SW |

## Implementation approach

TDD vertical slices S1–S5 (UUID → url → IPC → retry → collections contract). See session plan.
