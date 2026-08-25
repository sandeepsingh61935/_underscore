# PRD: Background Service Worker & Authentication Reliability — Highlight Bridge and Google Sign-In

**Date:** 2026-08-25
**Status:** Ready for implementation — `ready-for-agent`
**Priority:** P0 (user-visible data loss and auth failure; blocks guest → cloud upgrade)
**Scope:** Service worker lifecycle, highlight IPC bridge, scoped storage, and Google OAuth via `chrome.identity`
**ADRs respected:** 001-event-sourcing-for-sync, 002-event-driven-architecture, 003-interface-segregation-multi-mode, 019-rate-limiting-strategy, 025-mode-feature-boundaries, 029-cloud-first-library-and-integrations
**Does not include:** Full pipeline consolidation, guest↔account data merge, popup router migration — see high-ripple debt doc

---

## Problem Statement

From the user's perspective, two failures share a single upstream — the background service worker never finishes initialization — but surface as different symptoms:

**Highlight path:** A user highlights text on any page (e.g., GeeksforGeeks TypeScript article, YouTube transcript iframe). The highlight paints locally, but after reload or navigating to the Extension Library (Collections, Domain view, Dashboard Recent), the library is empty, the highlight does not restore, or deleting via the close button errors. The popup and web app both show zero collections even though the write appeared to succeed. Reloading loses paint.

**Auth path:** A user clicks "Sign in with Google" in the popup. Instead of the Chrome Web Auth flow, the UI shows "Google sign-in failed. Please try again." with a nested error "Uncaught (in promise) Error: Could not find source file: 'inmemory://model/2'." — a TypeScript language-service host error that leaks from the service worker. Email/OTP sign-in still works, so the failure is specific to the OAuth path that touches `chrome.identity` inside the service worker.

Both share the same contract the user expects: highlights created anywhere must survive a service worker restart and appear in library search, domain, section, and export scopes; and Google sign-in must complete PKCE code exchange without leaking internal source-map or permission errors to the UI.

## Solution

From the user's perspective, the fix is invisible but guarantees:

* Every highlight write (yellow/underscore) is durably persisted in the correct storage partition (Basic for guests, Pro for authenticated accounts) before the UI considers it done, and survives service worker cold start.
* Every highlight read (restore on page load, library collections, this-page, search, export) comes from the same partition the write used, so guest libraries are not empty and Pro libraries do not mix scopes.
* The background service worker boots deterministically on MV3 (`ServiceWorkerGlobalScope`) without `import()` or `window` assumptions, registers all `IPC_HIGHLIGHT_*` and auth handlers, and never falls back to a fake `INIT_FAILED { success:false }` listener that masks the root error.
* Google sign-in runs the Supabase `signInWithOAuth({ provider:'google', prompt:'select_account', skipBrowserRedirect:true })` → `chrome.identity.launchWebAuthFlow` → `exchangeCodeForSession` PKCE flow with permission-gated Supabase host access, maps all failures via the central `mapAuthError` OAuth copy, logs full stacks for debugging, and never surfaces `inmemory://` or raw redirect URLs.
* All IPC between content, popup, and background remains trusted-sender guarded, retried for cold start, and distinguishes fire-and-forget cache writes from must-succeed reads.

## User Stories

