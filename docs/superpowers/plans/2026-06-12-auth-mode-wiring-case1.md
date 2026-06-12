# Auth-Mode Wiring — Case 1 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wire auth state to mode state so that signing in via Cloud mode selection correctly sets Cloud mode, pre-selects the current mode on re-open, prevents already-authenticated users from re-triggering login, and adds success/failure UX feedback (toasts, sign-out spinner).

**Architecture:** Five targeted file edits, no new files or abstractions. `PopupApp` in `index.tsx` becomes the single orchestration point for mode-setting after auth — `AuthView` only signals success. `ModeSelectionView` receives `initialMode` and `isAuthenticated` as props to fix default-sel and auth-guard bugs. Backend gains `prompt: 'select_account'` for Google account picker.

**Tech Stack:** React 18, TypeScript, Vitest + @testing-library/react, Supabase Auth, Chrome Identity API (via `chrome.identity.launchWebAuthFlow`), Sonner (toasts already mounted in `index.tsx`).

---

## File Map

| Status | File | Change |
|--------|------|--------|
| Modify | `src/background/auth/auth-manager.ts` | Add `prompt: 'select_account'` to Google OAuth |
| Modify | `src/features/modes/ModeSelectionView.tsx` | Props: `initialMode`, `isAuthenticated`; fix default sel; auth guard in `handleContinue`; `onSignInClick(modeId)` |
| Create | `src/features/modes/__tests__/ModeSelectionView.test.tsx` | Tests for all three ModeSelectionView changes |
| Modify | `src/entrypoints/popup/views/AuthView.tsx` | Remove two `setMode('cloud')` calls |
| Modify | `src/entrypoints/popup/index.tsx` | `pendingMode` state; `handleSignInClick(modeId)`; `handleLoginSuccess` sets mode + toast; `handleLogout` toast; pass new props to `ModeSelectionView` |
| Modify | `src/pages/SettingsPage.tsx` | `isLoggingOut` state; drop `window.confirm()`; in-place spinner on sign-out Row |

---

## Task 1: Backend — Google Account Picker

**Files:**
- Modify: `src/background/auth/auth-manager.ts` (lines 200–206)

- [ ] **Step 1: Add `prompt: 'select_account'` to `signInWithOAuth`**

  Open `src/background/auth/auth-manager.ts`. Find the `signInWithOAuth` call (around line 200). Replace the options block:

  ```ts
  // BEFORE
  const { data, error: oauthError } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
      },
  });

  // AFTER
  const { data, error: oauthError } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
          queryParams: {
              prompt: 'select_account',
          },
      },
  });
  ```

