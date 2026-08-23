# Isolated Basic / Pro Highlight Storage

**Date:** 2026-07-11  
**Status:** Ready for implementation  
**Triage label:** `ready-for-agent`  
**Scope:** Extension background + content highlight persistence, auth transitions, library/collections reads

---

## Problem Statement

After sign-out, the extension library still shows all highlights — including those that belonged to the signed-in account. This happens because Basic mode and Pro mode currently share a **single local IndexedDB** (`underscore_vault`). On sign-in, cloud hydration writes into that same store. On sign-out, the background explicitly **retains** local highlights and reloads the facade cache.

From the user's perspective this is wrong:

- Sign-out should feel like leaving the account: account highlights must not remain on this device.
- Basic highlights (guest work) should survive sign-in and sign-out untouched.
- Signing in should show **only** cloud/account highlights — not a mix of guest Basic data and account data.
- Basic and account libraries must never merge.

---

## Solution

Introduce **two physically separate local highlight databases** with **auth-gated routing**:

| Store | When active | Contents | Cloud |
|-------|-------------|----------|-------|
| **Basic local DB** | Logged out / Basic mode | Guest highlights with TTL | Never |
| **Pro local DB** | Logged in (Pro / Pro-xAI) | Account offline cache | Synced with Supabase |

**Rules:**

1. **One active DB at a time** — auth status selects Basic DB or Pro DB; never both.
2. **Sign-in:** Pull cloud highlights into Pro local DB only. **No merge** with Basic local DB. Basic DB stays on disk but is inactive and invisible.
3. **Sign-out:** Wipe Pro local DB entirely. Re-activate Basic local DB. Library shows Basic highlights only.
4. **No cross-contamination** — Basic data never appears in Pro library after sign-in; account data never remains after sign-out.

---

## User Stories

1. As a Basic-mode user, I want my highlights stored only on this device, so that I can highlight without an account.
2. As a Basic-mode user, I want my highlights to survive browser restarts within my TTL setting, so that my reading work is not lost.
3. As a Basic-mode user, I want my library to remain unchanged when I sign in, so that my guest work is preserved separately from my account.
4. As a user signing in for the first time on this device, I want to see only my cloud library, so that I know what synced from my account.
5. As a returning user signing in, I want cloud highlights pulled into local storage for offline use, so that I can read highlights without network.
6. As a signed-in Pro user, I want new highlights saved locally and synced to cloud, so that I have offline access and cross-device sync.
7. As a signed-in Pro user, I want the library to exclude my old Basic highlights, so that guest and account work stay separate.
8. As a user signing out, I want account highlights removed from this device, so that the next person using the browser cannot see my library.
9. As a user signing out, I want to return to my Basic highlights immediately, so that I can continue guest-mode reading.
10. As a user signing out, I want Basic highlights I created before sign-in to still be there, so that sign-out does not erase unrelated guest work.
11. As a privacy-conscious user, I want Pro local DB wiped on sign-out, so that account data does not linger offline.
12. As a user with an empty cloud library, I want an empty Pro library after sign-in, so that Basic highlights are not incorrectly shown as mine.
13. As a user switching from Pro to Basic via sign-out, I want mode to downgrade appropriately, so that I cannot stay in Pro without auth.
14. As a Collections view user, I want the library to reflect only the active store, so that domain counts and exports are correct.
15. As a content-script user highlighting a page while logged out, I want writes to go to Basic DB, so that highlights appear in guest library.
16. As a content-script user highlighting a page while signed in, I want writes to go to Pro DB and cloud, so that highlights sync to my account.
17. As a user opening the popup after sign-out, I want zero account highlights in any view, so that sign-out is trustworthy.
18. As a user opening Settings → Sync library while signed in, I want sync to operate on Pro DB + cloud only, so that Basic data is never uploaded.
19. As a developer, I want auth transitions to be explicit lifecycle hooks, so that storage bugs do not recur.
20. As a developer, I want a single resolver for "which repository is active", so that all reads/writes route consistently.
21. As a user who signed in, picked Pro, and closed the popup during OAuth, I want hydration to complete into Pro DB on next session, so that offline cache is still correct.
22. As a user exporting library while signed in, I want only account highlights exported, so that Basic guest data is not included.
23. As a user exporting library while signed out, I want only Basic highlights exported, so that wiped account data cannot reappear.
24. As a QA engineer, I want deterministic tests for sign-in hydration and sign-out wipe, so that regressions are caught without manual OAuth.
25. As a user with Pro-xAI mode, I want the same storage isolation as Pro, so that AI mode does not share a different persistence rule.
26. As a user signing out, I want vault keys locked and Pro encrypted offline cache cleared, so that E2E account data is not left accessible.
27. As a user signing in on a device that previously had another account's Pro cache, I want that stale cache replaced by my account's cloud data, so that I never see another user's highlights.
28. As a user, I never want Basic highlights auto-uploaded to cloud on sign-in, so that guest browsing stays local-only unless I explicitly highlight while signed in.

