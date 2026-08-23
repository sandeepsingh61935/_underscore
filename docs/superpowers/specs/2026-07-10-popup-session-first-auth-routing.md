# Popup Session-First Auth Routing

**Date:** 2026-07-10  
**Status:** Ready for implementation  
**Triage label:** `ready-for-agent`  
**Scope:** Extension popup navigation + auth guard alignment (not web SPA)

---

## Problem Statement

After a user completes Google (or email) sign-in in the extension popup, reopening the popup can still show the sign-in screen even though the background service worker has a valid Supabase session and the user is authenticated.

This happens because the popup treats **navigation history** and **auth state** as independent concerns. When the user navigates to sign-in, that view is persisted to `chrome.storage.local`. During OAuth, Chrome often **closes the popup** while auth completes in the background. On the next open, the popup restores the last persisted view (`AUTH`) instead of checking session first and routing to the main app.

From the user's perspective: "I signed in successfully, but the extension still asks me to sign in again."

---

## Solution

Adopt the **session-first routing** pattern used by popular web, mobile, and extension apps:

1. **Auth is state, not navigation history** — sign-in is a transient gate, never restored from storage.
2. **On popup open, resolve the initial screen from session first**, then optionally restore the last *real* screen (Collections, Settings, domain drill-down, etc.).
3. **Reactive auth guard** — if the user becomes authenticated while the sign-in view is visible, automatically forward to the post-login destination.
4. **Background owns the session** — popup success handlers are a convenience, not a requirement for OAuth to "count."

The user should always land on Collections (Basic) or Unlock Vault (Pro / Pro xAI) after a completed sign-in, whether or not the popup stayed open during OAuth.

---

## User Stories

1. As a new user who just finished Google OAuth, I want the popup to open on my library (Collections) instead of sign-in, so that I know sign-in worked.
2. As a Pro user who chose Pro before signing in, I want to land on Unlock Vault after OAuth completes in the background, so that I can finish vault setup without signing in again.
3. As a returning authenticated user, I want the popup to restore my last real screen (e.g. Settings or a domain view), so that I continue where I left off.
4. As a returning authenticated user, I never want to see the sign-in screen on popup open, so that auth feels seamless.
5. As a guest (Basic mode, not signed in), I want the popup to open on Collections or Mode Selection as appropriate, not a stale sign-in screen from a previous attempt.
6. As a user mid-OAuth when the popup closes, I want the next popup open to reflect my new signed-in state, so that I do not have to repeat sign-in.
7. As a user who stays on the sign-in screen while OAuth completes in another window, I want the popup to auto-advance when auth succeeds, so that I do not have to close and reopen.
8. As a user signing out from Settings, I want to leave authenticated-only flows and not be dropped back onto a cached sign-in page on next open.
9. As a user on Welcome or Mode Selection, I want onboarding flow unchanged, so that first-run experience is not regressed.
10. As a user drilling into a domain or subdomain, I want that navigation context restored on reopen **only when** I am authenticated and the restored view is a valid persisted screen.
11. As a developer maintaining the popup, I want one clear routing decision point keyed off session + persisted nav, so that auth and navigation bugs do not recur.
12. As a developer, I want transient views (sign-in, loading, welcome, LLM streaming, vault unlock) excluded from persistence by policy, so that storage cannot resurrect gate screens.
13. As a user who picked Pro then started OAuth, I want my mode intent to survive popup close, so that post-login routing is correct even if the popup's in-memory state is lost.
14. As a user with legacy `AUTH` stored from before this fix, I want the next popup open to migrate me forward automatically, so that I am not stuck on sign-in.
15. As a user signing in with email inside the popup (no OAuth window close), I want the same post-login routing as OAuth, so that all auth paths behave consistently.
16. As a QA engineer, I want deterministic tests for initial popup route resolution, so that regressions are caught without manual OAuth.
17. As a user switching between Basic and Pro, I want sign-in to appear only when auth is actually required, not because the popup remembered an old auth screen.
18. As a user opening the popup immediately after granting Google permission, I want zero extra taps on sign-in, so that the flow matches Gmail/1Password-style extension UX.
19. As a security-conscious user, I want session restoration to come from the background AuthManager (Supabase), not from popup-local fake state, so that auth integrity is preserved.
20. As a user on API Key Setup or Dashboard, I want those screens restorable on reopen when authenticated, so that deep work is not lost.