- [ ] **Step 2: Build to verify no TypeScript errors**

  ```bash
  cd /home/sandy/projects/_underscore && npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds (exit 0). If you see type errors around `queryParams`, check the `@supabase/supabase-js` version — `queryParams` has been in the API since v2.

- [ ] **Step 3: Commit**

  ```bash
  git add src/background/auth/auth-manager.ts
  git commit -m "fix(auth): force Google account picker via prompt=select_account"
  ```

---

## Task 2: ModeSelectionView — Fix Default Sel, Auth Guard, Prop Signature

**Files:**
- Modify: `src/features/modes/ModeSelectionView.tsx`
- Create: `src/features/modes/__tests__/ModeSelectionView.test.tsx`

- [ ] **Step 1: Write failing tests**

  Create `src/features/modes/__tests__/ModeSelectionView.test.tsx`:

  ```tsx
  import React from 'react';
  import { describe, it, expect, vi } from 'vitest';
  import { render, screen, fireEvent } from '@testing-library/react';
  import { ModeSelectionView } from '../ModeSelectionView';

  // ModeSelectionView uses modeRegistry (singleton) — no mock needed, uses real registry.

  describe('ModeSelectionView', () => {
    it('pre-selects initialMode when provided', () => {
      // "cloud" row should show filled bullet when initialMode='cloud'
      const onModeSelect = vi.fn();
      render(
        <ModeSelectionView
          onModeSelect={onModeSelect}
          initialMode="cloud"
          isAuthenticated={true}
        />
      );

      // The continue button should say "Continue as Cloud"
      expect(screen.getByRole('button', { name: /Continue as Cloud/i })).toBeInTheDocument();
    });

    it('defaults to local when initialMode is not provided', () => {
      render(<ModeSelectionView />);
      // The continue button should say "Continue as Local"
      expect(screen.getByRole('button', { name: /Continue as Local/i })).toBeInTheDocument();
    });

    it('calls onModeSelect (not onSignInClick) when cloud is selected and user is authenticated', () => {
      const onModeSelect = vi.fn();
      const onSignInClick = vi.fn();

      render(
        <ModeSelectionView
          onModeSelect={onModeSelect}
          onSignInClick={onSignInClick}
          initialMode="cloud"
          isAuthenticated={true}
        />
      );

      // Click Continue — should set mode directly, not trigger sign-in
      fireEvent.click(screen.getByRole('button', { name: /Continue as Cloud/i }));
      expect(onModeSelect).toHaveBeenCalledWith('cloud');
      expect(onSignInClick).not.toHaveBeenCalled();
    });

    it('calls onSignInClick with mode id when cloud is selected and user is not authenticated', () => {
      const onModeSelect = vi.fn();
      const onSignInClick = vi.fn();

      render(
        <ModeSelectionView
          onModeSelect={onModeSelect}
          onSignInClick={onSignInClick}
          initialMode="cloud"
          isAuthenticated={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Continue as Cloud/i }));
      expect(onSignInClick).toHaveBeenCalledWith('cloud');
      expect(onModeSelect).not.toHaveBeenCalled();
    });

    it('calls onModeSelect for local mode regardless of auth state', () => {
      const onModeSelect = vi.fn();
      const onSignInClick = vi.fn();

      render(
        <ModeSelectionView
          onModeSelect={onModeSelect}
          onSignInClick={onSignInClick}
          initialMode="local"
          isAuthenticated={false}
        />
      );

      fireEvent.click(screen.getByRole('button', { name: /Continue as Local/i }));
      expect(onModeSelect).toHaveBeenCalledWith('local');
      expect(onSignInClick).not.toHaveBeenCalled();
    });
  });
  ```

- [ ] **Step 2: Run tests — confirm they fail**

  ```bash
  cd /home/sandy/projects/_underscore && npx vitest run src/features/modes/__tests__/ModeSelectionView.test.tsx 2>&1 | tail -30
  ```

  Expected: FAIL. Tests about `initialMode`, auth guard, and `onSignInClick(modeId)` will fail because the component hasn't been updated yet.

- [ ] **Step 3: Update `ModeSelectionView.tsx`**

  Replace the entire file `src/features/modes/ModeSelectionView.tsx` with:

  ```tsx
  /* eslint-disable no-restricted-syntax */
  import React, { useState } from 'react';

  import type { ModeDefinition } from '@/features/modes/registry';
  import { modeRegistry } from '@/features/modes/registry';
  import type { ModeType } from '@/shared/schemas/mode-state-schemas';

  export interface ModeSelectionViewProps {
    onModeSelect?: (modeId: string) => void;
    onSignInClick?: (modeId: ModeType) => void;
    onBack?: () => void;
    onNavigateToCollections?: () => void;
    initialMode?: ModeType;
    isAuthenticated?: boolean;
  }

  export function ModeSelectionView({
    onModeSelect,
    onSignInClick,
    onBack: _onBack,
    onNavigateToCollections,
    initialMode,
    isAuthenticated = false,
  }: ModeSelectionViewProps = {}): React.ReactElement {
    const [sel, setSel] = useState<ModeType>(initialMode ?? 'local');

    const modes = [
      modeRegistry.get('ephemeral')!,
      modeRegistry.get('local')!,
      modeRegistry.get('cloud')!,
      modeRegistry.get('ai')!,
    ];

    const handleContinue = (): void => {
      const selectedMode = modeRegistry.get(sel);
      if (selectedMode?.signin && !isAuthenticated) {
        // Auth required and not signed in → go to auth, pass intended mode
        onSignInClick?.(sel);
        return;
      }
      // No auth required, or already authenticated → set mode directly
      onModeSelect?.(sel);
    };

    const handleLater = (): void => {
      onNavigateToCollections?.();
    };

    const activeModeDef = modeRegistry.get(sel)!;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%', background: 'var(--paper)' }}>
        <div style={{ padding: "20px 18px 8px" }}>
          <div className="u-kicker" style={{ marginBottom: 6 }}>Vol. 1 · Setup</div>
          <div className="u-serif" style={{ fontSize: 26, lineHeight: 1.1, letterSpacing: "-0.02em" }}>
            Choose how <em>_underscore</em> remembers.
          </div>
          <div className="u-serif" style={{ fontSize: 13, color: "var(--ink-3)", marginTop: 6, fontStyle: "italic" }}>
            Two families. Four modes. Switchable anytime.
          </div>
        </div>
        <div className="u-rule" style={{ margin: "12px 18px 0" }} />

        <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>On this device</div>
        {[modes[0], modes[1]].map((m) => (
          <ModeRow key={m.id} m={m} active={sel === m.id} onClick={() => setSel(m.id as ModeType)} />
        ))}
        <div className="u-caps" style={{ padding: "10px 18px 4px", color: "var(--ink-3)" }}>In the cloud</div>
        {[modes[2], modes[3]].map((m) => (
          <ModeRow key={m.id} m={m} active={sel === m.id} onClick={() => setSel(m.id as ModeType)} />
        ))}

        <div style={{ marginTop: "auto", padding: 14, borderTop: "1px solid var(--rule)", display: "flex", gap: 8 }}>
          <button className="btn ghost sm" style={{ flex: 1 }} onClick={handleLater}>Later</button>
          <button className="btn accent sm" style={{ flex: 2 }} onClick={handleContinue}>Continue as {activeModeDef.name} →</button>
        </div>
      </div>
    );
  }

  function ModeRow({ m, active, onClick }: { m: ModeDefinition; active: boolean; onClick: () => void }): React.ReactElement {
    return (
      <button onClick={onClick} style={{
        all: "unset", cursor: "pointer", display: "block", width: "100%", boxSizing: "border-box",
        padding: "12px 18px",
        borderBottom: "1px solid var(--rule-soft)",
        background: active ? "var(--paper-2)" : "transparent",
      }}>
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 0 }}>
            <span style={{ color: m.accent, fontSize: 14, lineHeight: 1 }}>{m.motif}</span>
            <div className="u-serif" style={{ fontSize: 17 }}>{m.name}</div>
            {m.signin && <span className="u-mono" style={{ fontSize: 9, color: "var(--ink-3)", letterSpacing: "0.14em", textTransform: "uppercase" }}>sign-in</span>}
            {m.ttl && <span className="u-mono" style={{ fontSize: 9, color: "var(--accent)", letterSpacing: "0.14em", textTransform: "uppercase" }}>24h ttl</span>}
          </div>
          <span className="u-mono" style={{ fontSize: 10, color: "var(--ink-3)" }}>
            {active ? "●" : "○"}
          </span>
        </div>
        <div className="u-serif" style={{ fontSize: 12, color: "var(--ink-3)", marginTop: 4, fontStyle: "italic" }}>
          {m.blurb}
        </div>
      </button>
    );
  }
  ```

- [ ] **Step 4: Run tests — confirm they pass**

  ```bash
  cd /home/sandy/projects/_underscore && npx vitest run src/features/modes/__tests__/ModeSelectionView.test.tsx 2>&1 | tail -20
  ```

  Expected: all 5 tests PASS.

- [ ] **Step 5: Commit**

  ```bash
  git add src/features/modes/ModeSelectionView.tsx src/features/modes/__tests__/ModeSelectionView.test.tsx
  git commit -m "fix(modes): initialMode prop, auth guard in handleContinue, onSignInClick passes modeId"
  ```

---

## Task 3: AuthView — Remove Rogue `setMode` Calls

**Files:**
- Modify: `src/entrypoints/popup/views/AuthView.tsx` (lines ~60 and ~73)

- [ ] **Step 1: Remove `setMode('cloud')` from `handleProviderClick`**

  In `src/entrypoints/popup/views/AuthView.tsx`, find `handleProviderClick` (~line 54):

  ```ts
  // BEFORE
  if (result.success) {
      if (isRegistering) setMode('cloud');
      onLoginSuccess();
  }

  // AFTER
  if (result.success) {
      onLoginSuccess();
  }
  ```

- [ ] **Step 2: Remove `setMode('cloud')` from `handleEmailSubmit`**

  In the same file, find `handleEmailSubmit` (~line 67):

  ```ts
  // BEFORE
  if (result.success) {
      if (isRegistering) setMode('cloud');
      onLoginSuccess();
  }

  // AFTER
  if (result.success) {
      onLoginSuccess();
  }
  ```

- [ ] **Step 3: Remove unused `setMode` destructure from `useApp()`**

  At the top of `AuthView`, line 42:

  ```ts
  // BEFORE
  const { setMode } = useApp();

  // AFTER — remove entirely (setMode no longer used in AuthView)
  ```

  Also remove the `import { useApp }` line if `setMode` was the only thing pulled from it. Check whether `useApp` is still needed for anything else in the file. If not, remove that import too.

  > Note: After this change, `AuthView` imports from `'@/core/context/AppProvider'` only for `useApp`. If `setMode` was the only destructured value, the whole line can go.

- [ ] **Step 4: Build to verify no TypeScript errors**

  ```bash
  cd /home/sandy/projects/_underscore && npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds.

