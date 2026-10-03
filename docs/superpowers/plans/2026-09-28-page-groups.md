# Page Groups and Browser Tab-Group Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship user-named Groups (domain rules and pages from any domain) in the extension, the web app, and read-only handheld. Signed-in users get cloud sync and live updates. With opt-in permission, groups mirror browser tab groups on Chromium and Firefox 139+.

**Architecture:**
- **Storage:** a new `page_groups` / `page_group_items` entity. Locally it lives in the scoped IndexedDB (`underscore_basic` / `underscore_pro`). Signed-in writes go to Supabase through a dual-write `GroupService` (the `TagService` pattern).
- **Live updates:** Supabase Realtime in the extension and, for the first time, the web app. Row-level LWW on `updated_at`, soft delete, fractional `position`.
- **Browser mirroring:** `TabGroupSyncService` in the background owns it, behind optional permissions and a kill switch.
- **Web to extension:** the `presence.content.ts` bridge becomes a request channel.

**Tech Stack:** WXT MV3, React 19, TypeScript strict, `idb`, Supabase (Postgres, RLS, Realtime), Vitest, Playwright, `tldts`, `sonner`, Radix primitives, V2 Editorial CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-09-28-page-groups-prd.md`

**ADR:** `docs/04-adrs/032-page-groups-and-browser-tab-group-mirroring.md`

## Global Constraints

- Editorial tokens only: no Tailwind, no hex in TSX, no MD3, no Ink & Glass, no Style C aliases. Borders `var(--rule)` / `var(--rule-soft)`, sizes `var(--step-*)`.
- Popup views are body-only: no `PopupShell` / `ModeHeader` / `TabBar` imports, no 400x600 sizing, no extra `AnimatePresence`.
- Views never call `chrome.runtime.sendMessage` or repositories directly; go through hooks. Shared hooks guard `chrome.runtime`.
- All Supabase access goes through repositories. Envelope `{ data, error, meta }` for any new API.
- Handheld (phone and tablet) is read-only (ADR-031). No edit controls render there.
- Never read or sync: incognito, `chrome://`, `about:`, extension pages, `file:`. Ungrouped tabs never leave the device.
- Remote changes never open or close tabs. The web app never closes tabs.
- No third-party favicon services. Reuse `src/shared/favicon/domain-favicon-store.ts` where it fits.
- Product copy: Guest / Free / Account (Paid). Do not add "Pro" in new strings. No emoji.
- Conventional commits `type(scope): subject`, one logical change per commit.
- TDD for pure helpers. `bun run build && bun run type-check` plus the relevant Vitest suites before closing a task. Run `graphify update .` after code changes.

## File map

| Path | Responsibility |
| --- | --- |
| `src/shared/types/page-group.ts` | `PageGroup`, `PageGroupItem`, `GroupColor`, `GroupState` |
| `src/shared/schemas/page-group-schema.ts` | Zod schemas for rows, IPC payloads, caps |
| `src/shared/utils/group-membership.ts` | Domain rule matching, dedupe, "via" resolution |
| `src/shared/utils/fractional-position.ts` | `positionBetween(a, b)` |
| `src/shared/utils/page-group-merge.ts` | LWW merge (delete beats update) |
| `src/shared/utils/syncable-url.ts` | `isSyncableTabUrl` (scheme and incognito guard) |
| `src/shared/repositories/i-group-repository.ts` | Repository interface |
| `src/background/repositories/indexed-db-group-repository.ts` | Local stores in scoped DB |
| `src/background/repositories/supabase-group-repository.ts` | Cloud CRUD |
| `src/background/services/group-service.ts` | Dual-write, caps, offline queue |
| `src/background/services/realtime-group-ingest-service.ts` | Realtime to local IDB |
| `src/background/services/tab-group-sync-service.ts` | Browser mirroring |
| `src/background/services/tab-group-binding-store.ts` | `chrome.storage.local` bindings |
| `src/shared/utils/tab-group-rebind.ts` | Pure rebind heuristic |
| `src/shared/permissions/ensure-tab-group-permissions.ts` | Request, contains, onRemoved |
| `src/features/groups/hooks/*` | `useGroups`, `useGroup`, `useGroupMutations`, `usePageGroupMembership`, `useBrowserTabSync`, `useUngroupedTabs` |
| `src/features/groups/views/GroupsListView.tsx`, `GroupDetailView.tsx` | Popup bodies |
| `src/features/groups/components/*` | `GroupRow`, `GroupItemRow`, `DomainItemRow`, `GroupStateLine`, `GroupChip`, `GroupPickerMenu`, `UngroupedTabsSection`, `DeleteGroupDialog`, `GroupImportPicker`, `GroupEmptyState` |
| `src/ui-system/components/primitives/ColorSwatch.tsx` | 9-color swatch |
| `src/ui-system/theme/global.css` | **Modify**: `--group-<color>` tokens |
| `src/web/lib/web-group-repository.ts` | Web Supabase repository |
| `src/web/hooks/useWebGroups.ts`, `useWebGroupsRealtime.ts` | Web data and Realtime |
| `src/web/components/groups/*` | Web rail section, group pane, add inputs |
| `src/web/components/PhoneGroups.tsx`, `PhoneGroupDetail.tsx` | Read-only handheld |
| `src/web/lib/extension-bridge.ts` | Web side of request channel |
| `src/entrypoints/presence.content.ts` | **Modify**: request relay |
| `supabase/migrations/2026092812xxxx_*.sql` | Tables, RLS, triggers, grants, publication, purge |
| `supabase/migrations/apply-page-groups-manual.sql` | SQL Editor fallback |
| `packages/mcp-server/src/tools/register-tools.ts` | **Modify**: read tools |