1. As a guest user, I want to highlight text on any http/https page and see it paint immediately, so that I get instant feedback.
2. As a guest user, I want my highlight to appear in Extension Library Collections grouped by domain after creation without manual refresh, so that I trust the library.
3. As a guest user, I want to reload the page and see my highlights repainted at the same selectors, so that persistence feels reliable.
4. As a guest user, I want to delete a highlight via the close button and see it disappear from the page and library, so that delete feels authoritative.
5. As a guest user, I want to undo a highlight delete within the undo window and see it reappear, so that mistakes are recoverable.
6. As a guest user, I want to search highlights library-wide and get results scoped correctly, so that search is useful.
7. As a guest user, I want to export highlights for a domain/section and get only that scope's passages, so that export is precise.
8. As a guest user, I want "This page" and "This section" counts to reflect only the current page/section, so that navigation is accurate.
9. As a guest user, I want highlights in iframes (e.g., YouTube transcript) to key to the tab address-bar URL with full query identity (`?v=`), so that section grouping is correct.
10. As a signed-in user, I want highlights I create while authenticated to go to Pro Isolated storage and never leak to the guest Basic partition, so that account data stays isolated.
11. As a signed-in user, I want to sign out and see the guest library (not the Pro library) after scope switch, so that isolation is visible.
12. As a signed-in user, I want library cloud hydration (Settings → Sync library) to show progress and merge remote highlights without duplicating local ones, so that sync is transparent.
13. As a signed-in user, I want periodic Supabase Realtime ingest to not duplicate highlights already echoed locally, so that I don't see doubles.
14. As a user who signs in with Google, I want to click Sign in, pick an account, and land authenticated with my cloud library hydrated, so that onboarding is one click.
15. As a user who cancels Google sign-in, I want a stable "Google sign-in failed. Please try again." message without leaking raw Chrome or Supabase error text, so that errors feel polished.
16. As a user whose Supabase host permission is not yet granted, I want the first Google sign-in to prompt for `https://cuzwaukxagefyvtxbqmi.supabase.co/*` and, if denied, to stay guest with a clear permission-denied message, so that install prompts stay minimal.
17. As a user who hits rate limits (5 attempts / 15 min per bucket), I want a "Try again in m:ss" message scoped to the correct bucket (auth vs otp_verify vs otp_resend), so that limits are understandable and not cross-bucket.
18. As a user with a flaky network or cold service worker, I want highlight create and restore to retry briefly (≈500-800ms wake window) and either succeed or log, not hang, so that cold start is robust.
19. As a user on a page with a non-http URL (e.g., `inmemory://model/2` in a Monaco editor), I want the extension to ignore or safely handle that URL and never break Google sign-in or highlight persistence, so that exotic pages don't poison core flows.
20. As a user who opens the popup via the action icon, I want collections, dashboard, and domain views to load without "Background initialization failed: INIT_FAILED" fallback errors, so that the popup always gets a real response.
21. As a developer, I want service worker boot failures to be logged with full stack (not swallowed by a fallback `chrome.runtime.onMessage` handler), so that root cause is diagnosable.
22. As a developer, I want `window` not assumed in the service worker (`self` is global), so that Supabase and WXT libraries don't mis-detect DOM presence.
23. As a developer, I want the content script to guard `chrome.runtime` before IPC (per backend rules) so that the SPA never blanks when the extension is not installed.
24. As a power user, I want highlight `sourceKind: code` (captured from `<pre><code>` blocks) to preserve `language` and `presentation` without rewriting `text`, so that code highlights export as markdown fences.
25. As a web-app user, I want the same highlight query semantics (domain, sectionKey, activity sort) as the extension library, so that cross-surface behavior matches.

## Implementation Decisions

* **Service worker entry remains MV3 module and owns only Chrome wiring:** The background entry registers the single `defineBackground` module, immediately installs a `window = self` polyfill for WXT/Supabase compatibility but guards all DOM access behind `typeof document` checks, and delegates all business logic to the DI container bootstrap. No dynamic `import()` is allowed in the service worker bundle — all dependencies are statically imported so Vite does not emit a separate chunk that violates `ServiceWorkerGlobalScope` import restrictions.

* **Bootstrap is the single owner of scope activation and cache hydration:** On startup the container resolves the scoped highlight repository, tag repository, repository facade, and auth manager; activates `basic` or `pro` scope based on `authManager.currentUser`; and hydrates the facade cache once via the auth-storage lifecycle. The background entry does not re-initialize the facade after bootstrap resolves, avoiding double-hydration and stale-cache mixing.

* **Highlight query reads from the scoped partition, not the facade cache:** The scoped highlight query service resolves the active storage scope from authentication state and builds the read-side query service over the scoped repository's `queryScope(scope)` partition for both guest and authenticated users. The facade cache remains a write-through convenience for popup optimistic updates, but library aggregations (collections, highlights by domain, dashboard, search, export) never read the facade's in-memory map that may be stale after a scope switch or cold start.