- [ ] **Step 5: Commit**

  ```bash
  git add src/entrypoints/popup/views/AuthView.tsx
  git commit -m "fix(auth): remove setMode from AuthView — PopupApp owns mode post-auth"
  ```

---

## Task 4: PopupApp — pendingMode, Login/Logout Toasts, New ModeSelectionView Props

**Files:**
- Modify: `src/entrypoints/popup/index.tsx`

- [ ] **Step 1: Add `toast` import from sonner**

  At the top of `src/entrypoints/popup/index.tsx`, `Toaster` is already imported from `'sonner'`. Add `toast` to the same import:

  ```ts
  // BEFORE
  import { Toaster } from 'sonner';

  // AFTER
  import { toast, Toaster } from 'sonner';
  ```

- [ ] **Step 2: Add `ModeType` import if not already present**

  Verify line 17 — `ModeType` is already imported:
  ```ts
  import type { ModeType } from '../../shared/schemas/mode-state-schemas';
  ```
  If missing, add it.

- [ ] **Step 3: Add `pendingMode` state to `PopupApp`**

  Inside `function PopupApp()`, after the existing `useState` declarations (~line 94–98), add:

  ```ts
  const [pendingMode, setPendingMode] = useState<ModeType | null>(null);
  ```

- [ ] **Step 4: Update `handleSignInClick` to accept and store `modeId`**

  Replace the existing `handleSignInClick` function (~line 186–189):

  ```ts
  // BEFORE
  const handleSignInClick = async (): Promise<void> => {
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });
    setCurrentView(View.AUTH);
  };

  // AFTER
  const handleSignInClick = async (modeId: ModeType): Promise<void> => {
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });
    setPendingMode(modeId);
    setCurrentView(View.AUTH);
  };
  ```