---

## Phase 0: Cleanup (parallel, independent)

### Task 0.1: Remove orphan `collections` client and events

**Files:** `src/background/api/supabase-client.ts`, `src/background/events/interfaces/i-event-store.ts`, `src/background/events/event-types.ts`, `src/shared/schemas/sync-event-schema.ts`, `docs/06-security/rls-policies.md`, related tests.

- [x] `rg "createCollection|getCollections\b|collection\.(created|updated|deleted)"` and list every hit. Do not touch `IDataProvider.getCollections` or `HighlightQueryService.getCollections` (derived domain buckets).
- [x] Remove the Supabase client methods and their types.
- [x] Remove the `collection.*` members from `SyncEventType`, the payloads, and the Zod union. Fix any exhaustive switches.
- [x] Remove the `collections` section from `rls-policies.md`.
- [x] Run the tests, build, and type-check.
- [ ] Commit `refactor(sync): remove orphan collections client and event types` (deferred — user no-commit rule).

### Task 0.2: Drop `public.collections`

- [x] Ask the owner for the production row count of `public.collections`. Stop if it is non-zero and unexplained. (Owner confirmed zero rows.)
- [x] Create migration `..._drop_orphan_collections.sql` with `DROP TABLE IF EXISTS public.collections CASCADE;`.
- [x] Add a matching entry to the `supabase/migrations/README.md` table.
- [ ] Commit `chore(db): drop orphan collections table` (deferred — user no-commit rule).

---

## Phase 1: Manual groups (local, all surfaces)

### Task 1.1: Types, schemas, capability

**Files:** `src/shared/types/page-group.ts`, `src/shared/schemas/page-group-schema.ts`, `src/content/modes/mode-interfaces.ts`, `src/shared/utils/mode-capabilities.ts`, `basic-mode.ts`, `pro-mode.ts`, `pro-xai-mode.ts`, `tests/unit/shared/mode-capability-drift.test.ts`, `tests/unit/shared/mode-capabilities.test.ts`.

```ts
export const GROUP_COLORS = ['grey','blue','red','yellow','green','pink','purple','cyan','orange'] as const;
export type GroupColor = (typeof GROUP_COLORS)[number];

export interface PageGroup {
  id: string; name: string; color: GroupColor; position: string;
  boundDeviceId: string | null; boundDeviceLabel: string | null;
  boundBrowser: 'chrome' | 'firefox' | 'edge' | null; boundAt: string | null;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

export type PageGroupItem =
  | { kind: 'page'; urlNormalized: string; title: string | null; faviconUrl: string | null } & ItemBase
  | { kind: 'domain'; hostname: string; includeSubdomains: boolean } & ItemBase;

interface ItemBase {
  id: string; groupId: string; position: string;
  createdAt: string; updatedAt: string; deletedAt: string | null;
}

export const GROUP_CAPS = { groupsPerUser: 200, itemsPerGroup: 500 } as const;
```