---

## Implementation Decisions

### Decision 1: Two physical IndexedDB databases

Replace the single shared `underscore_vault` highlight store with two distinct databases (names illustrative):

- `underscore_basic` — Basic local DB
- `underscore_pro` — Pro local DB (account offline cache)

Each implements the existing `IHighlightRepository` contract (add, update, remove, findAll, clear, etc.). Schema per store remains highlight rows compatible with `HighlightDataV2`.

**Migration note:** Existing `underscore_vault` data must be classified once:
- If user has never signed in → treat as Basic DB migration target.
- If ambiguous → prefer migrating legacy data into Basic DB (safer for guest preservation); Pro DB starts empty until cloud hydration on next sign-in.

Document migration behavior in implementation; do not silently merge vault into Pro.

### Decision 2: Auth-gated repository router (single seam)

Introduce an **`ActiveHighlightRepository`** (name illustrative) — the **one routing seam** for all highlight persistence in the background:

```ts
type StorageScope = 'basic' | 'pro';

interface ActiveHighlightRepository extends IHighlightRepository {
  /** Which physical store is currently active. */
  getActiveScope(): StorageScope;

  /** Switch active scope (called on auth transitions). */
  activateScope(scope: StorageScope): Promise<void>;

  /** Wipe all rows in Pro local DB (sign-out). */
  wipeProLocal(): Promise<void>;
}
```

**Routing rules:**

```
if auth.isAuthenticated && mode in (pro, pro_xai):
  active = pro local repo (+ dual-write to cloud)
else:
  active = basic local repo (local only, no cloud)
```

All existing consumers that today receive a single `IHighlightRepository` / `RepositoryFacade` backed by one IDB must receive the **router-backed** repository instead. The facade cache reloads when scope changes.

Prototype state machine for auth storage lifecycle:

```ts
type AuthStorageEvent =
  | { type: 'SIGNED_IN'; userId: string }
  | { type: 'SIGNED_OUT' };

async function handleAuthStorageEvent(event: AuthStorageEvent): Promise<void> {
  switch (event.type) {
    case 'SIGNED_IN':
      await router.activateScope('pro');
      await cloudHydration.hydrate(); // writes ONLY to Pro local DB
      break;
    case 'SIGNED_OUT':
      await router.wipeProLocal();
      await syncCursor.clear();
      await echoTracker.clear();
      await router.activateScope('basic');
      await repositoryFacade.reload();
      break;
  }
}
```

Wire this from existing auth listeners (AuthManager `onAuthStateChanged`, LOGOUT handler, bootstrap) — do not scatter wipe/hydrate logic across popup/content.

### Decision 3: Sign-in — cloud → Pro local DB only, NO merge

On `SIGNED_IN`:

1. Activate Pro local DB scope.
2. Run `CloudHydrationService.hydrate()` targeting **Pro local DB only**.
3. Do **not** read from Basic local DB for library population.
4. Do **not** copy, merge, or upload Basic highlights to cloud.
5. Basic local DB remains on disk, unmodified, inactive.

If cloud returns zero highlights → Pro library is empty. Basic highlights must not appear.

**Remove** any hydration logic that reads "local before cloud" from a shared store expecting to merge guest + account rows. Hydration baseline for Pro is cloud-first into empty Pro DB (or reconcile Pro DB rows against cloud for same account — not against Basic).

### Decision 4: Sign-out — wipe Pro local DB, preserve Basic

On `SIGNED_OUT`:

1. Lock vault (existing `lockVaultOnSignOut` behavior).
2. Disconnect realtime (existing).
3. **`wipeProLocal()`** — clear all rows in Pro local DB (`clear()` / delete database).
4. Clear library sync cursor and local-write echo tracker (existing partial behavior).
5. Activate Basic local DB scope.
6. Reload repository facade from Basic DB.
7. Broadcast `LIBRARY_DATA_CHANGED` so popup/collections refresh.

**Remove** the current bootstrap comment/behavior: "local highlights are retained on logout."

Basic local DB is **never** wiped by sign-out.

### Decision 5: Dual-write only when Pro scope is active

`DualWriteRepository` local leg must point at **Pro local DB** when authenticated. When logged out, background uses **Basic local DB** directly with **no cloud leg**.

Cloud writes require `authManager.isAuthenticated`. Reads while signed in come from Pro local DB (local-first, same as today).

### Decision 6: Content script and popup reads

Content modes (BasicMode, ProMode) already use `RepositoryFacade` / IPC to background. After routing change, they automatically hit the active scope **if** all IPC paths go through the router-backed repository.

Verify:

- Collections / library queries use active scope only.
- Export uses active scope only.
- Page highlight restore uses active scope only.
- Manual "Sync library" hydrates Pro DB only when authenticated.

No popup-side storage selection — background owns scope.