* **Background highlight orchestrator is the sole IPC bridge for highlight writes/reads:** It subscribes to `IPC_HIGHLIGHT_ADD`, `ADD_MANY`, `UPDATE`, `REMOVE`, `HIGHLIGHTS_FIND_BY_URL`, `FIND_BY_CONTENT_HASH`, and `GET` over the Chrome message bus. `add` and `addMany` use durable `addPersisted` semantics (await IndexedDB) and stamp the highlight URL from `sender.tab.url` when the content frame URL lacks query identity. `findByUrl` merges durable indexed results with the facade cache's in-flight rows via normalized URL keys, and `enrichWithPlaintext` remains a passthrough (text is stored plaintext).

* **Content side uses two adapters with a shared IPC retry policy:** The local-cache IPC repository writes to an in-memory repository for synchronous UI reads and forwards the same payload to the background with fire-and-forget `onExhausted:'log'` semantics (cache already succeeded, background failure is logged not thrown). The IPC-readable repository is read-only for restore and uses `onExhausted:'throw'` with `BACKGROUND_IPC_MAX_ATTEMPTS = 6` and delays `[0,100,300,600,1000,1500]` to cover MV3 cold wake. Both adapters share a single `sendBackgroundIpcWithRetry` helper that treats any `{success:false}` envelope as a retryable failure.

* **Authentication flows are permission-gated and centrally mapped:** Google sign-in checks `ensureSupabaseOrigin` before invoking Supabase OAuth, uses `skipBrowserRedirect:true` with `prompt:'select_account'`, launches the system browser flow via `chrome.identity.launchWebAuthFlow`, and completes PKCE via `exchangeCodeForSession` (falling back to hash-token `setSession` for legacy implicit flows). All errors are routed through `mapAuthError` with context `oauth` — rate limits map to `m:ss` messages, `user_cancelled` maps to the generic OAuth copy, and raw provider/redirect URLs never reach views (only structured logger fields). Rate limiting uses three isolated buckets (`rate_limit:auth`, `rate_limit:otp_verify`, `rate_limit:otp_resend`) persisted in `chrome.storage.local` and fails closed when storage is unavailable.

* **Trust model and page identity are hardened:** The Chrome message bus validates every message, then checks `sender.id === chrome.runtime.id` per ADR-014 (only `SYNC_AUTH_SESSION` from allowed external web origins is exempt). Highlight page URLs are normalized via `normalizePageUrl` (strip hash, drop tracking params, sort remainder) and resolved via `resolveHighlightPageUrl` that prefers the address-bar `tab.url` over the iframe `contentUrl` only when the tab is `http`/`https`; `inmemory://` and other non-http URLs are treated as non-routable and never poison the OAuth or library paths.

* **Failure visibility over masking:** The background entry's catch block logs the full error and stack with an `INIT` prefix and registers a fallback `chrome.runtime.onMessage` listener that replies `{success:false, code:'INIT_FAILED'}` so the popup gets a structured response instead of a timeout — but the root error is never swallowed for diagnostics. Cloud hydration failures during `SIGNED_IN` are logged and still activate the target scope so the library remains usable offline.

* **No schema change to HighlightDataV2:** The wire shape (`id`, `url`, `text`, `contentHash`, `ranges`, `metadata { notes, tags, sourceKind, language, presentation }`, `createdAt/updatedAt`) remains authoritative per the highlight schema; `presentation` updates never rewrite `text` and `contentHash` remains the dedup key.

## Testing Decisions

* **What makes a good test:** Tests assert external behavior (a highlight created on a page appears in Collections and restores after reload; Google sign-in either succeeds or maps to the stable copy) not implementation details (which repository method was called). Unit tests use real Zod validation, real `normalizePageUrl`, and real `compareByHighlightActivityDesc` ordering; only platform boundaries (`chrome.*`, Supabase network, IndexedDB) are faked. Flakiness is treated as a product — loops are pinned (fake timers, fixed `Date.now()`, `fake-indexeddb`, mocked `chrome.runtime.id`) and retried at the integration seam.