- [x] Write failing schema tests: color enum; `faviconUrl` accepts `http(s)` only, no `data:`, max 2048; name 1 to 80 chars, trimmed.
- [x] Implement types and schemas.
- [x] Add `groups: boolean` to `ModeCapabilities`, set it `true` in the matrix and all three mode classes, and extend the drift test.
- [ ] Commit `feat(groups): add page group types, schemas, and capability` (deferred — user no-commit rule).

### Task 1.2: Pure helpers (TDD)

**Files:** `group-membership.ts`, `fractional-position.ts`, `page-group-merge.ts`, `syncable-url.ts`, plus tests.

- [x] `matchesDomainRule(url, rule)`:
  - Exact hostname by default. `includeSubdomains` uses the `tldts` hostname suffix, so `docs.github.com` matches `github.com` and `notgithub.com` does not.
  - `file:` never matches.
- [x] `resolveGroupPages(items, knownPages)` returns deduped pages, each with its source (`explicit` or `via:<hostname>`).
- [x] `membershipsForUrl(url, groups, items)` backs the Home chip ("In: X +1", "via github.com").
- [x] `positionBetween(a?, b?)` returns strings that sort lexicographically. Tests cover 1,000 repeated inserts in the middle staying ordered.
- [x] `mergeRow(local, remote)` applies LWW on `updatedAt`. A tombstone beats a concurrent update. Equal timestamps favor remote.
- [x] `isSyncableTabUrl(url, incognito)` rejects incognito, `chrome:`, `chrome-extension:`, `moz-extension:`, `about:`, `edge:`, `file:`, `view-source:`, and non-http(s) URLs.
- [ ] Commit per helper or as one `feat(groups): add membership, position, and merge helpers` (deferred — user no-commit rule).

### Task 1.3: Local repository

**Files:** `src/shared/repositories/i-group-repository.ts`, `src/background/repositories/indexed-db-group-repository.ts`, `src/shared/constants/highlight-db-version.ts` (**modify**, bump to 3), `indexed-db-highlight-repository.ts` and `indexed-db-tag-repository.ts` (**modify** upgrade callbacks), `repository-container-registration.ts`.

```ts
export interface IGroupRepository {
  listGroups(opts?: { includeDeleted?: boolean }): Promise<PageGroup[]>;
  getGroup(id: string): Promise<PageGroup | null>;
  listItems(groupId: string, opts?: { includeDeleted?: boolean }): Promise<PageGroupItem[]>;
  listAllItems(): Promise<PageGroupItem[]>;
  putGroup(group: PageGroup): Promise<void>;
  putItem(item: PageGroupItem): Promise<void>;
  purgeTombstones(olderThan: Date): Promise<number>;
}
```

- [x] All three repositories share one `openDB` upgrade path. Add object stores `page_groups` (index `position`) and `page_group_items` (indexes `groupId`, `urlNormalized`, `hostname`) at version 3 in a shared upgrade helper, so every opener creates them.
- [x] Write the upgrade test: an existing v2 DB with highlights and tags upgrades to v3 without losing data.
- [x] Implement with soft delete. `list*` excludes tombstones by default.
- [x] Register in the DI container, scoped basic/pro through the existing scope mechanism.
- [ ] Commit `feat(groups): add IndexedDB group repository and DB v3 upgrade` (deferred — user no-commit rule).

### Task 1.4: GroupService (local-only first)

**Files:** `src/background/services/group-service.ts`, test.

- [x] Commands: `createGroup`, `renameGroup`, `recolorGroup`, `deleteGroup`, `restoreGroup` (undo), `addPage`, `addDomain`, `removeItem`, `restoreItem`, `moveItem(to: 'top' | 'up' | 'down')`, `moveGroup`.
- [x] Normalize URLs with `normalizePageUrl` and reject non-http(s). Dedupe on (kind, key) among live items; re-adding a tombstoned item revives it.
- [x] Enforce `GROUP_CAPS` with a typed `GroupCapError`.
- [x] Every write calls `notifyLibraryDataChanged` (or a sibling `GROUPS_DATA_CHANGED`) so the popup refreshes.
- [ ] Commit `feat(groups): add group service with caps and dedupe` (deferred — user no-commit rule).

### Task 1.5: IPC and extension hooks

**Files:** `src/shared/schemas/message-schemas.ts` (**modify**), `src/background.ts` or the message router (**modify**), `src/features/groups/hooks/*`, `tests/unit/schemas/message-schemas.test.ts`.

