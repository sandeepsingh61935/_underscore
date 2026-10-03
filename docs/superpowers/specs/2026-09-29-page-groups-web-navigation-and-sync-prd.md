# PRD: Page Groups Web Navigation, Browser Tab Sync, and Rail Hierarchy

**Date**: 2026-09-29  
**Status**: Ready for Agent (`ready-for-agent`)  
**ADR**: [ADR-032](../../04-adrs/032-page-groups-and-browser-tab-group-mirroring.md)  
**Parent PRD**: [2026-09-28-page-groups-prd.md](./2026-09-28-page-groups-prd.md)

---

## Problem Statement

Users actively research topics across dozens of distinct web pages and domains simultaneously. While the initial Page Groups implementation introduced basic data models and extension popup controls, users working in the Underscore Web App face several critical friction points:

1. **Navigation Clutter & Mixed Context**: Page Groups were initially embedded inside the Library view. This overloaded the Library sidebar, creating visual confusion between global domain collections and curated research groups.
2. **Clunky Add Experience & Broken Suggestions**: The "Add page" and "Add domain" controls appeared on sub-pages where they were out of context, lacked auto-suggestions from the user's existing saved library pages and domains, suffered from confusing subdomain checkboxes, and rendered redundant tables of existing items.
3. **Misaligned Hierarchy & Inconsistent Icons**: Group items in the navigation tree lacked visual symmetry with the standard Library tree. Color swatches were misaligned relative to domain favicons and document icons, and options like recoloring, renaming, and removal were fragmented.
4. **Opaque Browser Sync & Broken Bridge**: Web users could not import active browser tab groups directly from the web interface. The "Open in browser" button provided no feedback on whether a group was already live in the browser, lacked error resilience, and could crash if the background service worker encountered unhandled initialization exceptions.
5. **Fear of Destructive Library Deletion**: Users feared that removing a page or domain from a group would inadvertently delete their saved highlights and annotations from their permanent Library.
6. **Layout Inconsistencies**: Spacing, borders, and padding in the group details and rail sections suffered from clipping, cramped margins, and misalignment with the V2 Editorial design tokens.

---

## Solution

Promote **Page Groups** to a first-class, dedicated primary navigation route (`/groups`) with an unpolluted two-column master-detail layout:

1. **Dedicated Master-Detail Architecture**:
   - Top-level `/groups` navigation destination in the primary app sidebar (leaving `/library` 100% focused on domains and pages).
   - **Left Rail**: Lists all Groups ordered by fractional index. Each group node features a centered color swatch (using the 9 browser-aligned colors), expandable domain nodes with domain favicons, child pages with document icons, and a row action `(⋯)` menu. A clean "+ New Group" button sits pinned at the bottom of the list.
   - High-cardinality domain rules are clamped to the top 8 most recently highlighted pages with an inline *"+ N more pages…"* link that focuses the main pane.
2. **Main Group View & Dynamic Live State**:
   - Header displaying the group's color swatch, name, item count, live status indicator (`Live in Chrome · N tabs` or `Closed`), and dynamic action button (`Open in browser` when closed; `Focus in browser` when already active).
   - Safety confirmation dialog when opening groups containing more than 15 tabs.
   - Group `(⋯)` menu supporting Rename, Recolor, Export (Markdown, HTML Bookmarks, Copy URLs), and Delete.
3. **Collapsible Unified Add Card with Auto-Suggest**:
   - A clean collapsible card (`+ Add to group`) present exclusively on the main group view (never on child sub-pages).
   - A single unified combobox input that provides instant type-ahead auto-suggestions matching saved Library domains and pages with clear badge icons.
   - Graceful fallback: typing an un-saved URL or domain offers `Add URL "..."` or `Add domain "..."`.
   - Eliminates redundant subdomain checkboxes and redundant item listings.
4. **Web App Browser Tab Group Import**:
   - When the extension is detected via the content script bridge, an **"Import from browser"** action is available directly on `/groups`.
   - Opens an in-app modal showing active Chrome/Edge tab groups with checkboxes, titles, colors, and tab counts.
   - Gracefully filters non-syncable URLs (`chrome://`, `file://`), permits `localhost`/LAN addresses, and smart-merges with same-named existing groups to avoid duplication.
5. **Referential Integrity & Safe Deletion**:
   - Group items are strictly references (`page_group_items`). Removing an item or deleting an entire group **never** deletes pages, domains, or highlights from the user's Library.
   - Deleting a group that is live in the browser ungroups the tabs safely without killing them, offering an optional opt-in checkbox: `☑ Also close these tabs in the browser`.
6. **Mobile Stack Navigation**:
   - On viewports <768px, transitions seamlessly to stack navigation (`PhoneGroups` → `PhoneGroupDetail` with top back navigation), preserving tap targets and eliminating horizontal scroll or border clipping.