- [ ] **Step 5: Update `handleLoginSuccess` to set mode and fire success toast**

  Replace the existing `handleLoginSuccess` function (~line 191–193):

  ```ts
  // BEFORE
  const handleLoginSuccess = (): void => {
    setCurrentView(View.COLLECTIONS);
  };

  // AFTER
  const handleLoginSuccess = (): void => {
    if (pendingMode) {
      setMode(pendingMode);
      setPendingMode(null);
    }
    const name = user?.displayName || user?.email?.split('@')[0] || 'back';
    toast.success(`Welcome, ${name}!`);
    setCurrentView(View.COLLECTIONS);
  };
  ```

- [ ] **Step 6: Update `handleLogout` to fire sign-out toast**

  Replace the existing `handleLogout` function (~line 195–198):

  ```ts
  // BEFORE
  const handleLogout = async (): Promise<void> => {
    await logout();
    setCurrentView(View.MODE_SELECTION);
  };

  // AFTER
  const handleLogout = async (): Promise<void> => {
    await logout();
    toast('Signed out · Switched to Ephemeral mode');
    setCurrentView(View.MODE_SELECTION);
  };
  ```

- [ ] **Step 7: Pass `initialMode` and `isAuthenticated` to `ModeSelectionView`**

  Find the `<ModeSelectionView ...>` usage (~line 306–311). Add the two new props:

  ```tsx
  // BEFORE
  <ModeSelectionView
    onModeSelect={handleModeSelect}
    onSignInClick={handleSignInClick}
    onBack={previousView ? handleModeSelectionBack : undefined}
    onNavigateToCollections={() => setCurrentView(View.COLLECTIONS)}
  />

  // AFTER
  <ModeSelectionView
    onModeSelect={handleModeSelect}
    onSignInClick={handleSignInClick}
    onBack={previousView ? handleModeSelectionBack : undefined}
    onNavigateToCollections={() => setCurrentView(View.COLLECTIONS)}
    initialMode={currentMode}
    isAuthenticated={!!user}
  />
  ```