- [x] Add message types `GROUPS_LIST`, `GROUP_GET`, `GROUP_MUTATE` (discriminated command payload), and `GROUP_MEMBERSHIP_FOR_URL`, validated with Zod. Use the `{ type, payload, timestamp }` format.
- [x] Hooks wrap the message bus and guard `chrome.runtime`. `useGroupMutations` returns promises for toasts and undo.
- [ ] Commit `feat(groups): add group IPC messages and popup hooks` (deferred — user no-commit rule).

### Task 1.6: Tokens and ColorSwatch

Follow `/ui-preflight` (`.agent/workflows/ui-preflight.md`) for all UI tasks.

- [x] Add `--group-grey` through `--group-orange` to `global.css`, tuned to Editorial for light and dark themes, each passing 3:1 contrast against `var(--paper)`.
- [x] Build `ColorSwatch` with `color`, `size` (`sm`/`md`), `variant` (`solid`/`hollow`), and an `aria-hidden` default. Add a picker variant as a radio group with labels.
- [x] Test: renders a token var and has no hex.
- [ ] Commit `feat(ui-system): add group color tokens and ColorSwatch` (deferred — user no-commit rule).

### Task 1.7: Popup Groups list and detail

**Files:** `src/entrypoints/popup/index.tsx`, `src/entrypoints/popup/chrome.ts` (**modify**: `View.GROUP_DETAIL`, back handler), `src/features/collections/views/CollectionsView.tsx` (**modify**: `SegmentedControl` "Domains | Groups"), `src/features/groups/views/*`, `src/features/groups/components/*`.

- [x] Library segment state persists in the session. Domains stays the default.
- [x] `GroupsListView`: rows show swatch, name, count, and `GroupStateLine` (manual shows no line). Add a "New group" action, which opens a name-and-color dialog.
- [x] `GroupDetailView`:
  - Header: name, swatch, state line, and a menu with Rename, Color, Delete.
  - Items: domain rows expandable to resolved pages, then page rows.
  - Below the items, the existing highlight list filtered to the group's pages.
- [x] `GroupItemRow`:
  - Content: favicon or letter tile, title or normalized URL, domain in `.u-mono`, and highlight count.
  - `DropdownMenu`: Move to top / up / down and Remove.
- [x] Remove shows a `sonner` toast "Removed from {name}" with Undo for 5 s, calling `restoreItem`.
- [x] Delete uses `DeleteGroupDialog` (`AlertDialog`) and shows a toast with Undo.
- [x] Empty state and guest copy per the PRD. The guest line reads "Groups are saved on this device. Sign in to sync them to the web app."
- [x] Moves announce through an `aria-live` region.
- [x] Tests: segmented switch, empty state, remove plus undo, and that the delete dialog copy matches the state.
- [ ] Commit `feat(popup): add Groups segment with list and detail views` (deferred — user no-commit rule).

### Task 1.8: Home "This page" chip

**Files:** `src/entrypoints/popup/views/DashboardView.tsx` (**modify**), `GroupChip.tsx`, `GroupPickerMenu.tsx`, `tests/unit/entrypoints/popup/DashboardView.test.tsx`.

- [x] The chip reads "+ Group", "In: X", or "In: X +N".
- [x] The menu offers "Add this page to...", "Add whole domain to...", and "New group...". It lists current memberships with Remove, shown as "via host" for domain rules.
- [x] Hide the chip for non-syncable URLs (incl. incognito via TabContext.incognito).
- [ ] Commit `feat(popup): add group chip to Home this-page line` (deferred — user no-commit rule).

### Task 1.9: Web Library Groups (local-only stub for guests on desktop)

**Files:** `src/web/pages/LibraryPage.tsx` (**modify**), `src/core/routing/AppRoutes.tsx` (**modify**: `/library/groups/:id`), `src/web/components/groups/*`, `src/web/hooks/useWebGroups.ts`.

- [x] Desktop web is Account-only for cloud data. If a guest is on the web, show the Groups rail section with the guest line and no data.
- [x] Add a "Groups" section in `lib-rail` above the domain tree, with a New group control.
- [x] Group pane:
  - Layout: items, then the highlight list scoped to the group's pages, with search and filters unchanged.
  - Add page: URL input, validated and normalized.
  - Add domain: hostname input plus "include subdomains".
  - Actions: row menus and a delete dialog. The web never closes tabs.
