# Tech debt: high-ripple highlight persistence & library work

**Status:** Deferred (do not mix into product firefights)  
**Date:** 2026-07-17  
**Area:** Content create → background store → restore paint → library/home  
**Audience:** Future implementers after low-ripple follow-ups land  

## Context

Mid-2026 fixes addressed signed-in **pro / pro_xai** failures:

- Auth storage scope race (Pro DB vs Basic facade)
- Durable bridge `addPersisted` + library notify
- UUID ids, always set `url` / `updatedAt` on save
- IPC write retry + read `findByUrl` retry
- Home current-page navigation via popup view callbacks (not React Router)
- Activity sort (`updatedAt ?? createdAt`) for highlights / sections / domains

Those product fixes are intentional and largely **local**. A strict code review still found **structural** work that would **cascade** across call sites if done now. This document records that work so it is not lost and is not mistaken for "simple cleanup."

### Related low- / medium-ripple work (do first / separately)

See **[PRD: low- & medium-ripple follow-ups](./2026-07-17-highlight-persistence-low-medium-ripple-prd.md)** for implementable checklist items (create-path `addPersisted`, shared IPC retry, `findByUrl` not `findAll`, sort once, hydrate logging, bridge durable update/remove, tests, optional UI/docs medium items). This document is **only** for cascading / deferred architecture work.

### Why these are "major"

| Signal | Meaning |
|--------|---------|
| Public API change | Callers across content + background must update |
| Auth lifecycle | Startup, login, logout, hydrate interact |
| Type / DTO unification | IPC, popup, web, MCP all re-map |
| Parallel storage stories | Easy to re-break empty library / lost paint |

---

## 1. Durable `RepositoryFacade.add` (global)

### Problem

Two write stories:

- `add` / `update` / `remove` — fire-and-forget async persist  
- `addPersisted` / `removePersisted` — awaited durable  

Content create (Basic / Pro via `CloudModeService.saveHighlight`) historically called **`facade.add`**, so create could return before IPC/IDB finished. Bridge path uses `addPersisted`. That split is easy to misuse.

### Major fix

- Prefer **one** write contract for "must survive reload"  
- Options:  
  - Make `add` async and await at all call sites, **or**  
  - Delete non-durable writes for highlight CRUD and force `*Persisted` only, with rehydrate/evict kept for cache-only cases  

### Ripple

- Modes, restore/split, cloud service, tests, content + background  
- Sync → async graph; missed `await` causes races  

### Exit criteria

- Create cannot resolve before durable store ack  
- Unit/integration test: create → kill SW / reload → paint + library  
- No fire-and-forget on the create path  

### Suggested approach

1. Create-path-only `addPersisted` (low ripple) first.  
2. Inventory all `facade.add` / `update` / `remove` call sites.  
3. Dedicated PR: API change + codemod/checklist + tests.  

**Key files:**  
`src/shared/repositories/repository-facade.ts`,  
`src/content/modes/*`,  
`src/services/cloud-mode-service.ts`,  
`src/background/services/background-highlight-orchestrator.ts`

---

## 2. One canonical Highlight / summary DTO

### Problem

Multiple parallel shapes:

- `DomainHighlightSummary` (query service)  
- `Highlight` in `useHighlightsByDomain` / Factory / Web  
- IPC payload types with optional/string dates  

`updatedAt` and activity sort get re-mapped inconsistently.

### Major fix

- Single shared type (likely extend `DomainHighlightSummary`) for list UIs  
- One mapper from `HighlightDataV2` → summary  
- Delete dead hooks if factory is the only production path  

### Ripple

- Popup hooks, web Supabase paths, cards, tests, possibly MCP  

### Exit criteria

- One type, one sort boundary (service or adapter, not triple UI sort)  
- No divergent `Highlight` interfaces in features/collections  

**Key files:**  
`src/shared/services/highlight-query-service.ts`,  
`src/features/collections/hooks/useHighlightsByDomain*.ts`

---

## 3. Unify pro vs basic library read path

### Problem

```ts
// createScopedHighlightQueryService (conceptual)
pro  → repositoryFacade.getReadable()   // DualWrite / facade
basic → scopedHighlightRepository.queryScope('basic')
```

Two seams for "list my highlights." Auth-scope races made this fail historically; asymmetry remains a footgun after deletes, hydrate, and SW restart.

### Major fix

Pick **one** policy and stick to it:

