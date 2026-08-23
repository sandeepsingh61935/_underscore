# Granular Highlight Delete

**Date:** 2026-07-11  
**Status:** Implemented (extension popup + content script v1)  
**Triage label:** `ready-for-agent`  
**Scope:** Extension popup + content script (v1); web SPA deferred

---

## Problem Statement

Users cannot reliably delete highlights at the level they think in: a single highlight, a section within a domain, an entire domain, or the whole library. Delete affordances are inconsistent or missing in the Collections drill-down (Library → Domain → Section → Highlight). There is no undo for accidental single deletes, no deliberate confirmation for bulk deletes, and no whole-library delete in Settings.

After sign-out storage isolation, users also need delete behavior to respect **which library is active** (Basic local store for guests vs Pro local + cloud for signed-in account users) without exposing internal database names or crossing guest/account boundaries.

---

## Solution

Ship a **layered delete system** aligned with the Library navigation hierarchy:

| Level | User term | Meaning |
|-------|-----------|---------|
| 1 | **Highlight** | One saved selection |
| 2 | **Section** | One path bucket inside a domain (SubDomain view; `section-key`) |
| 3 | **Domain** | One hostname and **all** its sections/paths |
| 4 | **Library** | Entire active store (Settings only) |

**UX tiers:**

- **Single highlight:** delete immediately; show **5-second Undo** toast (only the most recent delete is undoable).
- **Section, domain, library:** one V2 **Dialog** with warning, **highlight count**, consequence copy, and a **“Delete permanently”** button. No second dialog; no type-to-confirm in v1.
- **Whole library:** **Settings → Library** only (not duplicated on Collections root).

**Auth / mode rules (enforced, not user choice):**

- **Guest (Basic):** active store = Basic local DB only; deletes never touch cloud.
- **Signed in (Pro or Pro-xAI):** active store = Pro local DB + cloud soft-delete; Basic DB untouched.
- Login → **Pro** automatically. Signed-in users switch only **Pro ↔ Pro-xAI**. Guests use **Basic** only; Pro cards route to sign-in, not selectable without account.
- **Vault locked (Pro):** **block all deletes** (single and bulk) until vault is unlocked.

**Cloud (account):** soft-delete via `deleted_at`; hidden from library; syncs across devices. Single-highlight undo within 5s restores local row and clears cloud soft-delete.

---

## User Stories

1. As a guest user, I want to delete one highlight from the SubDomain list, so that I can remove a mistake without losing other work.
2. As a guest user, I want a 5-second Undo after deleting a highlight, so that accidental taps are recoverable.
3. As a signed-in Pro user, I want the same single-highlight delete and undo on account highlights, so that behavior is consistent across modes.
4. As a user, I want only my **most recent** delete to be undoable, so that undo stays predictable.
5. As a user deleting a highlight on the live page (content script), I want the same 5-second undo, so that in-page and library deletes feel the same.
6. As a user, I want to delete all highlights in a **section** (path bucket) from the SubDomain view, so that I can clear one area of a site.
7. As a user, I want to delete all highlights for a **domain** (all sections on that hostname) from the Domain view, so that I can remove an entire site from my library.
8. As a user deleting a section or domain, I want a clear dialog with counts and “Delete permanently”, so that I know the action is irreversible at bulk scale.
9. As a user, I want bulk deletes to have **no undo**, so that restoring hundreds of items is not attempted.
10. As a guest user, I want “Delete library” in Settings to wipe only my **local Basic library**, so that I understand nothing cloud-related happens.
11. As a signed-in user, I want “Delete library” in Settings to wipe my **account library** on this device and in the cloud, so that sign-out is not the only way to clear account data.
12. As a signed-in user, I want “Delete library” to **not** touch my hidden Basic guest store, so that isolation is preserved.
13. As a Pro user with vault locked, I want delete actions disabled with a clear message, so that I unlock before destructive operations on encrypted content.
14. As a user, I want the library and Collections counts to refresh after any delete, so that the UI matches storage.
15. As a user on an active tab, I want page highlights removed when I delete from the library, so that DOM and storage stay in sync.
16. As a developer, I want one background delete API keyed by scope, so that popup, content, and Settings do not duplicate logic.
17. As a QA engineer, I want tests per delete scope from auth context, so that guest vs account regressions are caught.
18. As a guest user browsing Collections, I want **no** whole-library delete on the Collections screen, so that destructive wipe lives only in Settings.
19. As a user deleting a domain, I want **every path/section** on that hostname removed, so that “domain” matches my mental model.
20. As a user, I want delete dialogs to use V2 editorial Dialog (not `window.confirm`), so that the experience matches the design system.
21. As a signed-in user deleting offline, I want cloud deletes queued and applied when online, so that Pro delete is reliable without network.
22. As a user who undoes within 5 seconds, I want cloud soft-delete reverted for that highlight, so that undo is real on account data.
23. As a user past the 5-second undo window, I want the delete to be final locally and in cloud, so that garbage collection can proceed.
24. As a guest on mode selection, I want Pro / Pro-xAI to lead to sign-in only, so that I cannot pick account modes without an account.
25. As a signed-in user on mode selection, I want to switch only between Pro and Pro-xAI, so that I cannot drop to Basic while logged in.
26. As a user exporting before bulk delete, I want Export to remain available nearby (optional link in dialog), so that I can save data before wiping.
27. As a content-script user, I want delete blocked when vault is locked, so that the same vault rule applies everywhere.
28. As a popup user viewing HighlightCard in SubDomain, I want a visible delete control, so that delete is discoverable without hunting settings.

