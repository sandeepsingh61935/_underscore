# PRD: Anchor Drift Detection and Orphaned Highlight Recovery

**Status:** `ready-for-agent`  
**Date:** 2026-09-03  
**Triage:** `ready-for-agent`  
**Source:** Product prioritization and technical review (Feature 1 of 3)  
**Surfaces:** Content script restoration pipeline, Extension Popup (Current Page view), Highlight Card UI  
**Does not reopen:** Event sourcing append-only store; MultiSelectorEngine tiered order (XPath -> Position -> Fuzzy); V2 Editorial design tokens; Popup chrome ownership; Mode persistence boundaries (ADR-003, ADR-025, ADR-029)  
**Related:** Highlight persistence PRDs (2026-07-11, 2026-07-17); Granular highlight delete (2026-07-11); Multi-selector restoration specs  
**Test seams:** Content restoration outcome collector; Re-anchor command dispatcher; Popup unanchored state selector; HighlightCard status pill rendering (see Testing Decisions)

---

## Problem Statement

When I highlight text on the web, I expect those marks to reappear whenever I return to the page. However, the web is dynamic: news organizations edit articles, publishers restructure layouts, single-page applications rerender containers, and dynamic ads inject arbitrary DOM nodes.

Today, when the restoration engine attempts to mount saved highlights onto the live document, any highlight that fails all matching tiers (XPath, exact quote with prefix/suffix context, and fuzzy match) is dropped silently. The highlight still exists in storage (IndexedDB or Supabase), but to the user it has vanished from the screen.

This silent failure creates three serious problems:
1. **Perceived Data Loss:** Users believe the application lost their marks and notes, eroding trust in the highlighter.
2. **Invisible Marginalia:** Critical thoughts, tags, and notes attached to that highlight become inaccessible in the on-page context.
3. **No Recovery Seam:** If the text still exists on the page (or was slightly rephrased), the user has no way to re-attach the highlight to the new text without deleting the original and creating a new one—which forfeits the creation timestamp, notes, tags, and grounded chat lineage.

Users do not need autonomous, hallucinating background rewriters that corrupt their data. They need honest visibility when a page has drifted, continuous access to their unanchored quotes/notes, and an effortless 1-click way to re-anchor a quote to the current page.

---

## Solution

1. **Restoration Outcome Classification:**  
   During content script initialization and dynamic mutation reconciliation, classify each highlight loaded for the URL into one of two operational states:
   - `anchored`: Successfully located and rendered in the DOM.
   - `unanchored` (orphaned): Highlight belongs to this URL according to storage, but could not be located in the current DOM with acceptable confidence.

2. **Honest, Non-Destructive Visibility:**  
   - In the Extension Popup under the Current Page view, display unanchored highlights in an **Unanchored on this page** group or badge.
   - The highlight card displays the quote text, note, tags, and date, along with a discreet status pill: `Unanchored (Page modified)`.
   - The user can still read, edit notes, copy, or delete the highlight as normal.

3. **1-Click Manual Re-Anchor Action:**  
   - When viewing an unanchored highlight on its active page, the user can select the corresponding or revised passage in the browser window and click **Re-anchor to selection**.
   - The system calculates the new DOM Range and TextQuoteSelector (`exact`, `prefix`, `suffix`), updates the highlight in place via the standard update event, and immediately paints the highlight in the DOM.
   - Highlight ID, tags, note, created timestamp, and cloud sync status remain preserved.

4. **Lean Implementation Constraint:**  
   - No background scrapers, no heavyweight whole-page HTML caching, no speculative AI auto-mutations.
   - Reuses existing `TextQuoteFinder`, `MultiSelectorEngine`, and `UPDATE_HIGHLIGHT` event sourcing channels.

---

## User Stories

### Restoration & Classification
1. As a reader returning to an updated article, I want highlights whose text still exists in the DOM to be restored seamlessly, so that my reading continuity is maintained.
2. As a reader returning to a page where highlighted text was deleted or heavily restructured, I want the system to not throw unhandled DOM errors, so that the page remains stable.
3. As a user, I want highlights that cannot be resolved in the DOM to be marked as `unanchored` rather than discarded from memory, so that my annotations are never silently dropped.
4. As a user, I want the restoration engine to finish matching without blocking UI interaction, so that page performance is not degraded.
5. As an extension user, I want the content script to notify the extension context of the count of unanchored highlights on the active tab, so that the popup can display accurate page status.

### Popup & Library Visibility
6. As an extension user opening the popup on a page with unanchored marks, I want to see an indicator that some marks could not be anchored to the current page content, so that I understand why they are not visible on the page.
7. As an extension user, I want unanchored marks on the current page to remain visible in the popup list, so that I can read my past notes and tags even if the publisher altered the article.
8. As a user viewing an unanchored highlight card, I want a status pill stating `Unanchored (Page modified)`, so that the state of the highlight is clear and honest.
9. As a user viewing an unanchored highlight card, I want full access to edit its note and tags, so that I do not lose editing privileges over unanchored data.
10. As a user viewing an unanchored highlight card, I want the option to delete it if the underlying article removed the section permanently, so that I can clean up obsolete marks.
11. As a user viewing the web library, I want unanchored highlights to still be listed under the page's section, so that my web library remains the comprehensive record of all my marks.