### Decision 7: Mode vs auth interaction

- **Logged out:** force Basic scope regardless of stale mode preference in storage; downgrade auth-required modes to Basic (existing `usePersistedMode` partial behavior).
- **Logged in:** Pro / Pro-xAI use Pro scope; Basic mode selection while authenticated is a product edge case — if allowed, still use Pro DB + cloud (auth-required modes already gate this). Document: authenticated users always use Pro scope for persistence.

### Decision 8: Account switch (same device, different user)

On sign-in when Pro local DB may contain prior account cache:

- Wipe Pro local DB **before** hydration OR treat hydration as full replace from cloud for new `userId`.
- Never show previous account's offline cache to a new account.

Prefer: wipe Pro local on sign-out; on sign-in hydration into empty Pro DB is sufficient. If sign-in occurs without prior sign-out (token swap), still wipe-or-reconcile Pro DB against new `userId`.

### Decision 9: Vault and encryption

Pro local DB may contain encrypted highlight payloads when vault is unlocked. On sign-out:

- Lock vault (existing).
- Wipe Pro local DB including encrypted rows.
- Do not leave decryptable account blobs in Pro DB after logout.

Vault key material handling stays extension-only; this PRD does not change web vault strategy.

### Decision 10: Offline queue and sync queue

Queues holding pending cloud operations for account writes must be **cleared or scoped to Pro** on sign-out so orphaned account sync jobs do not replay after logout.

---

## Testing Decisions

### What makes a good test

Test **observable storage behavior** at public seams: which DB is active, what library contains after auth transitions, that Basic rows survive sign-in/out and Pro rows do not survive sign-out. Do not test internal IDB open calls or private field names.

### Primary test seam (preferred: one seam)

**`ActiveHighlightRepository` + auth lifecycle handler** (`handleAuthStorageEvent` or equivalent):

| Scenario | Expected |
|----------|----------|
| Logged out, add highlight | Row in Basic DB only; Pro DB empty |
| Signed in, hydrate from cloud | Rows in Pro DB; Basic DB unchanged |
| Signed in, library query | Returns cloud/hydrated Pro rows only, not Basic |
| Signed out after Pro session | Pro DB empty; Basic DB still has pre-sign-in rows |
| Signed in with empty cloud | Pro library empty; Basic rows not visible |
| Sign-in does not copy Basic → Pro | Basic row count unchanged; Pro count = cloud count |

Use in-memory or fake repository doubles behind the router for unit tests (same pattern as `cloud-hydration-service.test.ts`).

### Secondary tests

- **`CloudHydrationService`** — update existing tests to assert hydration target is Pro repo, never Basic repo.
- **`RepositoryFacade.reload()`** — after scope switch, cache reflects correct DB contents.
- **Integration:** auth state change in bootstrap triggers wipe + scope switch (mock auth observer).

### Manual test plan

1. Create Basic highlights → sign in → library shows cloud only (not Basic).
2. Create Pro highlights while signed in → sign out → library shows Basic only; account highlights gone.
3. Sign in again → library matches cloud (not previous offline Pro cache unless re-hydrated from cloud).
4. Export while signed out → Basic only.

### Out of scope for automated tests

Full Supabase OAuth E2E; real IndexedDB in CI (use fakes unless integration suite already has IDB harness).

---

## Out of Scope

- Merging Basic highlights into account library on sign-in
- Uploading Basic highlights to cloud on sign-in
- Preserving Pro local DB after sign-out (explicitly rejected)
- Web SPA highlight storage (extension-only for this PRD)
- Changing Supabase schema or RLS policies
- TTL sweep implementation changes for Basic (existing behavior retained in Basic DB)
- Multi-profile Chrome support
- User-facing "export Basic before sign-in" prompt
- Sync conflict resolution redesign (existing cloud reconciliation within Pro DB only)

---

## Further Notes

### Current codebase gap

Today: single `IndexedDBHighlightRepository` with `DB_NAME = 'underscore_vault'`. Bootstrap on logout calls `repositoryFacade.reload()` and **retains** local highlights. `CloudHydrationService` reads/writes the same repo on login. This PRD replaces that with scoped storage and opposite logout semantics.

### Relationship to auth routing PRD

Popup session-first auth routing (separate spec) fixes sign-in screen restoration. This PRD fixes **data isolation** after auth succeeds or ends. Both are required for trustworthy auth UX.

### Testing seam confirmation

Proposed **single seam:** `ActiveHighlightRepository` + auth storage lifecycle handler. All sign-in hydration and sign-out wipe tests go through this boundary. Confirm before implementation.

### Issue tracker

Publish as GitHub issue with label `ready-for-agent` when `gh` CLI is available:

```bash
gh issue create --title "Isolated Basic / Pro highlight storage" \
  --label ready-for-agent \
  --body-file docs/superpowers/specs/2026-07-11-isolated-basic-pro-highlight-storage.md
```