- Always `queryScope(resolveQueryStorageScope(isAuthenticated))`, **or**  
- Always facade after auth lifecycle has reloaded the correct scope  

Document the rule next to `ScopedHighlightRepository` / query factory.

### Ripple

- Every library / dashboard / domain query when signed in  
- DualWrite, hydration, offline cache, delete visibility  

### Exit criteria

- Guest and signed-in library both documented and tested  
- No "empty library with data in the other IndexedDB" class of bugs in e2e  

**Key files:**  
`src/background/services/scoped-highlight-query.ts`,  
`src/shared/repositories/scoped-highlight-repository.ts`,  
`src/background/bootstrap.ts`,  
`src/background/services/auth-storage-lifecycle.ts`

---

## 4. Auth storage lifecycle: single owner of facade reload

### Problem

On `SIGNED_IN`:

- Cloud hydrate may reload facade on success  
- Lifecycle always reloads again  
- Hydrate failures were easily swallowed (observability gap)  

Double ownership makes startup/login hard to reason about.

### Major fix

- One module owns "facade matches active scope"  
- Hydrate either never reloads (lifecycle always does) **or** returns `{ reloaded: true }` and lifecycle skips  
- Failures logged; local pro scope still activated  

### Ripple

- Bootstrap, login, logout, hydrate, library notify  
- Regression risk: first highlight after login, cold SW restore  

### Exit criteria

- Exactly one reload per sign-in path (unless proven need for two)  
- Tests: hydrate fail still loads pro local; hydrate success no stale basic cache  

**Key files:**  
`src/background/services/auth-storage-lifecycle.ts`,  
`src/background/services/cloud-hydration-service.ts`,  
`src/background/bootstrap.ts`

---

## 5. Popup navigation as real router (optional product decision)

### Problem

Popup uses a **View enum** + `selectedDomain` / `selectedSection`. Home briefly used React Router `navigate()`, which does not switch those views (fixed via `onSectionClick` callbacks).

### Major fix

Drive popup entirely with `MemoryRouter` routes aligned with web app paths, or fully document and enforce "callbacks only, never navigate for chrome views."

### Ripple

- `src/entrypoints/popup/index.tsx`, chrome config, back stack, last-view persistence  

### Exit criteria

- One navigation model; no phantom router history for Library drill-down  

**Only do if** product wants extension popup === web routing model.

---

## 6. Full create → persist → restore pipeline consolidation

### Problem

Still multiple historical stories in the stack:

- Mode create + facade + IPC + DualWrite + (optional) event storage  
- Pro restore via IPC hydrate + `CloudModeService.restoreHighlightsForUrl`  
- Basic `shouldRestore` path vs Pro self-managed restore  

Piecemeal fixes were correct for velocity; long-term cost is cognitive load and dual bugs.

### Major fix

Epic: one pipeline for Basic/Pro create/read/delete/restore; delete dead parallel paths (e.g. unused event replay if fully superseded by IDB).

### Ripple

- Content modes, DI, background repos, restore, events  
- Highest risk of "highlights stop saving"  

### Exit criteria

- E2E: create → IDB (correct scope) → reload paint → library → (signed-in) cloud  
- Architecture diagram + ADR if patterns change  

---

## Explicitly out of scope here

- Guest ↔ account highlight merge on sign-in  
- Migrating legacy `hl-…` ids already in local DBs  
- Full offline queue redesign  
- Web-only Supabase schema migrations (see `docs/06-security/highlights-schema.md`)

---

## Suggested order if scheduled

1. Create-path durability only (low ripple) — prerequisite for trusting #1  
2. Global durable facade write API (#1)  
3. Auth lifecycle single reload owner (#4)  
4. Scoped query unification (#3)  
5. DTO unification (#2)  
6. Pipeline consolidation (#6)  
7. Popup router (#5) only if product-driven  

---

## Quick reference: symptoms → debt item

| Symptom | Likely major item |
|---------|-------------------|
| Paint OK, library empty after login | #3, #4 |
| Reload loses paint under load / fast reload | #1 |
| Recent/list order wrong in one surface only | #2 |
| Current page / home nav wrong | #5 (if callbacks regress) |
| "Works in guest, broken in pro_xai" | #3, #4, #6 |

---

## Changelog

| Date | Note |
|------|------|
| 2026-07-17 | Initial capture after pro_xai persistence + home recency work and strict code review |
