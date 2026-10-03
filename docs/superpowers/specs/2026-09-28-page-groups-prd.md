# PRD: Page Groups and Browser Tab-Group Sync

**Date**: 2026-09-28  
**Status**: Accepted  
**ADR**: [ADR-032](../../04-adrs/032-page-groups-and-browser-tab-group-mirroring.md)

---

## Problem

Users research across many domains at once. Library only groups by domain, and
the browser's tab groups are invisible to Underscore. There is no way to keep a
named set of pages and domains together, see it on the web, or keep it in step
with the browser's tab groups.

## Goals

1. Users can create, rename, recolor, and delete **Groups** holding whole
   domains and individual pages from any domain.
2. With opt-in browser permission, linked browser tab groups and app groups stay
   in sync in both directions.
3. Signed-in users see group changes live on the web app and other devices.
4. Without the browser permission, the same groups work as manual groups.

## Non-goals

- Editing on phone or tablet (ADR-031: consume only)
- Syncing ungrouped open tabs, incognito, or internal pages
- Auto-grouping browser tabs from domain rules
- Drag-and-drop reordering (v1 uses menu actions)
- Right-click menu and keyboard shortcut entry points (later)
- MCP writes
- Safari, or browsers without a tab-groups API (manual groups only)
- Replacing the domain tree in Library

## Users

| Mode | Gets |
| --- | --- |
| Guest (`basic`) | Manual groups on this device, and browser mirroring |
| Account (`pro`, `pro_xai`) | The same, plus cloud sync, the web app, live updates, and read-only MCP |

---

## Concepts

- **Group**: name, one of 9 colors (`grey`, `blue`, `red`, `yellow`, `green`,
  `pink`, `purple`, `cyan`, `orange`), ordered items.
- **Page item**: a normalized URL (`normalizePageUrl`), title, favicon URL.
- **Domain item**: a hostname rule, exact by default, with optional "include
  subdomains". It shows known pages on that host (pages with highlights, plus
  pages in any group).
- **Group state**:
  - **Live**: linked to a browser group on some device.
  - **Closed**: was linked; the tabs were closed or the link was lost on restart.
  - **Manual**: never linked, or browser sync is off.

---

## Requirements

### Data and sync

1. New tables `page_groups` and `page_group_items`, with owner-only RLS, soft
   delete, and a 30-day purge.
2. Caps: 200 groups per user and 500 explicit items per group, enforced in the
   client and in Postgres. Domain rules do not count toward the 500.
3. Unique item per group on (`kind`, `url_normalized` or `hostname`) among live
   rows.
4. Row-level LWW on `updated_at`; a delete beats a concurrent update; fractional
   `position`.
5. Supabase Realtime on both tables in the extension and the web app.
6. Guest groups stay local. "Upload from device" offers to copy groups
   alongside highlights.
7. The orphan `collections` table, its client methods, and the `collection.*`
   events are removed.

### Browser tab groups (extension)

1. Settings > **Browser tab groups** section: a `Switch`, a one-line explanation
   of what is read and synced, and "Incognito is never included."
2. Toggle on: request `tabs` and `tabGroups` optional permissions, then show the
   import picker of existing browser groups (all preselected).
3. Setting "Automatically sync new browser tab groups": on by default.
4. Ungrouping a tab from a linked group removes the page. Closing tabs or the
   group marks it closed.
5. One device holds the link at a time. The server knows only the device label
   and browser.
6. Rebind after restart by title, color, and URL overlap. No match: mark closed.
7. Web edits reach the linked browser group: rename, recolor, and ungroup a
   removed page. Never open or close tabs remotely.
8. Permission revoked: stop mirroring and toast "Browser tab sync turned off.
   Your groups are kept as manual groups."
9. Never read or sync incognito, `chrome://`, `about:`, extension, or `file:`
   pages.
10. Supported browsers: Chromium, and Firefox 139+. Detect the API at runtime.

### Popup UI (400x600, body-only views)

1. **Library** gets a `SegmentedControl`: **Domains | Groups**. The tab bar is
   unchanged.
2. **Groups list**: color swatch, name, item count, and state line.
3. **Open tabs, not in a group (N)**: a collapsible section at the top of Groups
   when browser sync is on, with "Add to..." on each row. Extension only.
4. **Home "This page" chip**:
   - It reads "In: Research", "In: Research +1", or "+ Group".
   - The dropdown offers "Add this page to...", "Add whole domain to...", and
     "New group...". It also lists current memberships with Remove, shown as
     "via github.com" for domain rules.
