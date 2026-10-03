# ADR-032: Page Groups and Browser Tab-Group Mirroring

**Status**: Accepted  
**Date**: 2026-09-28  
**Decision-makers**: Product + Engineering (grilled session)  
**Related**: [ADR-001](./001-event-sourcing-for-sync.md), [ADR-029](./029-cloud-first-library-and-integrations.md), [ADR-030](./030-live-mode-and-capability-matrix.md), [ADR-031](./031-mobile-consume-clients.md)  
**PRD**: [Page Groups](../superpowers/specs/2026-09-28-page-groups-prd.md)

---

## Context

Users work across pages from many domains and want to keep them together as a
named group, both inside the app and in the browser's own tab groups.

Codebase facts at decision time:

- "Collections" in Library are **derived** domain buckets computed from
  `highlights.url` (`HighlightQueryService.getCollections`). There is no
  user-named grouping entity.
- A page is not an entity; it is the `url` field on a highlight, normalized by
  `normalizePageUrl`.
- An orphan Supabase `collections` table (not created by any repo migration),
  `createCollection` / `getCollections` in `supabase-client.ts`, and
  `collection.*` sync event types exist with no live call sites.
- Manifest permissions are `activeTab`, `storage`, `alarms`, `identity`. No
  `tabs`, no `tabGroups`, no `optional_permissions`.
- Live Pro sync is dual-write to Supabase plus Realtime on `highlights`
  (extension only) with timestamp last-write-wins. The event-sourcing stack
  (ADR-001) is not the live library path. The web app has no Realtime.
- `presence.content.ts` runs on web app origins and talks to page JS via
  `window.postMessage` (Chrome and Firefox). `externally_connectable` is
  Chrome-only.
- Chrome supports `tabGroups` as an optional permission. Firefox ships
  `tabs.group` / `tabs.ungroup` in 138 and `tabGroups` in 139, and only exposes
  groups with visible tabs. Both browsers may reassign group IDs on session
  restore.

---

## Decision

### 1. New entity: Groups

- User-facing name **Groups**; code name `page_groups`. Distinct from the
  derived domain tree (which stays as-is in Library).
- A group holds **items** of two kinds:
  - `page`: one normalized URL (`normalizePageUrl`), any domain. Highlights are
    not required.
  - `domain`: a **live rule** matching every known page on a hostname (exact
    match by default, optional `include_subdomains` via `tldts`). Known pages =
    pages with highlights plus pages added to any group.
- Membership is many-to-many. A page covered by both a domain rule and an
  explicit item is shown once.
- The orphan `collections` table, its client methods, `collection.*` event
  types, and their docs are removed in separate commits.

### 2. Modes (ADR-029, ADR-030)

| Mode | Groups | Storage | Cloud / web Realtime | Browser mirroring |
| --- | --- | --- | --- | --- |
| `basic` | yes | device IndexedDB only | no | yes (local) |
| `pro`, `pro_xai` | yes | IndexedDB cache + Supabase | yes | yes |

- New `groups` capability, `true` in all modes, in `ModeCapabilities` and
  `MODE_CAPABILITY_MATRIX`.
- Browser mirroring is **not** a capability. It is a user setting
  (`groups_browser_sync_enabled`) that only exists while the optional
  permissions are granted, plus a build-time kill switch
  `GROUPS_BROWSER_SYNC_ENABLED`.
- Guest to account: no automatic merge. Groups join the existing
  `DeviceLibraryUpload` ("Upload from device") flow.

### 3. Handheld clients stay read-only (ADR-031 unchanged)

Phone and tablet show groups and their items, and open pages in a new tab. No
create, rename, delete, add, remove, or reorder on handheld.

### 4. Browser permissions

- `tabs` and `tabGroups` go in `optional_permissions`. They are requested only
  from the Settings toggle via `browser.permissions.request`. Never at install.
- Supported where the API exists: Chromium, and Firefox 139+. Feature-detect at
  runtime; otherwise manual groups only.
- `permissions.onRemoved` turns mirroring off. Every group is kept as a manual
  group.

### 5. Durable app group, live browser link

- The app group is the durable record. A browser tab group is a **live link**
  to it.
- Tab ungrouped or moved out of the linked browser group: the page item is
  removed.
- Tab closed, or the whole browser group closed: the app group is marked
  **closed**, not deleted. "Open in browser" recreates it.
- **One active link per group.** Opening a group on another device moves the
  link; the previous browser group stays but is unlinked.
- The link (browser group ID, window ID, title, color, URL set) is stored in
  `chrome.storage.local` only. The server stores only `bound_device_id`,
  `bound_device_label`, `bound_browser`, `bound_at`.
- On startup, rebind by title + color + highest URL-set overlap above a
  threshold. No match: mark closed. Never create a duplicate.
- First enable: a picker imports existing browser groups (all preselected).
  "Automatically sync new browser tab groups" is on by default.

### 6. Direction of changes

