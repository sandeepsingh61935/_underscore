# PRD: Highlight persistence low- & medium-ripple follow-ups

**Date:** 2026-07-17  
**Status:** Ready for implementation  
**Priority:** Medium (quality + durability hardening; product paths already usable)  
**Scope:** Narrow follow-ups after pro_xai persistence / home recency work  
**Does not include:** High-ripple items — see  
[`2026-07-17-highlight-persistence-high-ripple-tech-debt.md`](./2026-07-17-highlight-persistence-high-ripple-tech-debt.md)

---

## Problem statement

Product-critical bugs (wrong storage scope, lost paint on reload, empty library, home navigation, non-recent lists) were fixed with local changes. Code review still found **gaps that reintroduce flakiness** or **duplicate policy** without needing a platform rewrite:

1. **Create path may not await durable write** — modes call `facade.add` (fire-and-forget) even though `addPersisted` and IPC retry exist.  
2. **IPC retry logic is duplicated** — write adapter and read adapter will drift.  
3. **Restore/findByUrl can full-scan** the library instead of using `findByUrl`.  
4. **Activity sort is applied multiple times** (service + hooks + dashboard).  
5. **Hydrate failures can be silent** — hard to debug sign-in library empties.  
6. **Bridge update/remove** notify the library before durable IDB ack.  
7. **Small UI/type nits** that grow spaghetti if left indefinitely (medium tier).

These are **not** "rewrite the facade API" or "one DTO monorepo-wide." They are **surgical** fixes with bounded call sites.

---

## Goals

| Goal | Measure |
|------|---------|
| G1 | Create highlight does not complete until background durable write has been attempted/awaited on the create path |
| G2 | One shared IPC retry policy for content ↔ background cold SW |
| G3 | Page restore `findByUrl` is O(url index), not full `findAll` |
| G4 | Activity ordering has a single source of truth (query/service layer) |
| G5 | Auth hydrate failures are visible in logs without changing product behavior |
| G6 | Library UI does not refresh on a half-applied update/remove when cheap to fix |
| G7 | No public API change that forces a repo-wide await rewrite |

## Non-goals

- Global async `RepositoryFacade.add` / deleting fire-and-forget for all call sites  
- Unifying all `Highlight` types across extension/web/MCP  
- Redesigning auth-storage lifecycle ownership end-to-end  
- Popup React Router migration  
- Full create→persist→restore pipeline consolidation  
- Guest ↔ account data merge  

---

## Ripple classification

### Low ripple (ship first)

| ID | Work | Typical files | Blast radius |
|----|------|---------------|--------------|
| **L1** | Create paths: `await facade.addPersisted(...)` | `basic-mode.ts`, `cloud-mode-service.ts` (and Pro if it still uses `add`) | 2–4 call sites |
| **L2** | Shared `sendBackgroundIpcWithRetry` | New util + `local-cache-ipc-repository.ts` + `ipc-readable-highlight-repository.ts` | 2 adapters |
| **L3** | Orchestrator `onFindByUrl` uses `findByUrl` | `background-highlight-orchestrator.ts` | 1 method |
| **L4** | Sort once; drop identity map / re-sort in dashboard | `useDashboardData.ts` (optional: factory if service already sorts) | 1–2 hooks |
| **L5** | Log hydrate errors in `SIGNED_IN` | `auth-storage-lifecycle.ts` | 1 catch |
| **L6** | Bridge `onUpdate` / `onRemove` await durable API before notify | `background-highlight-orchestrator.ts`, maybe `addPersisted`-style update | Bridge only |
| **L7** | Regression test: create awaits durable/IPC | unit tests for mode or cloud service with mock facade | tests only |

### Medium ripple (optional second PR)

| ID | Work | Why medium (not high) |
|----|------|------------------------|
| **M1** | Deduplicate Recent list rendering in `DashboardView` (guest vs account) | UI only; no storage contracts |
| **M2** | Delete or re-export dead `useHighlightsByDomain.ts` if Factory is sole consumer | Touch imports/tests only if any leftover |
| **M3** | Align web Supabase domain fetch sort with shared `compareByHighlightActivityDesc` only (already partial) | Web hook only |
| **M4** | Document dual `add` vs `addPersisted` in facade JSDoc + short ADR note | Docs + comments; no behavior change |
| **M5** | Optional: avoid double facade reload when hydrate already reloaded (flag/result only, no lifecycle redesign) | Touch hydrate + lifecycle carefully with tests |

Medium items may span more files or need light product judgment; they still **must not** rewrite shared write APIs globally.

---

## User stories

1. As a signed-in user, when I create a highlight, I want the write finished before the API returns so a quick reload still restores paint.  
2. As a user opening a page after SW sleep, I want restore IPC to retry so cold start does not drop paint.  
3. As a library user, I want Recent and domain lists ordered by last activity without random UI-only reordering bugs.  
4. As a developer debugging empty library after login, I want hydrate failures logged.  
5. As a library user deleting/updating a highlight, I want the list refresh to match durable state (no flicker of stale rows when fixable on the bridge).  
6. As a maintainer, I want one IPC retry helper so write and read policies do not diverge.  

---

## Functional requirements

### L1 — Create-path durability

- **Must:** Basic `createHighlight` and Pro `saveHighlight` / create path await `repositoryFacade.addPersisted` (or equivalent that awaits `LocalCacheIpcRepository.add`).  
- **Must not:** Change signature of every `facade.add` caller.  
- **Must:** Preserve existing payload fields (`url`, selector, `updatedAt`, UUID id).  