* **Existing seams to reuse (highest seam possible):**
  - Auth manager unit seam (`AuthManager` with `EventBus` + mocked `SupabaseClient` + `chrome.identity`/`chrome.storage.local`/`chrome.alarms`) — already covers Google PKCE success, implicit hash fallback, cancel mapping, rate-limit buckets, concurrent singleton promise, and verification timers.
  - Background highlight orchestrator seam (`BackgroundHighlightOrchestrator` with `RepositoryFacade` stub + `IMessageBus` spy) — covers `IPC_HIGHLIGHT_ADD` durable persist, tab-URL stamping, and `IPC_HIGHLIGHTS_FIND_BY_URL` merging of durable + cache.
  - Scoped highlight query seam (`createScopedHighlightQueryService` with stubbed `ScopedHighlightRepository` partitions and `HighlightQueryService`) — covers guest vs pro partition selection and collection/domain/dashboard aggregations.
  - IPC retry seam (`sendBackgroundIpcWithRetry` with mocked `IMessageBus.send`) — covers immediate success, retry-then-success, `onExhausted:throw` vs `log`, and `success:false` envelope as failure.
  - Library web hooks (`useWebLibrary`, `aggregateLibrary`) for cross-surface parity.

* **New seam to introduce (highest point possible):**
  - A narrow `IIdentityPort` behind `AuthManager` (`getRedirectURL`, `launchWebAuthFlow`) and a `IPermissionsPort` behind `ensureOrigins` — so the TypeScript `inmemory://` source-map error and the `chrome.permissions` prompt can be unit-tested without loading the real `wxt/browser` virtual module. This is the only seam that cannot be tested via the existing `chrome` global mock without pulling the Vite virtual `inmemory://model/2` into the service worker bundle; introducing it also unblocks a regression test that the background chunk does not bundle `typescript` and does not contain `await import(`.

* **Prior art in the codebase:**
  - `tests/unit/background/auth/auth-manager.test.ts` for OAuth happy/cancel/rate-limit paths and `mapAuthError` mapping.
  - `src/background/services/background-highlight-orchestrator.test.ts` for bridge durability.
  - `tests/unit/background/services/scoped-highlight-query.test.ts` for guest vs pro reads.
  - `src/shared/messaging/send-background-ipc-with-retry.test.ts` for cold-start retry policy.
  - `tests/integration/highlight-bridge.test.ts` and `tests/unit/content/modes/pro-mode-restore.test.ts` (currently flaky — fix or quarantine as part of this work) for end-to-end create→restore→delete.

## Out of Scope

* Rewriting the facade from sync cache to fully async or removing fire-and-forget `add` globally — only the create path goes durable.
* Unifying all highlight DTOs across extension, web, and MCP into one type — keep `HighlightDataV2` vs web view models vs MCP contract separate.
* Guest↔account data merge or automatic migration of Basic highlights into Pro on first sign-in beyond the existing isolated-partition model.
* Supabase schema or RLS changes; Workers JWT validation changes; new AI model integrations.
* Popup React Router migration or V2 Editorial chrome changes — shell ownership stays as-is.
* Firefox `identity` OAuth beyond the existing email/OTP fallback (Google `launchWebAuthFlow` remains Chrome-only).
* Performance profiling beyond the cold-wake retry budget; no expected perf regression.

## Further Notes

* The `inmemory://model/2` string is not a product URL — it is the Monaco/TypeScript language-service host's virtual file URI that appears when a service worker is mistakenly given a `window` object or when a Vite virtual module (`wxt/browser`) is evaluated in a context whose source map points to an in-memory file. The fix is not to handle that URI as a highlight URL but to prevent the service worker from ever entering a DOM-like path (guard `window`/`document`, keep imports static, isolate Chrome ports).
* After the fix, consider handing off to the `improve-codebase-architecture` skill if the bootstrap still lacks a pure `registerHandlers(container): void` that can be tested without `chrome.runtime` — the current test seam requires faking the entire `chrome` global.
* Telemetry to add post-ship: `INIT_FAILED` code count, `IPC_HIGHLIGHTS_FIND_BY_URL` zero-result rate by mode, Google `signIn` rate-limit hit rate per bucket, and `handleAuthStorageEvent` hydrate failure log rate — all as logger metrics, not new product UI.
* Commit messages for this work should state the correct hypothesis (e.g., `fix(background): guard window polyfill — TS host inmemory://model/2 no longer throws (H1)` and `fix(auth): extract identity port — OAuth no longer bundles virtual model (H2)`) so the next debugger learns.
