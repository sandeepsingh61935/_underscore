# Related Pages UI Parity & Reason Text Removal Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove `<span class="phone-related-reason">Similar text</span>` across all apps (Phone-IA, Desktop Web App, and Extension popup) and maintain the design and UI of Image #1 (Phone-IA) for section-related pages across Desktop Web App and the Extension.

**Architecture:**
- Phone-IA and Desktop Web App share `PhoneRelatedPages` (`src/web/components/PhoneRelatedPages.tsx`) and `web-app.css`.
- Desktop Web App currently appears broken because `.phone-related*` styles in `web-app.css` are trapped inside `@media (max-width: 767px)`. Moving these styles into the common scope makes desktop viewports render the exact same vertical card list as Phone-IA.
- The Extension uses `HighlightQuoteView` (`src/features/collections/views/HighlightQuoteView.tsx`) and `global.css`. It will render the vertical layout matching Phone-IA without the reason pill, and with kicker color aligned to `var(--ink-3)`.

**Tech Stack:** React 19, TypeScript strict, Vitest, V2 Editorial CSS custom properties.

---

## File Map

| Path | Responsibility |
|------|----------------|
| `src/web/components/PhoneRelatedPages.tsx` | Remove `phone-related-reason` span from vertical card row |
| `src/web/theme/web-app.css` | Move `.phone-related` rules outside `@media (max-width: 767px)` so desktop inherits Phone-IA styles |
| `src/features/collections/views/HighlightQuoteView.tsx` | Use vertical related pages layout matching Image #1 without reason pill |
| `src/ui-system/theme/global.css` | Align `.quote-detail-kicker` with `var(--ink-3)` and ensure vertical card styles match Image #1 |
| `src/web/components/PhoneQuoteScreen.test.tsx` | Update tests to assert vertical cards render without reason pills |

---

## Task 1: Remove Reason Text from `PhoneRelatedPages` (Phone-IA & Desktop Web App)

**Files:**
- Modify: `src/web/components/PhoneRelatedPages.tsx`

- [ ] **Step 1.1:** Inspect `PhoneRelatedPages.tsx` vertical branch.
- [ ] **Step 1.2:** Remove `{page.reason ? (<span className="phone-related-reason">{page.reason}</span>) : null}` from `phone-related-host-line`. Keep `page.reason` passed to `onOpen` callback for analytics.
- [ ] **Step 1.3:** Verify `PhoneRelatedPages.tsx` compiles cleanly.

---

## Task 2: Fix Desktop Web App Styling in `web-app.css` to Match Image #1

**Files:**
- Modify: `src/web/theme/web-app.css`

- [ ] **Step 2.1:** Locate the `.phone-related` styling block currently inside `@media (max-width: 767px)` (lines ~4596–4740).
- [ ] **Step 2.2:** Extract the vertical list and card styles so they apply to both desktop and mobile viewports:
  - `.phone-related--vertical`: `margin: 16px 0 18px; padding: 12px; border-radius: var(--r-md); border: 1px solid var(--border); border-left: 3px solid var(--accent); background: var(--paper-2);`
  - `.phone-related .phone-kicker`: `font-family: var(--mono); font-size: var(--step--2); letter-spacing: 0.14em; text-transform: uppercase; color: var(--ink-3); margin-bottom: 8px;`
  - `.phone-related-list`: `display: flex; flex-direction: column; gap: 6px; margin-top: 8px;`
  - `.phone-related-row`: `display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 8px 10px; border: 1px solid var(--border); border-radius: var(--r-sm); background: var(--paper); color: var(--ink); text-align: left; cursor: pointer; transition: background var(--dur-fast) var(--ease), border-color var(--dur-fast) var(--ease);`
  - `.phone-related-row:hover, .phone-related-row:active`: `background: var(--paper-3); border-color: var(--rule);`
  - `.phone-related-ico`: `flex-shrink: 0;`
  - `.phone-related-info`: `flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;`
  - `.phone-related-host-line`: `display: flex; align-items: center; gap: 6px;`
  - `.phone-related-host`: `font-family: var(--sans); font-size: var(--step--1); font-weight: 600; letter-spacing: -0.01em; line-height: 1.25; color: var(--ink);`
  - `.phone-related-path`: `max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--mono); font-size: var(--step--2); color: var(--ink-3);`
  - `.phone-related-row .phone-related-count`: `font-family: var(--mono); font-size: var(--step--2); letter-spacing: 0.04em; color: var(--ink-3); margin-top: 0;`
  - `.phone-related-trail`: `font-size: var(--step-0); color: var(--ink-4); line-height: 1; flex-shrink: 0;`
- [ ] **Step 2.3:** Keep horizontal rail styles (`.phone-related-rail`, `.phone-related-card`) available for mobile library browse view as needed.

---

## Task 3: Align Extension Popup (`HighlightQuoteView`) with Image #1

**Files:**
- Modify: `src/features/collections/views/HighlightQuoteView.tsx`
- Modify: `src/ui-system/theme/global.css`

- [ ] **Step 3.1:** In `HighlightQuoteView.tsx`, ensure the related pages section renders the vertical layout matching Phone-IA:
  - Container: `className="quote-detail-related quote-detail-related--vertical"`
  - Kicker: `className="quote-detail-kicker"` displaying `{relatedLabel}`
  - List: `className="quote-detail-list"`
  - Row: `className="quote-detail-row"` with `DomainFavicon` (16px), host (`quote-detail-host`), section path (`quote-detail-path-sub`), count (`quote-detail-count`), and arrow (`quote-detail-trail`)
  - Ensure no `quote-detail-reason` is rendered.
- [ ] **Step 3.2:** In `src/ui-system/theme/global.css`:
  - Update `.quote-detail-kicker`: set `color: var(--ink-3)` (matching Phone-IA Image #1 instead of `var(--accent)`).
  - Verify `.quote-detail-related--vertical` and `.quote-detail-row` tokens match Phone-IA styling.

---

## Task 4: Tests and Quality Verification

**Files:**
- Modify: `src/web/components/PhoneQuoteScreen.test.tsx`

- [ ] **Step 4.1:** In `PhoneQuoteScreen.test.tsx`, update test `renders related pages in vertical fashion and opens them on tap`:
  - Verify container `.phone-related--vertical` and `.phone-related-list` are rendered.
  - Verify domains `gutenberg.org` and `ricardo.ai` are rendered.
  - Verify `screen.queryByText('Shared tags')` and `screen.queryByText('Similar text')` are null (reasons not rendered).
  - Verify click triggers `onOpen` with proper arguments including reason.
- [ ] **Step 4.2:** Run unit tests: `npm test -- PhoneQuoteScreen`.
- [ ] **Step 4.3:** Run type checking: `npm run type-check`.
- [ ] **Step 4.4:** Run full test suite: `npm test`.

---

## Task 5: Knowledge Graph Maintenance & Git Commit

- [ ] **Step 5.1:** Run `graphify update .` to update the AST knowledge graph.
- [ ] **Step 5.2:** Commit the changes to the current branch with a conventional commit message:
  `feat(ui): align related pages layout across web and extension and remove reason text`