- [x] Wire this in Phase 2 when the repository exists. Until then, build against a fake repository in tests only.
- [ ] Commit `feat(web): add Groups rail section and group pane` (deferred — user no-commit rule).

### Task 1.10: Handheld read-only Groups

**Files:** `src/web/components/PhoneLibrary.tsx` (**modify**), `PhoneGroups.tsx`, `PhoneGroupDetail.tsx`, tests.

- [x] The list shows swatch, name, count, and a "Live in Chrome" / "Closed" label. Detail lists items, and tapping a page opens it in a new tab with `noopener noreferrer`.
- [x] Test: no edit controls render for `phone` and `tablet` client kinds. Tap targets are at least 44 px.
- [ ] Commit `feat(web): add read-only Groups on handheld` (deferred — user no-commit rule).

### Task 1.11: Search and filters

**Files:** `src/shared/utils/group-library-search.ts` (**modify**), `src/shared/utils/highlight-filter.ts` or equivalent (**modify**), the popup and web search UIs.

- [x] Group-name matches render as a section above domains.
- [x] Add a "Group" filter next to tags. It filters highlights to the group's resolved pages.
- [ ] Commit `feat(library): search group names and filter by group` (deferred — user no-commit rule).

**Phase 1 exit:** guests and Account users can manage groups in the popup, with Undo, the Home chip, and search. Build and type-check pass.

---

## Phase 2: Cloud sync and web Realtime

### Task 2.1: Migrations

**Files:** `supabase/migrations/20260928120000_page_groups.sql`, `20260928120100_page_groups_grants_authenticated.sql`, `20260928120200_page_groups_purge.sql`, `apply-page-groups-manual.sql`, `supabase/migrations/README.md`.

- [x] Tables:
  - `page_groups (id uuid pk, user_id uuid not null references auth.users on delete cascade, name text check 1..80, color text check in 9, position text not null, bound_device_id text, bound_device_label text, bound_browser text, bound_at timestamptz, created_at, updated_at, deleted_at)`.
  - `page_group_items (id uuid pk, group_id uuid not null references page_groups on delete cascade, user_id uuid not null, kind text check in ('page','domain'), url_normalized text, hostname text, include_subdomains bool default false, title text, favicon_url text check (favicon_url ~ '^https?://' and length <= 2048), position text not null, created_at, updated_at, deleted_at)`. A check ensures a page has a URL and a domain has a hostname.
- [x] Partial unique indexes where `deleted_at is null`: (`group_id`, `url_normalized`) for pages and (`group_id`, `hostname`) for domains. Add an index on `user_id, updated_at` for incremental pull.
- [x] RLS: enable on both tables. `select`, `insert` and `update` use `user_id = auth.uid()`. No delete policy here (Task 2.4 adds a 30-day-tombstone-only one if `pg_cron` is unavailable).
- [x] Triggers:
  - `updated_at` touch on write.
  - Item `user_id` must equal the group's `user_id`.
  - Caps: 200 live groups per user and 500 live `page` items per group; raise with SQLSTATE `P0001` and message `group_cap_exceeded`.
- [x] Add both tables to `supabase_realtime`.
- [x] Grants migration following `20260819120000_tags_grants_authenticated.sql`.
- [x] Purge: if `pg_cron` exists, schedule a daily hard delete where `deleted_at < now() - interval '30 days'`. Otherwise, document the client purge (Task 2.4).
- [x] Write the manual fallback script: a single idempotent copy of the above. Exclude the `collections` drop.
- [ ] Commit `feat(db): add page groups tables, RLS, caps, and realtime` (deferred — user no-commit rule).

### Task 2.2: Supabase repository and dual-write

**Files:** `src/background/repositories/supabase-group-repository.ts`, `src/background/services/group-service.ts` (**modify**), `src/background/services/offline-queue-service.ts` (**modify**: entity `group` / `group_item`), tests.

- [x] Write local first, then cloud asynchronously. On failure, enqueue the operation. Map the `group_cap_exceeded` error to `GroupCapError`.
- [x] Record local writes in `local-write-echo-tracker.ts` so Realtime echoes are skipped.
- [ ] Commit `feat(groups): dual-write groups to Supabase with offline queue` (deferred — user no-commit rule).

### Task 2.3: Extension Realtime ingest and hydration