5. **Group detail**:
   - Header: name, swatch, and state line ("Live in Chrome on this device · 5
     tabs", "Live on MacBook", or "Closed · last open 2d ago" with an "Open in
     browser" button).
   - Items: domain rows first (expandable to known pages), then page rows.
   - Highlights from the group's pages, using the existing list.
6. **Page row**: favicon (or letter tile), title (or normalized URL), domain in
   `.u-mono`, highlight count, and an open-tab dot.
7. **Row menu**: Move to top, Move up, Move down, and Remove.
8. **Delete group**: an `AlertDialog`. When the group is live, the dialog adds
   "Its N tabs stay open and are ungrouped" and an "Also close the tabs"
   checkbox (default off).
9. **Remove item**: immediate, with a `sonner` toast "Removed from X" and Undo
   for 5 seconds.

### Web app (desktop and tablet-width editing)

1. The Library rail gets a **Groups** section above the domain tree. The route is
   `/library/groups/:id`.
2. The main pane matches popup group detail: items, then highlights scoped to the
   group, with the existing search and filters.
3. **Add page**: a URL input that accepts `http` and `https` only and normalizes
   the URL. The URL stands in as the title until the extension sees the tab.
4. **Add domain**: a hostname input and an "include subdomains" option.
5. **Open in browser**: sent through the `presence.content.ts` bridge. It opens
   the explicit pages only, as a new browser group in the current window, and
   asks first if more than 15 tabs would open. With no extension detected, the
   button reads "Install extension to open as a tab group".
6. **Delete**: an `AlertDialog`. The web app never closes tabs.
7. Library search shows matching group names in a section above domains. The
   filters gain **Group**.

### Phone and tablet (read-only)

1. Library shows a read-only Groups list: swatch, name, count, and a "Live in
   Chrome" or "Closed" label.
2. Group detail lists items. Tapping a page opens it in a new tab
   (`noopener noreferrer`).
3. Group names appear in search. There are no edit controls.

### Visual and accessibility

1. Nine `--group-<color>` tokens in `global.css`, tuned to Editorial, plus a
   `ColorSwatch` primitive. No hex values in `.tsx`.
2. Color is never the only signal; the name and state text always sit alongside
   the swatch.
3. Row menus work from the keyboard. Moves announce the new position via
   `aria-live`.
4. No new animation beyond the shell's `AnimatePresence`. Expanding domain rows
   respects `prefersReducedMotion`.
5. Tap targets are at least 44 px on handheld.

### Empty, guest, and error states

| State | Copy / behavior |
| --- | --- |
| No groups | "Group pages and domains you're working across." with a New group button and a one-time dismissible browser-sync nudge |
| Guest | "Groups are saved on this device. Sign in to sync them to the web app." |
| Cap reached | Inline notice on the create or add control |
| Permission revoked | One toast (see Browser tab groups, requirement 8) |
| Sync failure | Existing sync status indicator |

### Platform and compliance

1. `groups` capability in `ModeCapabilities` and `MODE_CAPABILITY_MATRIX`,
   mirrored in the mode classes and covered by the drift test.
2. Kill switch `GROUPS_BROWSER_SYNC_ENABLED`.
3. Chrome Web Store justification for `tabs` and `tabGroups`. Firefox
   `data_collection_permissions` gains optional `browsingActivity`. `/privacy`
   describes tab-group sync.
4. Analytics allowlist: `group_created`, `group_deleted`, `group_item_added`,
   `browser_sync_enabled`, `browser_sync_disabled`, and
   `group_opened_in_browser`. Counts and browser only, with no URLs, hostnames,
   or names.
5. MCP read tools `list_groups` and `get_group`.

---

## Rollout

1. Manual groups on popup, web, and handheld, stored locally. `collections`
   cleanup in parallel.
2. Cloud sync, web Realtime, and "Upload from device".
3. Browser mirroring behind the kill switch: Chromium, then Firefox 139+.
4. MCP read tools.

## Testing

- **Unit (Vitest)**: domain and subdomain matching, membership dedupe, the rebind
  heuristic, LWW merge, fractional positions, both repositories, `GroupService`,
  and `TabGroupSyncService` against a fake tabs API.
- **E2E (Playwright, `tests/e2e/`)**: create a manual group, add the page and its
  domain, and see the live web update. Browser sync runs on a test build with
  `tabGroups` pre-granted.
- **RLS**: a cross-user read is denied (live Supabase suite).

## Success

- Users can create groups and add pages and domains on every editing surface.
- A signed-in user sees popup edits on the web within seconds, without a
  refresh.
- With permission granted, grouping tabs in Chrome creates or updates the app
  group, and closing the browser leaves the group intact as closed.
- Install-time permissions are unchanged, and no URLs of ungrouped tabs leave
  the device.
