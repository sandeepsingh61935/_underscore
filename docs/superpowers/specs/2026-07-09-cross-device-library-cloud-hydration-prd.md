# PRD: Cross-Device Library Cloud Hydration

**Status**: Ready for implementation  
**Date**: 2026-07-09  
**Triage**: `ready-for-agent` (local spec only — not published to issue tracker)

---

## Problem Statement

A user who highlights content while logged into their account on one device expects those highlights to appear in the Library (Collections view) when they sign in with the same email on another device. Today, the Library is empty on a new device even though the user is authenticated and their highlights exist in cloud storage (Supabase `highlights` table, scoped by `user_id` via RLS).

The product promise for Vault / Cloud mode is account-bound persistence: highlights follow the user, not the device. The current behaviour breaks that promise and makes cross-device use unusable.

---

## Solution

When a user authenticates (login event) or when the background service worker starts with an existing session, the extension should **hydrate** local storage from the cloud: fetch all highlights for the authenticated `user_id` from Supabase, backfill any cloud-only rows into IndexedDB (`underscore_vault`), then reload the RepositoryFacade cache so the Library and other read paths see the account's data.

Reads after hydration remain local-first and fast — this is a one-time (per session / per login) pull, not a network call on every Library open.

Additionally, cloud row transformation must include the `url` field so HighlightQueryService can group highlights by domain in the Library.

On logout, **local highlights are preserved** for offline / Local mode use. Hydration adds cloud data alongside existing local data; logout does not wipe IndexedDB.

---

## User Stories

1. As a Cloud mode user, I want my Library to show all my highlights after logging in on a new device, so that I can access my reading history from anywhere.

2. As a Cloud mode user, I want my Library to populate automatically when I open the extension on a device where I was already logged in, so that I do not have to re-login to see my highlights.

3. As a Cloud mode user, I want highlights I created on Device A to appear in the Library on Device B within one session of logging in on Device B, so that cross-device sync feels reliable.

4. As a Cloud mode user, I want the Library to group my cloud-synced highlights by domain (hostname), so that I can browse my collection the same way on every device.

5. As a Cloud mode user, I want opening the Library popup to feel fast after the initial hydration, so that I am not waiting on a network request every time I view Collections.

6. As a Local mode user who is not logged in, I want my device-local highlights to remain visible in the Library, so that offline highlighting still works without an account.

7. As a user who logs out of my account, I want my previously stored local highlights to remain on the device, so that I can continue using Local / offline mode without losing work.

8. As a user who logs into a different account on the same browser profile, I want to see that account's cloud highlights in the Library after hydration, so that each account's data is accessible when signed in.

9. As a user who has both local-only highlights and cloud highlights, I want the Library to show the union of both sets (deduplicated by highlight id), so that nothing disappears when I sign in.

10. As a Cloud mode user, I want highlights created on another device while I am logged in elsewhere to arrive via realtime and also be present after a fresh hydration on a new device, so that sync is consistent across push and pull paths.

11. As a Cloud mode user viewing the Dashboard, I want total highlight count and recent highlights to reflect my cloud data after hydration, so that all Library-adjacent views are consistent.

12. As a Cloud mode user drilling into a domain in Collections, I want to see the correct highlight list for that domain from my account, so that domain drill-down is not empty on a new device.

13. As a user on a slow network, I want hydration to complete without blocking extension startup indefinitely, so that the popup and content scripts remain usable (hydration may complete asynchronously with Library showing a loading or stale-then-fresh state).

14. As a user who goes offline immediately after login, I want highlights that were hydrated before disconnect to remain in the Library, so that offline-first behaviour is preserved per ADR-001.

15. As a user whose cloud fetch fails (network error, auth token expired), I want the extension to retain any existing local highlights and surface a recoverable state, so that a failed hydration does not corrupt or clear local data.

16. As a user with encrypted highlights (vault unlocked), I want hydrated highlights to respect the existing encryption boundary, so that ciphertext stored in cloud is handled consistently with the HighlightEncryptor contract.