### Manual Re-Anchoring Workflow
12. As a user who sees an unanchored highlight and spots where that passage now lives on the page, I want to select the new text and click `Re-anchor`, so that the highlight is attached to the updated DOM position.
13. As a user clicking `Re-anchor`, I want validation that I have an active text selection on the page, so that I am prevented from submitting empty ranges.
14. As a user re-anchoring a highlight, I want the action to update the highlight's range and text quote selector, so that subsequent visits restore it at the new location.
15. As a user re-anchoring a highlight, I want its original identifier (`id`), creation date, tags, and notes to remain unchanged, so that history and metadata are preserved.
16. As a user re-anchoring a highlight, I want the visual highlight stroke to appear immediately on the page upon completion, so that I receive instant confirmation.
17. As a user re-anchoring a highlight, I want the status pill to change from `Unanchored` to normal, so that the card reflects the successful repair.
18. As a user in Cloud mode, I want the re-anchor change to propagate through event sourcing and sync to Supabase, so that other devices receive the updated anchor.
19. As a user in Local mode (24h TTL), I want the re-anchor change to persist in IndexedDB, so that the repair survives popup closes and page reloads.
20. As a user in Ephemeral mode, I want re-anchoring to update the in-memory session, so that active session marks can be adjusted.

### Safety & Integrity Constraints
21. As a user, I do not want the system to automatically guess and re-anchor my highlights to arbitrary text without my approval, so that false positives do not corrupt my library.
22. As a user on a page that is still loading dynamic content, I want the restoration engine to perform a deferred retry on DOM ready before declaring highlights unanchored, so that slow-rendering content is not prematurely flagged.
23. As a user navigating between tabs, I want the unanchored highlight state to be tab-scoped, so that data from one tab does not bleed into another.
24. As a user with zero unanchored highlights on a page, I want no warning pills or extra chrome displayed, so that the interface remains clean and minimal.

---

## Implementation Decisions

1. **Restoration Result Contract:**  
   Modify the page highlight restoration coordinator to return a structured restoration report:
   - `anchoredIds: string[]`
   - `unanchoredIds: string[]`
   - `totalCount: number`

2. **Message Bus & State Transport:**  
   - After restoration completes (including the existing post-load mutation stabilization pass), the content script sends a lightweight message to the runtime context:
     `{ type: 'PAGE_RESTORATION_STATUS', payload: { url, anchoredCount, unanchoredIds } }`
   - The popup's current-page hook consumes this status to annotate in-memory highlight presentation items with an `isUnanchored: boolean` flag.

3. **UI Contract & Editorial Styling:**  
   - Avoid creating separate views or heavy modals.
   - Use the existing `HighlightCard` component in `src/ui-system/components/primitives/HighlightCard.tsx`.
   - When `isUnanchored` is true:
     - Render a subtle metadata pill using standard design tokens (`var(--rule)`, `var(--ink-muted)`): `Unanchored`.
     - In the card action row, render a secondary button: `Re-anchor to selection`.
     - Disable the `Re-anchor to selection` button if the active page has no selected text, with an informative tooltip or toast.

4. **Re-Anchor Command Dispatch:**  
   - When the user triggers `Re-anchor to selection`:
     1. Content script extracts the current DOM selection (`window.getSelection()`).
     2. Generates new `SerializedRange` and `TextQuoteSelector` using existing `range-converter.ts` and `MultiSelectorEngine`.
     3. Dispatches the existing `UPDATE_HIGHLIGHT` action through the repository facade with the updated range, selector, and text.
     4. Content script renders the newly anchored highlight immediately via `HighlightRenderer`.
     5. Re-evaluates the tab restoration report, removing the ID from `unanchoredIds`.

5. **No Schema or Database Migrations:**  
   - The `HighlightData` schema (`src/shared/schemas/highlight-schema.ts`) already supports full `SerializedRange` and `TextQuoteSelector` (`exact`, `prefix`, `suffix`).
   - Re-anchoring produces a standard highlight update event. No new database tables, columns, or migration scripts are required.

---

## Testing Decisions

- **Focus on External Behavior:**  
  Tests must assert user-visible states and message contracts rather than private DOM traversal variables.
- **Unit Tests:**  
  - Restoration Coordinator: Given a mock DOM lacking target text, verify that the highlight ID is placed in `unanchoredIds` and no unhandled error is thrown.
  - Range Recomputation: Given a selected DOM range on a modified node, verify that `createSelector` yields valid `exact`, `prefix`, and `suffix` properties matching the new text.
- **Integration Tests:**  
  - Current-Page Popup Hook: Verify that receiving `PAGE_RESTORATION_STATUS` correctly sets `isUnanchored = true` on the matching highlight cards.
  - Re-anchor Flow: Verify that triggering `reanchorHighlight(id)` dispatches an `UPDATE_HIGHLIGHT` event with the new range and clears the `unanchored` status.
- **Prior Art:**  
  - `tests/unit/content/modes/pro-mode-restore.test.ts`
  - `tests/unit/content/modes/pro-mode-dedupe.test.ts`
  - `tests/unit/services/multi-selector-engine.test.ts`

---

## Out of Scope

- Automatic background crawling or autonomous headless re-indexing of pages.
- AI-based semantic text matching to guess what modified text meant.
- Storing full-page HTML snapshots or DOM archives.
- Web app multi-page bulk re-anchoring (re-anchoring requires an active browser DOM and can only occur when the user visits the page in the browser extension).

---

## Further Notes

- This feature builds entirely upon existing primitives (`MultiSelectorEngine`, `TextQuoteFinder`, `HighlightCard`, `UPDATE_HIGHLIGHT`).
- It directly eliminates the most frequent user complaint with web highlighters (silent quote disappearance) while introducing zero architectural drift or unnecessary code bank bloat.