- [ ] **Step 8: Build to verify no TypeScript errors**

  ```bash
  cd /home/sandy/projects/_underscore && npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds. If you get a TypeScript error on `handleSignInClick` because it's passed as `onSignInClick` (type mismatch), verify the prop type on `ModeSelectionViewProps` was updated in Task 2 to `(modeId: ModeType) => void`.

- [ ] **Step 9: Commit**

  ```bash
  git add src/entrypoints/popup/index.tsx
  git commit -m "feat(popup): pendingMode state, set mode on login success, login/logout toasts"
  ```

---

## Task 5: SettingsPage — Sign-Out Spinner + Drop window.confirm()

**Files:**
- Modify: `src/pages/SettingsPage.tsx`

- [ ] **Step 1: Add `Spinner` import**

  At the top of `src/pages/SettingsPage.tsx`, add:

  ```ts
  import { Spinner } from '@/ui-system/components/primitives/Spinner';
  ```

- [ ] **Step 2: Add `isLoggingOut` state**

  Inside `SettingsPage`, after the existing `useState` for `typeId` (~line 42):

  ```ts
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  ```

- [ ] **Step 3: Replace `handleSignOut`**

  Replace the existing `handleSignOut` function (lines 47–51):

  ```ts
  // BEFORE
  const handleSignOut = async (): Promise<void> => {
    if (window.confirm('Sign out of _underscore?')) {
      await logout();
    }
  };

  // AFTER
  const handleSignOut = async (): Promise<void> => {
    setIsLoggingOut(true);
    try {
      await logout();
    } finally {
      setIsLoggingOut(false);
    }
  };
  ```

- [ ] **Step 4: Update the sign-out Row's `right` prop**

  Find the Account section Row (~line 119–124). Replace the `right` prop:

  ```tsx
  // BEFORE
  right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>{user ? 'Sign out' : 'Sign in'}</span>}
  onClick={user ? handleSignOut : undefined}

  // AFTER
  right={
    isLoggingOut
      ? <Spinner size="sm" />
      : <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
          {user ? 'Sign out' : 'Sign in'}
        </span>
  }
  onClick={user && !isLoggingOut ? handleSignOut : undefined}
  ```

  > The `onClick` guard (`!isLoggingOut`) prevents double-tapping during the async logout.

- [ ] **Step 5: Build to verify no TypeScript errors**

  ```bash
  cd /home/sandy/projects/_underscore && npm run build 2>&1 | tail -20
  ```

  Expected: build succeeds.

- [ ] **Step 6: Run full test suite**

  ```bash
  cd /home/sandy/projects/_underscore && npm test 2>&1 | tail -30
  ```

  Expected: all tests pass. No regressions.

- [ ] **Step 7: Commit**

  ```bash
  git add src/pages/SettingsPage.tsx
  git commit -m "fix(settings): sign-out spinner, drop window.confirm, delegated toast to PopupApp"
  ```

---

## Acceptance Verification

After all tasks complete, load the unpacked extension and verify manually:

1. **Bug 1 + UX 2:** Click the extension → if not signed in → Mode Selection → choose Cloud → Continue → AuthView appears → sign in → navigates to Collections → mode badge in header shows **Cloud** → `"Welcome, [name]!"` toast fires
2. **Bug 2:** Settings → Switch → Mode Selection re-opens with **Cloud pre-selected** (not Local)
3. **Bug 3:** Settings → Switch → choose Cloud → Continue → goes directly to **Collections** (no login page) — mode updates to Cloud
4. **UX 1:** Click "Continue with Google" in AuthView → **Google account picker appears** (not auto-signed in)
5. **UX 3:** Settings → Sign out → **no confirm dialog** → spinner appears in-place → navigates away → `"Signed out · Switched to Ephemeral mode"` toast fires
6. **Regression:** Auth failure (bad password) → **inline error in AuthView** only, no toast