---

## Implementation Decisions

### Navigation / data model (glossary)

- **Library:** all highlights in the **active** scoped store (Basic or Pro).
- **Collections screen:** domain index of the library (title “Library”; rows = domains).
- **Domain:** hostname aggregate; delete removes **all sections** on that host.
- **Section:** path bucket within a domain (`section-key`); SubDomain view.
- **Highlight:** atomic row in active store.

No separate “Collections root delete” in v1. Whole-library delete is **Settings only**.

### Delete scopes and IPC contract

Extend background delete surface (orchestrator or dedicated service) with scoped commands:

```ts
type DeleteScope = 'highlight' | 'section' | 'domain' | 'library';

type DeleteRequest =
  | { scope: 'highlight'; id: string }
  | { scope: 'section'; domain: string; sectionKey: string }
  | { scope: 'domain'; domain: string }
  | { scope: 'library' };

type DeleteResult = { deletedCount: number };

type UndoHighlightResult = { restored: boolean; id: string };
```

Existing `IPC_HIGHLIGHT_REMOVE` covers single remove; add bulk handlers (or one `IPC_HIGHLIGHT_DELETE_SCOPE`) that:

1. Resolve **active storage** via `ScopedHighlightRepository` (Basic vs Pro local).
2. If authenticated, apply matching **cloud soft-delete** (per-id or batch / existing `softDeleteAllHighlights` for library).
3. Update `RepositoryFacade` cache and broadcast `LIBRARY_DATA_CHANGED`.
4. Return `deletedCount` for dialog copy.

**Library delete:** `clear()` on active local repo + cloud soft-delete-all for Pro; never touch inactive Basic DB.

**Guest library delete:** Basic local `clear()` only.

### Vault gate

Before any delete (single or bulk), check vault status (same signal as `vaultLocked` on collection reads). If locked, return `{ success: false, code: 'VAULT_LOCKED' }` and surface inline message in UI. No partial deletes when locked.

### Single-highlight undo (5 seconds)

Introduce a **pending undo buffer** in background (or popup-coordinated with background authority):

```ts
type PendingHighlightUndo = {
  highlight: HighlightDataV2;  // snapshot before delete
  cloudWasSoftDeleted: boolean;
  expiresAt: number;           // Date.now() + 5000
};
```

Flow:

1. Delete: remove from active local repo + soft-delete cloud if Pro; store snapshot; start 5s timer.
2. Undo (within window): restore local row; if cloud was soft-deleted, clear `deleted_at` (restore API); clear buffer; refresh facade + notify library.
3. New delete: **replace** pending undo (only one undo slot).
4. Timer expiry: commit delete; discard snapshot.

Undo is **highlight scope only** — not section/domain/library.

### UI placement

| Scope | Surface | Pattern |
|-------|---------|---------|
| Highlight | `HighlightCard` / `UnderscoreCard` in SubDomain; content overlay | Delete control + undo toast (sonner) |
| Section | SubDomain view header / overflow | Dialog + permanent |
| Domain | DomainDetails view header / overflow | Dialog + permanent |
| Library | Settings → Library section | Dialog + permanent; copy varies by guest vs account |

Use existing V2 `Dialog` primitive. No Tailwind; editorial tokens only.

Settings copy examples:

- Guest: “Delete all highlights on this device” (local Basic library).
- Signed in: “Delete your account library” (device + cloud).