**Files:** `src/background/realtime/websocket-client.ts` (**modify**: second channel `groups-sync` for both tables, filtered by `user_id`), `realtime-group-ingest-service.ts`, `src/background/services/cloud-hydration-service.ts` (**modify**), `library-sync-cursor.ts` (**modify**: separate groups cursor), tests.

- [x] Ingest applies `mergeRow` and writes with `skipSync`, then notifies the popup.
- [x] Hydrate on sign-in, on connect, and on `SYNC_LIBRARY`. Incremental pull uses `updated_at >= cursor` (`>=` + idempotent mergeRow, highlight precedent) and includes tombstones.
- [x] The existing sign-out wipe also clears the Pro group stores and the groups cursor.
- [x] Test the reconnect path with `tests/unit/background/realtime/resilience.test.ts` patterns.
- [ ] Commit `feat(sync): ingest and hydrate page groups via Realtime` (deferred — user no-commit rule).

### Task 2.4: Tombstone purge (client fallback)

- [x] On hydration, call `purgeTombstones(now - 30d)` on the local stores.
- [x] Check whether `pg_cron` is enabled on the linked project. If it is, the Task 2.1 daily job does the cloud purge. Stop here. (Cannot verify from this env — client fallback shipped unconditionally as safe no-op superset.)
- [x] If it is not: add a `delete` policy on both tables limited to `user_id = auth.uid() and deleted_at is not null and deleted_at < now() - interval '30 days'`. Have the client batch-delete its own expired tombstones after hydration.
- [x] Test: a row soft-deleted 29 days ago cannot be deleted, a row deleted 31 days ago can, and live rows can never be hard-deleted.
- [ ] Commit `feat(groups): purge group tombstones after 30 days` (deferred — user no-commit rule).

### Task 2.5: Web repository, hooks, and Realtime

**Files:** `src/web/lib/web-group-repository.ts`, `src/web/hooks/useWebGroups.ts`, `src/web/hooks/useWebGroupsRealtime.ts`, `src/web/lib/web-library-cache.ts` (**modify**: groups stores), tests.

- [x] The repository wraps the web Supabase client. Mutations follow the same command set as `GroupService`.
- [x] Realtime:
  - Subscribe to one channel per signed-in session, apply `mergeRow` to the cache and state, and unsubscribe on sign-out or unmount.
  - Handle token refresh with `realtime.setAuth`, and reconnect with backoff.
  - Refetch after a reconnect to cover the gap.
- [x] Wire the Task 1.9 and 1.10 components to real data.
- [x] Test: an optimistic mutation rolls back on error, and a Realtime event updates the pane without a refetch.
- [ ] Commit `feat(web): sync groups with Supabase Realtime` (deferred — user no-commit rule).

### Task 2.6: Upload from device includes groups

**Files:** `src/background/services/device-library-upload.ts` (**modify**), the preview message and UI copy.

- [ ] The preview counts groups and items not yet in the account (matched by name and color plus item keys). Upload copies them and keeps the Basic copies.
- [ ] Commit `feat(groups): include groups in upload from device`.

**Phase 2 exit:** a popup edit appears on the web within seconds without a refresh, offline edits flush later, and the RLS check passes.

---

## Phase 3: Browser tab-group mirroring

### Task 3.1: Manifest, permissions, kill switch

**Files:** `wxt.config.ts` (**modify**), `src/shared/permissions/ensure-tab-group-permissions.ts`, `src/shared/entitlement/commercial.ts` or a sibling `groups-flags.ts`, tests.

- [ ] Add `optional_permissions: ['tabs', 'tabGroups']`. Add optional `browsingActivity` to Firefox `data_collection_permissions`.
- [ ] `GROUPS_BROWSER_SYNC_ENABLED` constant.
- [ ] `requestTabGroupPermissions()`, `hasTabGroupPermissions()`, `isTabGroupApiAvailable()` (feature-detects `browser.tabGroups?.query` and `browser.tabs.group`), and `onTabGroupPermissionsRemoved(cb)`.
- [ ] Commit `feat(extension): add optional tabs and tabGroups permissions`.

### Task 3.2: Binding store and rebind heuristic (TDD)

**Files:** `tab-group-binding-store.ts`, `src/shared/utils/tab-group-rebind.ts`, tests.