---

## User Stories

### Navigation & Layout
1. As a researcher, I want Groups to have its own dedicated item in the primary sidebar, so that my Library remains focused on domain hierarchies without clutter.
2. As a user navigating to `/groups`, I want a two-column master-detail layout, so that I can browse all my groups in the left rail while inspecting the active group's items and highlights in the main pane.
3. As a user, I want the left rail to display a centered "+ New Group" button at the bottom of the group list, so that I can easily create a new group without reaching for disparate header buttons.
4. As a user with many groups, I want to manually reorder my groups in the rail via fractional position ordering, so that my most urgent project groups stay at the top.
5. As a mobile user, I want `/groups` to render as a dedicated mobile screen with stack navigation into group details, so that controls are well-padded and never clipped or off-screen.

### Tree Hierarchy & Visual Alignment
6. As a user scanning the group rail, I want each group row to feature a vertically centered color swatch in a standard 24x24 icon slot, so that it aligns symmetrically with library navigation icons.
7. As a user expanding a group in the rail, I want to see its domain rules marked with domain favicons and its standalone pages marked with page document icons, so that I immediately understand what kind of item is listed.
8. As a user expanding a domain item within a group, I want it to expand and collapse smoothly, so that I can inspect the saved pages belonging to that domain.
9. As a user with a domain containing 50+ saved pages, I want the tree in the rail to display the top 8 pages with a "+ N more pages…" link, so that a large domain does not blow out the height of the left rail.
10. As a user clicking on a specific page under a domain in the group rail, I want the main pane to filter highlights specifically to that page, so that I can review notes for that exact document.
11. As a user clicking the `(⋯)` menu on any group in the rail, I want quick access to Rename, Recolor, and Delete, so that I can manage groups without opening them first.

### Referential Boundaries & Data Safety
12. As a user removing a page from a group, I want to be confident that my highlights and annotations on that page remain completely intact in my Library.
13. As a user deleting an entire group, I want all member pages and highlights to remain untouched in my Library, so that group curation is strictly non-destructive.
14. As a user adding a domain rule to a group, I want all current and future saved pages from that domain to automatically be included in the group.
15. As a user removing a domain rule from a group, I want the domain rule to be removed from the group while the underlying domain and pages stay preserved in my Library.

### Add Card & Smart Auto-Suggest
16. As a user viewing the main group pane, I want to see a collapsible "+ Add to group" card, so that I can add items when needed and keep the view clean when reading highlights.
17. As a user inspecting a single page's highlights inside a group, I want the "+ Add to group" card to be hidden, so that it does not distract from reading.
18. As a user typing in the add input, I want instant auto-suggestions matching saved pages and domains from my Library, badged with icons, so that I can add existing research in one keystroke.
19. As a user adding a URL or domain that is not currently in my Library, I want the dropdown to offer `Add URL "..."` or `Add domain "..."`, so that I can curate new sources immediately.
20. As a user adding a domain to a group, I want it to automatically include all pages without forcing me to toggle a "subdomains" checkbox.
21. As a user who has added items to a group, I want the add card to avoid displaying a redundant table listing of existing items, so that the main pane remains compact and uncluttered.

### Browser Tab Sync & IPC
22. As a user on the web app with the Underscore extension installed, I want an "Import from browser" button on the Groups page, so that I can import active Chrome tab groups directly into the web app.
23. As a user importing tab groups, I want non-syncable internal tabs (`chrome://`, `file://`) to be excluded while `localhost` dev servers are retained, so that my groups are portable and safe.
24. As a user importing an open browser tab group with the same name and color as an existing Underscore group, I want the items to smart-merge without creating duplicate groups.
25. As a user clicking "Open in browser" on a group, I want the extension to open its URLs in Chrome tabs bundled into a native tab group with the group's title and color.
26. As a user with a group containing more than 15 pages, I want a confirmation dialog before opening, so that I don't accidentally tab-bomb my browser window.
27. As a user viewing a group that is currently live in Chrome on this device, I want to see a green `Live in Chrome · N tabs` status pill, so that I know the tabs are actively open.
28. As a user viewing an already open group, I want the button to display "Focus in browser", so that clicking it brings the existing Chrome tab group into focus instead of duplicating tabs.
29. As a user deleting a group that is currently live in Chrome, I want the confirmation dialog to keep the tabs open and ungrouped by default, with an optional checkbox to close them, so that I don't lose active browsing work.
30. As a user with a flaky connection, I want group creations, renames, and item additions to apply optimistically and persist offline, so that my flow is never blocked by network latency.