17. As a developer maintaining the extension, I want hydration logic isolated in a single service invoked from bootstrap, so that auth-to-data wiring is testable and not scattered across handlers.

18. As a developer, I want `findAll()` to remain a fast local read after hydration, so that the RepositoryFacade write/cache seam is not turned into an implicit network call on every query.

19. As a user switching from Local mode to Cloud mode while logged in, I want newly created highlights to continue dual-writing to cloud, and previously local-only highlights to remain visible locally, so that mode transitions do not cause data loss (pre-login cloud upload is explicitly out of scope for this PRD).

20. As a user opening the web app in the future, I want the same account-bound Library semantics, so that IDataProvider consumers see consistent data (extension implementation is in scope; web app stub adapter is not).

21. As a user with duplicate highlight ids in local and cloud (same id, same content), I want deduplication during backfill so IndexedDB does not throw on unique constraint violations.

22. As a user with the same highlight id but divergent content between local and cloud, I want cloud data to win for account-bound rows during hydration (last-write-wins aligned with existing sync posture), so that the authenticated account is the source of truth for cloud-mode data.

23. As a user logging in on Device B where Device A already uploaded hundreds of highlights, I want hydration to handle large libraries without crashing the service worker, so that batch backfill is bounded and resilient.

24. As a QA engineer, I want a deterministic unit test proving empty local + cloud data yields a non-empty Library aggregation after hydration, so that this regression cannot ship again.

25. As a support engineer diagnosing sync issues, I want structured log lines at hydration start, completion, and failure with counts (local before, cloud fetched, backfilled, final cache size), so that empty-Library reports are debuggable from background logs.

---

## Implementation Decisions

### 1. Hydration trigger points (Option 1)

Introduce a **CloudHydrationService** (name may vary; single responsibility: pull cloud highlights → backfill local → reload facade). Invoke it from background bootstrap in two places:

- **On `AUTH_STATE_CHANGED` when `isAuthenticated` becomes true** — after realtime connection is established (or in parallel; ordering must not block MessageBus registration).
- **On startup when `authManager.currentUser` already exists** — covers session restore on a new browser launch without a fresh login event.

Do **not** change `DualWriteRepository.findAll()` to hit the network on every read. Post-hydration reads stay local-only.

### 2. CloudHydrationService contract

```ts
interface CloudHydrationResult {
  localCountBefore: number;
  cloudCount: number;
  backfilledCount: number;
  skippedCount: number;   // already present locally
  error?: string;         // populated on partial/total failure; never throws away local data
}

interface ICloudHydrationService {
  hydrate(): Promise<CloudHydrationResult>;
}
```

Behaviour:

1. No-op (return zeros) if not authenticated.
2. Read current local highlight ids from IndexedDB via the local repository (or facade readable).
3. Call Supabase `getHighlights()` for the authenticated `user_id` (full library pull, not per-URL).
4. For each cloud highlight not present locally (by id), write to local repository with `skipSync: true` on the dual-write path to avoid echoing back to cloud.
5. Call `repositoryFacade.reload()` so in-memory cache matches IndexedDB.
6. Log result summary at info level.

Hydration must be **idempotent**: running twice does not duplicate rows.

### 3. Merge / deduplication policy

- **Key**: highlight `id`.
- **Cloud-only rows**: backfill to IndexedDB.
- **Local-only rows**: retain (user decision: keep local highlights on logout and across auth).
- **Id collision**: prefer cloud row for fields that Library needs (`url`, `text` / `textEncrypted`, `contentHash`, `createdAt`). Do not delete local-only rows that have no cloud counterpart.

IndexedDB is not user-partitioned today. Hydration **adds** account cloud data; it does not clear local rows on login or logout. Document this as accepted behaviour for this iteration; account-switch isolation is a known follow-up if local rows from User A could appear when User B is logged in (mitigation: only merge rows whose `userId` matches current user or rows without `userId`).

### 4. Supabase row transformation fix