```ts
interface TabGroupBinding {
  appGroupId: string; browserGroupId: number; windowId: number;
  title: string; color: GroupColor; urls: string[]; lastSeenAt: string;
}
```

- [ ] `rebind(bindings, liveGroups)`:
  - Score candidates: title equal +2, color equal +1, plus the Jaccard overlap of normalized URLs.
  - Accept a match when title matches and overlap is at least 0.5, or when overlap is at least 0.8.
  - Assign one-to-one, greedy by score. Unmatched bindings become closed.
- [ ] Tests cover: rename during downtime, two groups with the same title, a Firefox group with no visible tabs being absent, and no duplicate created.
- [ ] Commit `feat(groups): add tab group binding store and rebind heuristic`.

### Task 3.3: TabGroupSyncService

**Files:** `src/background/services/tab-group-sync-service.ts`, DI registration, `src/background/bootstrap.ts` (**modify**: top-level listener registration), tests with a fake `tabs` / `tabGroups` API.

- [ ] Register listeners at the top level of the background script. Each handler checks the setting, permission, and kill switch, and returns early if any is off.
  - `tabGroups.onCreated`, `onUpdated`, `onRemoved`, `onMoved`.
  - `tabs.onUpdated` (url, title, favIconUrl, groupId), `onRemoved`, `onAttached`, `onDetached`.
- [ ] Batch in 500 ms windows per group, then diff against the binding.
  - A tab joins a linked group: add a page item if the URL is syncable.
  - A tab leaves the group without closing: remove the item.
  - A tab closes: keep the item. If no tabs remain in the group, mark it closed: clear `bound_*` and remove the binding.
  - Title or color changes: update the app group.
  - A new browser group appears and auto-sync is on: create the app group and binding.
- [ ] Remote to browser: on a group change for a group bound to this device's `device-id-service` ID, apply rename or recolor via `tabGroups.update`, and apply item removal via `tabs.ungroup`. Never call `tabs.create` or `tabs.remove` here.
- [ ] Echo suppression: mark browser ops the service applies, and ignore the events they cause.
- [ ] Startup and `runtime.onStartup`: run `rebind`, then reconcile each matched group's membership.
- [ ] Link takeover: when another device sets `bound_device_id`, remove the local binding and leave the browser group alone.
- [ ] The title and favicon backfill for web-added pages happens when a syncable tab matching `urlNormalized` updates.
- [ ] Commit `feat(groups): mirror browser tab groups with app groups`.

### Task 3.4: Open in browser

**Files:** `tab-group-sync-service.ts` (**modify**: `openInBrowser(groupId)`), the IPC message `GROUP_OPEN_IN_BROWSER`, and the popup action.

- [ ] Opens explicit page items only (not domain rules) in the current window, then calls `tabs.group` and `tabGroups.update` with title and color.
- [ ] Sets `bound_*` to this device, which takes the link over from any other device.
- [ ] More than 15 tabs returns `needsConfirm`, and the UI shows a confirm dialog.
- [ ] Commit `feat(groups): open a group as a browser tab group`.

### Task 3.5: Web to extension request channel

**Files:** `src/entrypoints/presence.content.ts` (**modify**), `src/shared/extension/web-app-origin-matches.ts` (read-only), `src/web/lib/extension-bridge.ts`, `src/web/extension-presence-context.tsx` (**modify**), tests.

- [ ] Page to content script: `window.postMessage({ source: 'underscore-web', type: 'GROUP_OPEN_IN_BROWSER', requestId, payload: { groupId } })`.
- [ ] The content script checks `event.origin` against `WEB_APP_ORIGIN_MATCHES` and `event.source === window`, validates with Zod, and allows only `GROUP_OPEN_IN_BROWSER`. It relays through `browser.runtime.sendMessage` and posts `{ requestId, ok, needsConfirm? }` back.
- [ ] The background re-checks that the sender URL is a web app origin, and that the signed-in user owns the group.
- [ ] Web button:
  - Label: "Open in browser". With no extension detected, it reads "Install extension to open as a tab group" and links to `/install`.
  - Show the confirm dialog when the response carries `needsConfirm`.
- [ ] Tests: foreign origin and unknown type are rejected.
- [ ] Commit `feat(web): open groups in browser via presence bridge`.

### Task 3.6: Settings, import picker, ungrouped tabs, states