### Export & Portability
31. As a researcher, I want to export a group as a Markdown summary containing page titles, URLs, and highlights, so that I can paste it into notes or share with colleagues.
32. As a user migrating or backing up bookmarks, I want to export a group as an HTML bookmarks file, so that I can import it directly into any browser.
33. As a user sharing a reading list, I want a "Copy all URLs" option in the group menu, so that I can paste the list of links into an email or chat.

---

## Implementation Decisions

### 1. Navigation & Routing
- Promote `/groups` and `/groups/:id` to top-level routes registered in the primary routing configuration.
- Update the primary application navigation sidebar items to maintain distinct destinations: `Home`, `Library`, `Groups`, and `Settings`.
- In `/library`, remove all nested group tabs, rails, and pickers to maintain 100% domain-and-page separation.
- Implement responsive layout switching: desktop (>=768px) renders the two-column master-detail layout; mobile (<768px) mounts the stack navigator (`PhoneGroups` and `PhoneGroupDetail`).

### 2. Left Rail Hierarchy & Visual Alignment
- Style each group row with a 24x24 icon container holding a centered, circular color swatch token (`ColorSwatch`). Swatches strictly utilize the 9 browser-aligned color tokens (`--group-grey`, `--group-blue`, `--group-red`, `--group-yellow`, `--group-green`, `--group-pink`, `--group-purple`, `--group-cyan`, `--group-orange`).
- Sub-nodes under a group:
  - **Domain nodes**: Preceded by a chevron expander and `DomainFavicon`, followed by the hostname and page count badge.
  - **Child page nodes**: Indented under the domain, preceded by `PageDocIco`, rendering the normalized page title or URL.
  - **Standalone page nodes**: Rendered directly at the group root level with `DomainFavicon` and page title.
- Domain children clamping: If a domain contains more than 8 saved pages, render the first 8 and append a button row: `+ N more pages…` that updates the route or subfilter to display the domain's highlights in the main pane.
- Position the "+ New Group" button at the bottom of the group list with full width, dashed or ghost styling, and clear hover feedback conforming to V2 Editorial tokens.

### 3. Collapsible Add Card & Auto-Suggest
- Replace separate page/domain cards with a single `WebGroupAddCard` mounted above the highlights stream in the main pane when viewing a group root (hidden when subfiltering by URL).
- Collapsible toggle: Header displays `+ Add page or domain` with an expand/collapse chevron.
- Unified search combobox:
  - Input with magnifying glass or plus icon and clear button.
  - Dropdown options partitioned into two sections:
    - **Library Domains**: Hostnames matching the query, with domain favicons and item counts.
    - **Library Pages**: Saved pages matching title or URL, with domain favicons and highlight counts.
    - **Custom Action**: If the query is not in the library, options to `Add URL: "..."` (if valid URL) or `Add Domain: "..."` (if valid hostname).
- Remove the "Include subdomains" checkbox. Adding a domain item defaults to covering the hostname and subdomains seamlessly.
- Drop the table listing of existing items inside the card to keep the card compact and avoid duplicating the rail.

### 4. Browser Tab Group Import & Extension IPC Bridge
- Enhance the extension presence bridge to support two-way tab group query and import:
  - IPC Action: `EXTENSION_GET_BROWSER_TAB_GROUPS` → background worker calls `chrome.tabGroups.query` and `chrome.tabs.query`, returning active browser groups, colors, tab counts, and valid URLs.
  - IPC Action: `EXTENSION_FOCUS_TAB_GROUP` → background worker activates the window and focuses the first tab of the specified browser tab group.
- Implement `WebGroupImportDialog` in the web app:
  - Rendered when clicking "Import from browser" in the Groups rail or header.
  - Lists open browser tab groups with checkboxes, color swatches, titles, tab counts, and an informational badge if non-HTTP tabs were skipped.
  - Submitting imports selected tab groups into Underscore via `webGroupRepository.createGroup()` and `webGroupRepository.addItem()`.
  - Smart-merge: If an imported group matches an existing group's name and color, merge items into the existing group and rebind rather than creating a duplicate.

### 5. Live State Indicators & "Open in Browser" Actions
- Live state detection: Compare the active group's `boundDeviceId` and `boundAt` with local extension state.
- Dynamic Action Button:
  - If group is not open: Render `<Button>Open in browser</Button>`.
  - If group is live on current device: Render a green status badge `<span class="group-live-pill">Live in Chrome · N tabs</span>` alongside `<Button variant="outline">Focus in browser</Button>`.
  - If group has >15 pages: Intercept click with `OpenInBrowserConfirmDialog` displaying tab count and requiring confirmation before opening.
- Safe deletion modal:
  - If the group is live locally, display: *"Its N tabs will stay open and become ungrouped."*
  - Include an opt-in checkbox: `☑ Also close these tabs in the browser`.

