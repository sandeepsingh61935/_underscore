# Case 1 — Auth-Mode Wiring Fix

**Date:** 2026-06-12  
**Status:** Approved  
**Scope:** Bug fixes + auth UX improvements (popup extension only)

---

## Problem Statement

Frontend and backend auth are not fully wired. Three user-facing bugs plus three UX gaps:

### Bugs

| # | Symptom | Root Cause |
|---|---------|------------|
| Bug 1 | Mode stays "Ephemeral" after signing in and choosing Cloud | `handleLoginSuccess` in `index.tsx` never calls `setMode`. `AuthView.setMode('cloud')` only fires on *registration*, not sign-in. |
| Bug 2 | Re-opening Mode Selection always defaults to "Local" | `ModeSelectionView` hardcodes `useState<ModeType>('local')` — never reads persisted `currentMode`. |
| Bug 3 | Already signed-in user hits login page when choosing Cloud | `ModeSelectionView.handleContinue` always calls `onSignInClick` when `mode.signin === true`, regardless of auth state. |

### UX Gaps

| # | Gap |
|---|-----|
| UX 1 | Google sign-in skips account picker — silently uses current Chrome profile |
| UX 2 | No success toast after login; no feedback that app state changed |
| UX 3 | Sign-out has no loading state, uses native `window.confirm()`, no confirmation after |

---

## Design Decisions (Grilled & Approved)

1. **`index.tsx` (`PopupApp`) owns `setMode` post-auth** — `AuthView` only signals success; no mode logic inside auth component.
2. **`pendingMode: ModeType | null` state in `PopupApp`** — set on `handleSignInClick(modeId)`, consumed once in `handleLoginSuccess`, cleared after. Overwritten (not cleared) on back-navigation or retry.
3. **`onSignInClick` signature changes** to `(modeId: ModeType) => void` in the features `ModeSelectionView` only. Legacy `src/ui-system/pages/ModeSelectionView.tsx` is dead code — untouched.
4. **Bug 2 fix** — `ModeSelectionView` receives `initialMode?: ModeType` prop; `useState` initializer becomes `initialMode ?? 'local'`.
5. **Bug 3 fix** — `ModeSelectionView` receives `isAuthenticated?: boolean` prop; if mode requires sign-in AND user is already authenticated, call `onModeSelect(sel)` directly (skip sign-in flow).
6. **`prompt: 'select_account'`** added to `signInWithOAuth` `queryParams` in `auth-manager.ts`. Forces Google account picker on every OAuth login.
7. **Toast placement** — success toast fires in `PopupApp.handleLoginSuccess`; sign-out toast fires in `PopupApp.handleLogout`. Inline errors in `AuthView` kept for auth failures.
8. **Sign-out UX** — drop `window.confirm()`; add local `isLoggingOut: boolean` state in `SettingsPage`; Row swaps "Sign out" label for `<Spinner size="sm" />` while pending.
9. **Remove rogue `setMode('cloud')` from `AuthView`** — lines 60 and 73 removed entirely.
10. **Toast messages** — login: `"Welcome, ${user?.displayName || user?.email?.split('@')[0] || 'back'}!"`; logout: `"Signed out · Switched to Ephemeral mode"`.

---

## Files Changed

### 1. `src/background/auth/auth-manager.ts`

Add `queryParams: { prompt: 'select_account' }` to `signInWithOAuth` options.

### 2. `src/features/modes/ModeSelectionView.tsx`

- Props: add `initialMode?: ModeType`, `isAuthenticated?: boolean`
- State: `useState<ModeType>(initialMode ?? 'local')`
- `onSignInClick` signature: `(modeId: ModeType) => void`; called as `onSignInClick(sel)`
- `handleContinue`: if `mode.signin && isAuthenticated` → call `onModeSelect(sel)` directly

### 3. `src/entrypoints/popup/index.tsx` (`PopupApp`)

- Add `pendingMode: ModeType | null` state
- `handleSignInClick(modeId: ModeType)`: store `modeId` in `pendingMode`, navigate to AUTH
- `handleLoginSuccess`: set `pendingMode` mode, clear it, fire success toast
- `handleLogout`: fire sign-out toast
- Pass `initialMode={currentMode}` and `isAuthenticated={!!user}` to `ModeSelectionView`
- Import `toast` from `'sonner'`

### 4. `src/entrypoints/popup/views/AuthView.tsx`

Remove `setMode('cloud')` from `handleProviderClick` (line ~60) and `handleEmailSubmit` (line ~73).

### 5. `src/pages/SettingsPage.tsx`

- Add `isLoggingOut` local state
- `handleSignOut`: remove `window.confirm()`, wrap `await logout()` with `isLoggingOut` toggle
- Sign-out Row `right` prop: show `<Spinner size="sm" />` when `isLoggingOut`
- Import `Spinner`

---

## What Is NOT In Scope

- AI mode (treated same as Cloud but not separately tested)
- `useModeTransition` hook (web app router only — separate case)
- Legacy `src/ui-system/pages/ModeSelectionView.tsx` (dead code, untouched)
- Persisting `pendingMode` across popup close/open

---

## Acceptance Criteria

1. Sign in with Google → Google account picker appears → mode switches to Cloud → `"Welcome, [name]!"` toast fires
2. Sign in with email → mode switches to Cloud → toast fires
3. Re-open Mode Selection → pre-selected to current mode (not always "Local")
4. Already signed in → choose Cloud in Mode Selection → mode switches immediately (no login page)
5. Sign out → no browser confirm dialog → in-place spinner appears → mode resets to Ephemeral → sign-out toast fires
6. Auth failure → inline error in `AuthView` only (no toast)