---

## Implementation Decisions

### Architectural principle: session-first routing

Popup initial view resolution order:

```
1. Load session from background (GET_AUTH_STATE / useCurrentUser)
2. Load onboarding flags (welcome seen, mode selection seen)
3. Load persisted navigation snapshot (last view, domain, section — not auth gates)
4. Decide route:
   - If authenticated → restore last persisted *app* view OR default home (Collections)
   - If authenticated AND currently on sign-in (reactive) → forward to post-login destination
   - If not authenticated → onboarding flow OR guest home; never restore sign-in from storage
```

This mirrors the web app's `ProtectedRoute` pattern: auth gates redirect when session exists; they are not bookmarked.

### Transient vs persisted views

**Persisted (restorable):** Collections, domain drill-down, Settings, Dashboard, API Key Setup, Mode Selection.

**Transient (never persist, never restore):** Sign-in, Loading, Welcome, LLM Streaming, Unlock Vault.

Sign-in must be removed from the persisted-view allowlist. Persist helpers should no-op for transient views.

### Consolidate routing into one resolver

Extract a pure `resolvePopupInitialRoute` (name illustrative) that accepts:

- `user: User | null`
- `isLoading: boolean` (defer to Loading while true)
- `onboarding: { hasSeenWelcome, hasSeenModeSelection }`
- `nav: { lastView?, lastDomain?, lastSection?, pendingAuthMode? }`
- `currentMode: ModeType`

And returns:

- `view` (enum)
- optional `domain` / `section` to hydrate drill-down
- optional `mode` to apply when consuming pending auth intent

Popup mount logic should call this resolver once storage + auth are ready, instead of scattering special cases across multiple effects.

Prototype shape (decision-rich excerpt):

```ts
type PopupRouteInput = {
  user: User | null;
  onboarding: { hasSeenWelcome: boolean; hasSeenModeSelection: boolean };
  nav: PopupNavigationSnapshot;
  currentMode: ModeType;
};

type PopupRouteResult = {
  view: PopupView;
  selectedDomain?: string;
  selectedSection?: string;
  applyMode?: ModeType;
};

function resolvePopupInitialRoute(input: PopupRouteInput): PopupRouteResult {
  if (!input.onboarding.hasSeenWelcome) return { view: 'WELCOME' };
  if (input.user) {
    if (input.nav.pendingAuthMode) {
      return {
        view: isProMode(input.nav.pendingAuthMode) ? 'UNLOCK_VAULT' : 'COLLECTIONS',
        applyMode: input.nav.pendingAuthMode,
      };
    }
    if (input.nav.lastView && isPersistedPopupView(input.nav.lastView)) {
      return { view: input.nav.lastView, ...domainSectionFrom(nav) };
    }
    return { view: 'COLLECTIONS' };
  }
  if (!input.onboarding.hasSeenModeSelection) return { view: 'MODE_SELECTION' };
  if (input.nav.lastView && isPersistedPopupView(input.nav.lastView) && input.nav.lastView !== 'MODE_SELECTION') {
    return { view: input.nav.lastView, ...domainSectionFrom(nav) };
  }
  return { view: 'COLLECTIONS' };
}
```

Legacy `lastView === 'AUTH'` in storage is handled implicitly: `AUTH` is not persisted going forward and is not in `isPersistedPopupView`, so authenticated users fall through to Collections or pending-mode handling.

### Reactive auth guard (safety net)

Separate small effect in popup shell:

- When `user` becomes truthy AND `currentView === AUTH` → navigate to post-login destination.
- Reuse the same `postLoginViewForMode` helper as init and `handleLoginSuccess`.

Do not rely on `handleLoginSuccess` alone for OAuth; background session is source of truth.

### Post-login destination

| Mode after sign-in | Destination |
|--------------------|-------------|
| Basic | Collections |
| Pro / Pro xAI | Unlock Vault |

### Pending auth mode (minimal persistence)