### 6. Design System & Token Rigor
- All spacing, borders, typography, and colors must strictly utilize V2 Editorial CSS variables:
  - Surfaces: `var(--paper)`, `var(--paper-2)`, `var(--paper-floating)`
  - Ink: `var(--ink)`, `var(--ink-2)`, `var(--ink-3)`
  - Borders & Rules: `var(--rule)`, `var(--rule-soft)`
  - Accents & Radius: `var(--accent)`, `var(--radius)`, `var(--radius-sm)`
  - Group colors: `var(--group-grey)` through `var(--group-orange)`
- Zero arbitrary hex values or Tailwind utility classes in modified files. Ensure borders and paddings align flush without clipping or horizontal overflow.

---

## Testing Decisions

### 1. What Makes a Good Test
- **Behavior-Driven Over Implementation Details**: Tests must interact through user-facing elements (accessible roles, text content, test-ids) rather than asserting internal state or private functions.
- **Strict Referential Safety**: Tests must explicitly assert that adding or removing items from a group leaves the mock Library highlights and domain stores completely intact.
- **Edge Case Coverage**: Tests must cover high-cardinality clamping (>8 pages), large group opening warnings (>15 tabs), duplicate name merging, and offline/error rollbacks.

### 2. Modules to Test & Test Seams
- **Primary Page Seam (`GroupsPage.test.tsx`)**:
  - Test initial render of `/groups` and selection of `/groups/:id`.
  - Test navigation between groups and URL subfilters.
  - Test empty state rendering when zero groups exist.
- **Rail Component Seam (`WebGroupsRailSection.test.tsx`)**:
  - Test group row rendering, color swatch placement, domain expanding/collapsing.
  - Test top-8 page clamping and "+ N more pages…" action.
  - Test row action menu (rename, recolor, remove).
  - Test bottom "+ New Group" button trigger.
- **Add Card Seam (`WebGroupAddCard.test.tsx`)**:
  - Test collapsible toggle expand/collapse behavior.
  - Test combobox auto-suggest against mock library pages and domains.
  - Test adding existing suggestion vs fallback custom URL/domain.
  - Verify absence of subdomain checkbox and absence of duplicate item tables.
- **Browser Sync & Bridge Seam (`web-group-open-in-browser.test.tsx` & `extension-bridge.test.ts`)**:
  - Test "Open in browser" IPC message dispatch with valid payload and timestamp.
  - Test >15 tab confirmation dialog and cancellation/confirmation flows.
  - Test "Focus in browser" IPC dispatch when group is already live.
  - Test browser tab group import flow with mock browser tab groups.
- **Mobile Component Seam (`PhoneGroups.test.tsx` & `PhoneGroupDetail.test.tsx`)**:
  - Test stack navigation transition from list to detail.
  - Test top back button navigation and target hit sizing.

### 3. Prior Art in Codebase
- `tests/unit/web/web-group-open-in-browser.test.tsx` (IPC open group and modal verification).
- `tests/unit/features/groups/browser-tab-sync-settings.test.tsx` (Tab group permission and import picker tests).
- `tests/unit/entrypoints/background-lifecycle.test.ts` (Full background startup and message bus lifecycle).
- `src/features/collections/views/CollectionsView.test.tsx` (Library rail tree and subfilter behavior).

---

## Out of Scope

1. **Editing Group Structure on Mobile / Tablet**: Mobile clients remain consume-only for group highlights and reading per ADR-031; group creation, renaming, and item editing reside on desktop viewports.
2. **Syncing Incognito or Private Windows**: Incognito browser tabs and windows are strictly excluded from tab-group mirroring for user privacy.
3. **Internal Browser Protocols**: Support for `chrome://`, `edge://`, `about:`, `file://`, and extension URLs is strictly prohibited.
4. **Drag-and-Drop Tree Sorting in v1**: Reordering in v1 relies on menu actions (Move to Top, Move Up, Move Down) manipulating fractional index positions; physical HTML5 drag-and-drop handles are deferred to v2.
5. **Multi-User Collaborative Sharing**: Public URL generation and collaborative multi-tenant group edits are deferred to future iterations; data models remain private to the authenticated owner.

---

## Further Notes

- **ADR-032 Alignment**: All data contracts and Chrome messaging protocols conform directly to [ADR-032](../../04-adrs/032-page-groups-and-browser-tab-group-mirroring.md).
- **Graceful Extension Degradation**: If the extension is not detected (user browsing the web app in Safari or without the extension installed), the "Import from browser" button and "Open in browser" actions gracefully hide without errors, allowing full use of manual groups.
- **Export Standards**: Exported HTML bookmarks follow the Netscape Bookmark File format supported natively by Chrome, Firefox, Safari, and Edge.