Extend `transformHighlightRow` to map `row.url` onto `HighlightDataV2.url`. Without this, HighlightQueryService skips every cloud row in `getCollections()`, `getHighlightsByDomain()`, and `getDashboardData()` because those methods filter `if (!hl.url) continue`.

Also map `userId` from `row.user_id` when present, for merge policy and future partitioning.

### 5. RepositoryFacade reload sequencing

`repositoryFacade.reload()` already clears cache and re-reads via `findAll()`. Hydration must complete local backfill **before** `reload()` so the facade sees cloud data. Order: backfill IndexedDB → `reload()` facade.

Content script also calls `repositoryFacade.reload()` on `AUTH_STATE_CHANGED`; background hydration should complete first or content reload will still see pre-hydration local state. Prefer: hydration runs in background bootstrap; content reload happens after background hydration completes (or content reload triggers IPC that awaits hydration — choose one path, avoid double-fetch).

Recommended: **background owns hydration**; emit a bus event `CLOUD_HYDRATION_COMPLETE` that content may listen to for `reload()`. If content reload races ahead, Library may flash empty then populate on next open — acceptable if hydration is fast; better to await hydration token in GET_COLLECTIONS when a hydration is in-flight.

### 6. In-flight hydration guard

Use a module-level promise or mutex so concurrent login + startup + tab open do not spawn parallel full-library fetches. Second caller awaits the in-flight hydration.

### 7. Error handling

- Cloud fetch failure: log error, return `CloudHydrationResult` with `error` set, **do not** clear local data or facade cache.
- Partial backfill failure (single row): log per-row error, continue remaining rows, include failed count in result.
- Auth lost mid-hydration: abort remaining backfill, leave partial backfill in place.

### 8. Modules touched

| Area | Change |
|------|--------|
| New `CloudHydrationService` | Core hydration orchestration |
| Background bootstrap | Wire hydration on auth + startup |
| DI container registration | Register and inject hydration service |
| Supabase client transform | Map `url`, `userId` from row |
| Dual-write repository | Expose or reuse `skipSync` backfill path (may already exist via `localRepo.add` direct call from hydration service) |
| Optional: GET_COLLECTIONS handler | Await in-flight hydration before query (prevents empty flash) |

### 9. Architectural alignment

- **ADR-001 (offline-first)**: Hydration is pull-on-auth, not pull-on-every-read. Local IndexedDB remains read source after hydration.
- **ADR-020 (IDataProvider)**: No interface change; ExtensionDataProviderAdapter continues IPC to GET_COLLECTIONS → HighlightQueryService → readable `findAll()`. Fix is below that seam in storage hydration.
- **RepositoryFacade as write/cache seam**: Facade API unchanged; hydration refreshes cache via existing `reload()`.

### 10. Realtime interaction

Existing realtime (WebSocket → EventBridge → CloudMode) pushes incremental changes to open tabs. Hydration is the **initial bulk sync** for new devices. No change to realtime required for this PRD; ensure hydrated rows do not cause duplicate renders when realtime later delivers the same id.

### 11. Encryption boundary

If cloud rows store `textEncrypted` instead of plaintext `text`, hydration backfill stores them as-is. Library text display already uses decrypt IPC where needed. Do not decrypt during hydration.

### 12. Performance bounds

For v1, sequential `localRepo.add` per cloud-only row is acceptable (mirrors existing read-repair in `findByUrl`). If library size exceeds a threshold (e.g. 500), log a warning; batch optimization is out of scope unless trivial.

---

## Testing Decisions

### What makes a good test

Test **observable behaviour at the hydration seam**, not internal call order. Assert inputs (empty local, authenticated user, cloud repository returning highlights with `url`) and outputs (after `hydrate()`, `HighlightQueryService.getCollections()` returns non-empty domain groups). Do not assert that a specific private method was called N times unless that is the only seam.

### Single test seam (confirmed)

**`CloudHydrationService.hydrate()`** — highest useful seam, one module, invoked from bootstrap.

