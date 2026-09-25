# PRD: Section Related Pages UI Parity & Reason Text Removal Across Apps

**Status:** `ready-for-agent`  
**Date:** 2026-09-25  
**Triage:** `ready-for-agent`  
**Surfaces:** Mobile Web App (Phone-IA), Desktop Web App (`/library`), Extension Popup (`HighlightQuoteView`)  
**Related:** Library Related Pages PRD (2026-09-02); Phone/Tablet Consume PRD (2026-09-20)  
**Test seams:** `PhoneQuoteScreen` rendering, `HighlightQuoteView` rendering, `PhoneRelatedPages` component tests, CSS layout assertions  

---

## Problem Statement

When viewing section-related pages across our client surfaces (Phone-IA, Desktop Web App, and the Extension popup):
1. The related reason label (`<span class="phone-related-reason">Similar text</span>`) clutters the domain title line on the related page cards, adding visual noise without user benefit.
2. On the Desktop Web App (`/library`), the section-related pages block appears completely broken (unstyled browser buttons wrapping horizontally side-by-side, cramped together without card padding, borders, or typography) because all `.phone-related*` styles in `web-app.css` are trapped inside a `@media (max-width: 767px)` mobile-only query.
3. The visual presentation of the related pages block is inconsistent across Phone-IA, Desktop Web App, and the Extension popup. The Phone-IA design (Image #1) provides the clean, editorial benchmark that must be maintained across all three surfaces.

---

## Solution

1. **Remove Reason Text Pill**: Remove `<span class="phone-related-reason">Similar text</span>` and `<span class="quote-detail-reason">Similar text</span>` from the related page cards across all client applications (Phone-IA, Desktop Web App, and Extension popup), while continuing to pass `reason` through to event handlers for telemetry/tracking.
2. **Desktop Web App Styling Parity**: Extract `.phone-related` styling in `web-app.css` from the `@media (max-width: 767px)` breakpoint so that desktop viewports display the exact same editorial card design as Phone-IA:
   - Outer container with `var(--paper-2)` tinted background, `1px solid var(--border)`, `3px solid var(--accent)` left bar, rounded corners, and proper padding.
   - Monospace uppercase kicker with `var(--ink-3)` color and `0.14em` letter spacing.
   - Vertically stacked cards (`gap: 6px`) with `var(--paper)` background, `1px solid var(--border)`, 16px favicon, bold domain host, monospace truncated path, monospace highlight count, and trailing arrow `→`.
3. **Extension Popup Styling Parity**: Align `.quote-detail-kicker` color with Phone-IA (`var(--ink-3)` instead of `var(--accent)`), maintaining exact visual uniformity across mobile web, desktop web, and extension popup.

---

## User Stories

1. As a reader browsing related pages on Phone-IA, I want clean page cards displaying the domain, path, highlight count, and arrow without an intrusive "Similar text" pill, so that I can read the source and path cleanly.
2. As a reader browsing related pages on the Desktop Web App (`/library`), I want the related pages section to render as an elegant, styled vertical card list matching Phone-IA, so that the desktop reading experience is polished and readable instead of raw unstyled buttons.
3. As a reader browsing related pages in the Extension popup, I want the related pages card to match the visual style, typography, and kicker styling of Phone-IA without the "Similar text" label, so that the experience is identical across all devices.
4. As a reader on any client surface, I want clicking a related page row to navigate directly to that section in my library.
5. As an analytics engineer, I want the related page click telemetry to continue receiving the matching reason and rank behind the scenes, even though the label is hidden from the UI.
6. As a design system maintainer, I want all related page styles to strictly use V2 Editorial tokens (`var(--paper)`, `var(--paper-2)`, `var(--ink)`, `var(--ink-3)`, `var(--accent)`, `var(--border)`, `var(--rule)`), without hardcoded colors or arbitrary fonts.

---

## Implementation Decisions

- **Phone-IA & Web App Component**: Modify the shared component `PhoneRelatedPages` in `src/web/components/PhoneRelatedPages.tsx` to remove `{page.reason ? <span className="phone-related-reason">{page.reason}</span> : null}`.
- **Extension View**: Modify `HighlightQuoteView` in `src/features/collections/views/HighlightQuoteView.tsx` to remove `{page.reason ? <span className="quote-detail-reason">{page.reason}</span> : null}`.
- **Web App Stylesheet**: In `src/web/theme/web-app.css`, lift the `.phone-related` component rules (container, kicker, list, row, info, host, path, count, trail, favicon) out of the `@media (max-width: 767px)` block so they apply across desktop and mobile.
- **Extension Stylesheet**: In `src/ui-system/theme/global.css`, align `.quote-detail-kicker` with `var(--ink-3)` to match Phone-IA.

---

## Testing Decisions

- **Component Tests**: Update `src/web/components/PhoneQuoteScreen.test.tsx` to ensure assertions verify the presence of the vertical list and domain rows while verifying that reason pills are not rendered.
- **Behavioral Parity**: Verify that clicking a related page continues to invoke the `onOpen` callback with `(domain, section, rank, reason)`.
- **Type Checking**: Full TypeScript type check via `npm run type-check`.
- **Test Suite**: Run `vitest run` on the affected test suites.

---

## Out of Scope

- Modifying the underlying relatedness algorithms, scoring formulas, or document corpus indexing.
- Altering the "Related highlights" card layout or related tags filter chips on the desktop web app.
- Publishing to GitHub issues or remote tracking repositories.

---

## Further Notes

- The work aligns all client applications with V2 Editorial Design specifications and preserves telemetry contracts.