### L2 — Shared IPC retry

- **Must:** Single helper used by content write composite and content read adapter.  
- **Must:** Preserve write semantics (exhaust → log, do not throw if product still requires soft failure) **or** document intentional difference via options (`onExhausted: 'log' | 'throw'`).  
- **Must:** Same attempt count / backoff constants unless tests update intentionally.  

### L3 — findByUrl efficiency

- **Must:** Prefer `getReadable().findByUrl(normalized)` (or DualWrite equivalent).  
- **May:** Merge facade cache for in-flight rows if still required after L1.  
- **Must not:** Change response shape of `IPC_HIGHLIGHTS_FIND_BY_URL`.  

### L4 — Single sort boundary

- **Must:** `HighlightQueryService` remains authoritative for activity sort on dashboard/domain lists.  
- **Must:** Remove no-op map + redundant re-sort from `useDashboardData` (and avoid double-sort in factory if service already sorted and IPC preserves order).  
- **Note:** Structured clone preserves array order; re-sort only if dates need rehydration and sort is unstable — prefer rehydrate dates without re-implementing policy.  

### L5 — Hydrate observability

- **Must:** Log error (logger.warn/error) when cloud hydrate throws on sign-in.  
- **Must:** Still activate pro scope + reload facade (existing behavior).  

### L6 — Bridge update/remove durability

- **Must:** Await durable remove/update before `notifyLibraryDataChanged` for bridge IPC.  
- **May:** Add `updatePersisted` if missing (mirror `removePersisted` / `addPersisted`).  
- **Must not:** Rewrite mode-layer delete flows (popup delete service may already be separate).  

### L7 — Tests

- **Must:** Test create path waits for mock `addPersisted` / IPC before resolving.  
- **Must:** Existing retry / activity-sort / lifecycle tests stay green.  

### Medium (M1–M5)

- Optional; each PR should state acceptance in its own checklist.  
- M4 is recommended alongside L1 so the dual API is intentional, not accidental.  

---

## Acceptance criteria (P0 = Low tier)

| ID | Criterion |
|----|-----------|
| A1 | Creating a highlight in Basic and Pro awaits durable write on the create path |
| A2 | Unit/integration test fails if create resolves before mock persist completes |
| A3 | Write + read IPC share one retry helper (or one module with explicit options) |
| A4 | `onFindByUrl` does not call `findAll` for the happy path |
| A5 | Dashboard Recent order matches service order; no identity-map re-sort |
| A6 | Failed hydrate on sign-in produces a log line with error message |
| A7 | Bridge remove/update awaits durable store before library notify |
| A8 | `npm run type-check` + targeted vitest suite green |
| A9 | Manual: pro_xai create → immediate hard reload tab → paint still present (best-effort stress) |

Medium tier (P1) if included:

| ID | Criterion |
|----|-----------|
| A10 | Dashboard guest/account Recent list is one shared render helper |
| A11 | No unused domain-highlights hook left without re-export or delete |
| A12 | Facade documents when to use `add` vs `addPersisted` |

---

## Implementation plan (suggested PR slices)

### PR-A — Durability (L1 + L7 + M4 docs)

1. `CloudModeService.saveHighlight` → `await facade.addPersisted`  
2. `BasicMode.createHighlight` (and createFromData if it writes) → `addPersisted`  
3. Test create awaits persist  
4. JSDoc on facade dual API  

### PR-B — IPC + restore path (L2 + L3)

1. Extract retry helper  
2. Wire both adapters  
3. Orchestrator findByUrl  

### PR-C — Library polish (L4 + L5 + L6)

1. Dashboard sort cleanup  
2. Hydrate log  
3. Bridge durable update/remove  

### PR-D — Medium optional (M1–M3, M5)

Only after PR-A–C green.

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Awaiting create adds latency on cold SW | Already pay retry cost; user prefers correctness; cap retries (existing 3) |
| `addPersisted` not on content facade type | Content facade is same class; ensure method exists (already does) |
| findByUrl URL normalization mismatch | Keep `normalizePageUrl` on both sides; test with query/hash |
| Soft-fail write vs hard-fail read after shared helper | Options bag on helper; tests for both modes |

---

## Out of scope / see high-ripple doc

| Item | Doc |
|------|-----|
| Global durable `add` rewrite | High-ripple §1 |
| One monorepo Highlight DTO | High-ripple §2 |
| Unify pro/basic query architecture | High-ripple §3 |
| Auth lifecycle single reload owner (full redesign) | High-ripple §4 |
| Popup MemoryRouter product migration | High-ripple §5 |
| Full pipeline consolidation epic | High-ripple §6 |

---

## Dependencies

- Existing: `addPersisted` / `removePersisted` on `RepositoryFacade`  
- Existing: IPC retry constants pattern in content repositories  
- Existing: `highlightActivityMs` / `compareByHighlightActivityDesc`  
- Existing: `notifyLibraryDataChanged`  
- Related product specs: isolated basic/pro storage, cross-device hydration, this high-ripple debt doc  

---

## Success definition

After PR-A–C:

- Create → reload paint is robust without rewriting the whole facade.  
- Cold SW restore/read and write share one retry policy.  
- Library notifications better match durable state.  
- Maintainers can distinguish **this PRD** (safe now) from **high-ripple debt** (scheduled later).  

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-17 | Initial PRD from code review + low-ripple todo list |