**Files:** `src/pages/SettingsPage.tsx` (**modify**), `GroupImportPicker.tsx`, `UngroupedTabsSection.tsx`, `GroupStateLine.tsx` (**modify**), `useBrowserTabSync.ts`, `useUngroupedTabs.ts`, `DeleteGroupDialog.tsx` (**modify**), tests.

- [ ] Settings: a "Browser tab groups" section.
  - Controls: `Switch`, the explanation line, "Incognito is never included.", and the "Automatically sync new browser tab groups" sub-switch.
  - Hidden when the API is unavailable or the kill switch is off.
- [ ] Toggle on:
  - Request the permissions, then open the import picker with all groups preselected.
  - On confirm, import the selected groups.
  - If permission is denied, leave the switch off and show a neutral inline note.
- [ ] Revocation:
  - Toast "Browser tab sync turned off. Your groups are kept as manual groups."
  - Clear the local bindings and the `bound_*` fields for this device.
- [ ] Ungrouped tabs section:
  - Collapsible, extension-only, syncable URLs only, with "Add to..." per row.
  - Read live through `tabs.query`, never persisted to the cloud.
- [ ] State line:
  - Live on this device: "Live in {Browser} on this device · N tabs".
  - Live elsewhere: "Live on {label}".
  - Closed: "Closed · last open {relative}" plus an Open in browser button.
- [ ] Delete dialog for a live group on this device: "Its N tabs stay open and are ungrouped" plus an "Also close the tabs" checkbox (popup only, default off). The service ungroups and optionally closes the tabs.
- [ ] Nudge: a one-time dismissible card in the Groups empty state that links to Settings.
- [ ] Commit per component, or as `feat(groups): add browser tab sync settings and states`.

### Task 3.7: Store and privacy

- [ ] Update `/privacy` to describe tab-group sync and state that ungrouped tabs and incognito are never sent.
- [ ] Draft the Chrome Web Store justification text for `tabs` and `tabGroups` in `docs/` (under the existing store-listing doc, if present).
- [ ] Commit `docs(privacy): describe browser tab group sync`.

**Phase 3 exit:** with the permission granted on Chrome, grouping tabs creates the app group. Ungrouping removes the item. Closing the window leaves the group closed. A restart rebinds. A web rename updates the browser group. Then repeat on Firefox 139+.

---

## Phase 4: MCP read tools and analytics

### Task 4.1: MCP tools

**Files:** `packages/mcp-server/src/tools/register-tools.ts` (**modify**), the cloud adapter under `packages/mcp-server/src/cloud/`, `__tests__`.

- [ ] `list_groups()` returns `{ id, name, color, itemCount, state }`.
- [ ] `get_group({ id })` returns the items with their resolved pages and highlight counts. Tombstones are excluded.
- [ ] Both are read-only and scoped to the token's user.
- [ ] Commit `feat(mcp): add read-only group tools`.

### Task 4.2: Analytics events

**Files:** `src/shared/analytics/parse-analytics-event.ts` (**modify**) and its test, `functions/api/analytics.ts` (only if the allowlist lives there), plus call sites.

- [ ] Allowlist `group_created`, `group_deleted`, `group_item_added` (props `kind`), `browser_sync_enabled`, `browser_sync_disabled`, and `group_opened_in_browser` (props `tabCount`, `browser`).
- [ ] Test that the parser rejects URL, hostname, and name props.
- [ ] Commit `feat(analytics): add privacy-safe group events`.

---

## Cross-cutting tests

- [ ] RLS: add to `tests/e2e/live-supabase.test.ts`. User B cannot select, update, or insert items into user A's group. The cap trigger fires at 201 groups.
- [ ] E2E (`tests/e2e/`):
  - Create a manual group in the popup, add the page and its domain via the Home chip, and see it on the web without a refresh.
  - Browser sync on a test build whose manifest grants `tabGroups` and `tabs` up front: group two tabs, see the app group, then ungroup one and see it removed.
- [ ] Harness: run the existing UI lint fixtures (Tailwind, hex, and token checks) over the new files.

## Definition of done (per phase)

- [ ] `bun run build && bun run type-check` green.
- [ ] New and changed Vitest suites green. Services and repositories at 80%+ coverage.
- [ ] Phase exit criteria verified by hand in Chrome (Phase 3 also in Firefox 139+).
- [ ] `graphify update .` run.
- [ ] PRD checkboxes for the phase reflected in the PR description.