When user picks Pro (or Pro xAI) and is sent to sign-in, persist `pendingAuthMode` in `chrome.storage.local` **only until** sign-in completes or is abandoned. Clear on successful auth navigation.

This is the smallest addition needed because popup memory is lost on close during OAuth. Without it, Pro users land on Collections and must manually switch mode.

**Simpler alternative (out of scope unless product prefers):** always land on Collections after sign-in; user switches to Pro manually. Prefer keeping `pendingAuthMode` for parity with web `intendedMode` query param behavior.

### Background auth unchanged

OAuth completion (PKCE `?code=` exchange, hash fallback, `onAuthStateChange`, `AUTH_STATE_CHANGED` broadcast) remains in AuthManager / background. This PRD does not change Supabase integration — only popup consumption of session.

### Web app alignment (reference only)

Web already uses router guards (`ProtectedRoute`, `IntentCatcher` with `intendedMode`). Extension popup should follow the same mental model; no web code changes required for this PRD unless parity gaps are discovered during implementation.

### Cleanup / consolidation

- Remove duplicate init branches that special-case `AUTH` once resolver exists.
- Ensure `persistPopupView` is only called for persisted views (current view persistence effect).
- On auth guard forward, clear `pendingAuthMode` and apply mode via existing `setMode`.

---

## Testing Decisions

### What makes a good test

Test **observable routing behavior** from inputs (session + storage snapshot), not React effect ordering or internal state variable names. No snapshot testing of components for this feature.

### Primary test seam (preferred: one seam)

**`resolvePopupInitialRoute` pure function** — highest seam, single decision point.

| Input scenario | Expected view |
|----------------|---------------|
| Authenticated, lastView = Settings | Settings |
| Authenticated, lastView = AUTH (legacy) | Collections |
| Authenticated, pendingAuthMode = pro | Unlock Vault + apply pro mode |
| Unauthenticated, hasSeenWelcome false | Welcome |
| Unauthenticated, seen welcome, not mode selection | Mode Selection |
| Guest, seen both, lastView = COLLECTIONS | Collections |
| Guest, lastView = AUTH | Collections (not sign-in) |
| persistPopupView('AUTH') | does not write lastView |

Prior art: `tests/unit/shared/popup-navigation-storage.test.ts` for persistence policy; mode-state and auth-manager unit tests for session patterns.

### Secondary tests (only if resolver is hard to extract)

Lightweight popup routing test with mocked `useCurrentUser` and storage — lower priority than pure resolver tests.

### Manual test plan

1. Pick Pro → Sign in with Google → close popup during Google consent → reopen → Unlock Vault, signed in.
2. Pick Basic → Google sign-in → reopen → Collections, signed in.
3. Sign in without closing popup → auto-leave sign-in view.
4. Authenticated → navigate Settings → close popup → reopen → Settings.
5. Sign out → reopen → guest flow, not sign-in ghost.

### Out of scope for automated tests

Full E2E OAuth with real Google consent UI (flaky in CI). Rely on AuthManager PKCE unit tests + routing resolver tests.

---

## Out of Scope

- Changing Supabase OAuth configuration or redirect URLs
- Web SPA sign-in flow changes (already uses guard routes)
- New OAuth providers
- Vault encryption / KeyManager refactors
- Persisting `pendingAuthMode` across sign-out (clear on logout)
- React Router migration for popup (MemoryRouter stays; resolver is the guard equivalent)
- Email verification UI on web
- Cross-context web ↔ extension session bridge changes (already implemented separately)
- Removing `pendingAuthMode` in favor of always landing on Collections (product option; default is keep for Pro UX)

---

## Further Notes

### Why this bug is extension-specific

Standard SPAs keep the tab open through OAuth; extension popups are destroyed when focus leaves. Mature extensions (password managers, Grammarly, etc.) always read session from the service worker on open. Sign-in UI is never "last visited page."

### Relation to partial fix already in tree

Some session-first pieces may already exist (AUTH removed from persisted views, auth guard effect, `pendingAuthMode`). Implementation should **consolidate** into the single resolver + tests rather than add more special cases.

### Issue tracker

Publish this spec as a GitHub issue with label `ready-for-agent` when `gh` CLI is available.