| Given | When | Then |
|-------|------|------|
| Empty local highlight repository | `hydrate()` with authenticated user and cloud repo returning 3 highlights with urls | Local repo contains 3 rows; after facade `reload()`, `HighlightQueryService.getCollections()` returns ≥1 collection with correct counts |
| Local repo already has 1 of 3 cloud ids | `hydrate()` | `backfilledCount === 2`, `skippedCount === 1`, no duplicate id errors |
| User not authenticated | `hydrate()` | No-op, zero counts, cloud not called |
| Cloud fetch throws | `hydrate()` | Local unchanged, `error` set in result |
| Cloud rows missing `url` in transform | `hydrate()` + getCollections | **Regression**: after transform fix, collections non-empty; without fix, test fails |

### Modules under test

1. **CloudHydrationService** — primary unit tests (new file).
2. **Supabase transform** — unit test that `getHighlights()` mapping includes `url` (may live with existing Supabase client tests).
3. **Bootstrap wiring** — optional smoke test that hydration service is registered (extend existing bootstrap tracer bullet; do not require live Supabase).

### Prior art

- `repository-facade-reload.test.ts` — reload clears cache and re-reads underlying repo; hydration must call `reload()` after backfill.
- `highlight-query-service-readable.test.ts` — getCollections delegates to `readable.findAll()` and groups by domain; use real HighlightQueryService atop hydrated readable/facade.
- `bootstrap.test.ts` — DI resolution smoke test; extend only if wiring registration is added.

### Out of scope for tests in this PRD

- E2E Playwright across two physical devices.
- Live Supabase integration (use mocked SupabaseHighlightRepository / mock API client).
- LocalToCloudMigrator flows.

---

## Out of Scope

1. **LocalToCloudMigrator wiring** — uploading highlights created before login or in Local mode without auth. Separate PRD.
2. **Changing `findAll()` to merge cloud on every read** (Option 2).
3. **Wiping IndexedDB on logout** — explicitly rejected; local highlights retained for offline / Local mode.
4. **User-partitioned IndexedDB** — structural migration to namespace local storage by `user_id`; noted as follow-up for account-switch privacy.
5. **Web app WebDataProviderAdapter implementation** — stub remains; extension path only.
6. **Event-sourcing `sync_events` pull/replay** as primary hydration mechanism — use `highlights` table CRUD path already used by DualWriteRepository writes.
7. **Mode storage key mismatch** (`underscore-current-mode` vs `underscore_mode`) — separate bug.
8. **Batch / paginated cloud fetch** for very large libraries — v1 full fetch acceptable with warning log.
9. **Publishing this PRD to GitHub issues** — saved locally per user instruction.

---

## Further Notes

### Root cause summary (for implementers)

Library reads `HighlightQueryService` → `IReadableHighlightRepository.findAll()` → `DualWriteRepository.findAll()` → **IndexedDB only**. Login triggers `repositoryFacade.reload()` which re-reads empty IndexedDB on a new device. Cloud data exists in Supabase but is never pulled for Library. `DualWriteRepository.findByUrl()` already implements cloud merge + read-repair but is unused by Library or the highlight orchestrator's find-by-url handler (which filters facade cache only).

### Secondary defect bundled in this PRD

`transformHighlightRow` omits `url`, so even a naive cloud pull would produce zero Library groups until fixed.

### Account switch caveat

Because IndexedDB is device-global and logout does not clear local data, User B logging in may see User A's local-only highlights in Library until partitioning is implemented. Hydration should tag/backfill only cloud rows for the current `user_id`; local rows without `userId` remain visible per user decision. Flag for follow-up ADR if this becomes a privacy issue.

### Suggested implementation order

1. Fix `transformHighlightRow` (`url`, `userId`).
2. Implement `CloudHydrationService` with unit tests (single seam).
3. Wire into bootstrap (startup + auth).
4. Optional: GET_COLLECTIONS awaits in-flight hydration.
5. Manual QA: Device A create highlights logged in → Device B login → Library populated.