- Browser to app: automatic for linked groups.
- App to browser: applied by the extension that holds the link, after the change
  arrives via Realtime. Rename and recolor update the browser group. Removing a
  page ungroups the tab, never closes it.
- Remote actions never open tabs. "Open in browser" is always a user action. On
  the web it is sent through the `presence.content.ts` postMessage bridge.
- The web app never closes tabs. The popup may offer "Also close the tabs"
  (default off) when deleting a live group.
- Domain rules are app-only. They never auto-group browser tabs and are not
  opened by "Open in browser".

### 7. Privacy

- Ungrouped open tabs are shown only inside the extension. They are never sent to
  the cloud.
- Never synced: incognito/private windows, `chrome://`, `about:`, extension
  pages, `file:` URLs.
- No third-party favicon services.

### 8. Sync and realtime

- Tables `page_groups` and `page_group_items`. Owner-only RLS, soft delete
  (`deleted_at`), no hard `DELETE` for `authenticated` except rows soft-deleted
  more than 30 days ago (only needed when `pg_cron` is unavailable), and trigger-enforced
  owner consistency plus caps (200 groups per user, 500 explicit items per group).
- Conflicts: row-level last-write-wins on `updated_at`. A delete beats a
  concurrent update. Order uses a fractional `position` text column.
- Supabase Realtime `postgres_changes` on both tables, in the extension **and the
  web app** (the web app's first Realtime subscription).
- Soft-deleted rows are permanently purged after 30 days: by a daily `pg_cron`
  job when available, otherwise by the signed-in client during hydration.
- Not built on the event-sourcing stack, vector clocks, or Durable Objects.

### 9. MCP

Read-only tools (`list_groups`, `get_group`) for Integrations. No writes.

---

## Consequences

### Positive

- Users get a cross-domain unit of work that exists in the browser and the app.
- Reuses the live sync pattern (dual-write, Realtime, LWW) instead of reviving
  the unused event-sourcing path.
- Optional permissions keep install-time warnings unchanged.
- Removes the misleading orphan `collections` surface.

### Negative

- The web app now holds a Realtime connection; reconnect and auth-refresh
  handling must be added there.
- Rebinding after restart is heuristic and can mark a group closed that the user
  sees as open.
- Two "grouping" concepts coexist in Library (derived domains, user Groups).
- Store listings and the Firefox `data_collection_permissions` declaration must
  change (`browsingActivity`, optional).

### Neutral

- Handheld remains consume-only; the groups view there is read-only.
- The domain tree and highlight model are unchanged.

---

## Alternatives Considered

### Option 1: Revive the orphan `collections` table and `collection.*` events

**Why not chosen**: Collides with the derived "Collections" name, has no schema
in repo migrations, and depends on the event-sourcing path that is not live.

### Option 2: Browser group as a live mirror (closing deletes)

**Why not chosen**: Closing a window or restarting the browser would destroy
user data. Firefox does not expose groups without visible tabs.

### Option 3: Sync every open tab to the cloud

**Why not chosen**: Uploads full browsing activity. Only grouped pages are needed.

### Option 4: Multiple simultaneous device links

**Why not chosen**: Edits on one machine would open or close tabs on another.

### Option 5: Required (install-time) `tabs` / `tabGroups` permissions

**Why not chosen**: Adds install warnings for a feature many users will not
enable.

---

## Implementation Notes

- Background: `TabGroupSyncService` in `src/background/services/`, registered in
  DI. `tabs.*` / `tabGroups.*` listeners are registered at top level (MV3 worker
  suspension), 500 ms batching, reconcile on startup, and echo suppression so
  applied remote changes are not re-uploaded.
- Data: `IGroupRepository` with IndexedDB (scoped `underscore_basic` /
  `underscore_pro`, version bump) and Supabase implementations behind a
  dual-write `GroupService` (pattern: `TagService`). Offline writes reuse
  `underscore_offline_queue`.
- Migrations: timestamped files for `db push`, plus an
  `apply-page-groups-manual.sql` SQL Editor fallback (see
  `supabase/migrations/README.md`). A grants migration follows the tags pattern.
  The `collections` drop is its own migration (`DROP TABLE IF EXISTS`) after a
  production row-count check.
- Rollout: (1) manual groups on all surfaces, plus `collections` cleanup;
  (2) cloud sync, web Realtime, and device upload; (3) browser mirroring behind
  the kill switch, Chromium first, then Firefox 139+; (4) MCP read tools.

---

## References

- [ADR-029 Cloud-first library](./029-cloud-first-library-and-integrations.md)
- [ADR-030 Live mode and capability matrix](./030-live-mode-and-capability-matrix.md)
- [ADR-031 Mobile consume clients](./031-mobile-consume-clients.md)
- [Chrome `tabGroups`](https://developer.chrome.com/docs/extensions/reference/api/tabGroups)
- [MDN `tabGroups`](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/tabGroups)

---

## Revision History

| Date | Author | Changes |
| ---- | ------ | ------- |
| 2026-09-28 | Product + Engineering | Initial decision from grilled session |