### Mode / account enforcement (related constraints)

Implement or harden alongside delete work:

- `setMode('basic')` rejected while authenticated.
- `setMode('pro' | 'pro_xai')` rejected while logged out.
- Sign-in → set Pro; sign-out → set Basic (existing auth storage lifecycle).
- Mode selection: guest sees Basic active; Pro / Pro-xAI cards → navigate to AUTH only.

### Content script sync

After delete/undo, content tabs should drop restored/removed highlights from DOM (`RepositoryFacade` reload or targeted remove event). Reuse existing highlight removal paths in content modes; extend for undo restore.

### Cloud semantics

- **Delete:** set `deleted_at` (existing Supabase client behavior).
- **Undo:** restore row (clear `deleted_at` or upsert from snapshot) for that `id` and `user_id`.
- **Library wipe:** `softDeleteAllHighlights` for account; Basic local clear only for guest.

### Prior art in codebase

- `IPC_HIGHLIGHT_REMOVE` in `BackgroundHighlightOrchestrator`
- `deleteHighlight` / `softDeleteAllHighlights` in Supabase client
- `ScopedHighlightRepository` + auth storage lifecycle (isolated Basic/Pro DBs)
- `HighlightCard` / `UnderscoreCard` `onDelete` props (wire through)
- `vaultLocked` flag on domain highlight queries
- `sonner` toasts in popup shell

---

## Testing Decisions

### What makes a good test

Assert **observable outcomes**: row counts per scope, active DB (Basic vs Pro), cloud soft-delete calls, undo restore within 5s, vault block — not internal timer implementation or React effect order.

### Primary test seam (preferred: one seam)

**`HighlightDeleteService`** (or orchestrator delete module) — single entry:

`executeDelete(request, context)` and `undoPendingHighlight(context)`

| Scenario | Expected |
|----------|----------|
| Guest, delete highlight | Basic repo −1; Pro unchanged; no cloud call |
| Pro, delete highlight | Pro repo −1; cloud soft-delete called |
| Pro, vault locked | Error `VAULT_LOCKED`; counts unchanged |
| Delete domain | All rows for hostname removed; count returned |
| Delete section | Only rows matching domain + sectionKey removed |
| Guest, delete library | Basic clear; Pro untouched |
| Pro, delete library | Pro clear + softDeleteAll; Basic untouched |
| Undo within 5s | Highlight restored local + cloud restore |
| Undo after 5s / second delete | First not restorable |
| Delete section/domain/library | No undo API success |

Use in-memory repos + fake cloud adapter (pattern from `cloud-hydration-service.test.ts` and `scoped-highlight-repository.test.ts`).

### Secondary tests

- UI hooks: delete button calls IPC with correct scope (lightweight).
- Settings row renders guest vs account copy from `isAuthenticated`.

### Manual test plan

1. Guest: create highlights → delete one → undo within 5s → restored.
2. Guest: delete domain → confirm dialog → domain gone from Collections.
3. Guest: Settings delete library → Basic empty; sign-in → cloud library only (no guest merge).
4. Pro signed in: delete highlight → undo → cloud row visible on second device after sync.
5. Vault locked: delete disabled everywhere.
6. Sign out after Pro deletes: Basic library unchanged.

### Out of scope for automated tests

Full Supabase E2E; multi-tab undo race (document as known limit in v1).

---

## Out of Scope

- Web SPA delete (extension first; follow-up pass)
- Collections root whole-library delete button
- Bulk undo for section / domain / library
- Second confirmation dialog or type-DELETE confirm in v1
- Delete LLM artifacts / domain synthesis on section or domain delete (highlights only unless specified later)
- Literal DNS subdomain delete (`docs.example.com` vs `example.com`) — sections use path buckets only
- Hard delete from Supabase (soft-delete only in v1)
- Merge or upload Basic highlights on any delete path
- `window.confirm` dialogs

---

## Further Notes

### Relationship to storage isolation PRD

Delete library **must** use the same active scope as reads (`ScopedHighlightRepository`). Guest wipe ≠ account wipe. This PRD assumes isolated Basic/Pro DBs are in place.

### Testing seam confirmation

Proposed **single seam:** `HighlightDeleteService.executeDelete` + `undoPendingHighlight`. Confirm before implementation.

### Issue tracker

```bash
gh issue create --title "Granular highlight delete" \
  --label ready-for-agent \
  --body-file docs/superpowers/specs/2026-07-11-granular-highlight-delete.md
```
