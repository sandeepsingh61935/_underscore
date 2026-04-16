# Mode Navigation Fix — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the same-mode click redirect loop and unify navigation so both web app and popup navigate to `/collections` after mode selection consistently.

**Architecture:** Extract navigation out of `useModeTransition` into a `navigateAfterTransition` callback prop, so the parent (popup or web) controls where to navigate. Fix `CollectionsView` to only redirect for auth-required modes (`vault`, `neural`), allowing unauthenticated access to `walk` and `sprint` collections.

**Files modified:**
- `src/features/collections/views/CollectionsView.tsx` — auth guard fix
- `src/features/modes/useModeTransition.ts` — add `navigateAfterTransition` callback
- `src/features/modes/ModeSelectionView.tsx` — pass `navigateAfterTransition` to hook
- `src/entrypoints/popup/index.tsx` — pass `onNavigateToCollections` prop
- `src/core/routing/AppRoutes.tsx` — pass `onNavigateToCollections` prop

---

## Task 1: Fix `CollectionsView` auth guard

**Files:** Modify: `src/features/collections/views/CollectionsView.tsx:65-69`

- [ ] **Step 1: Update the auth redirect effect**

Replace the blanket `!isAuthenticated` redirect with a per-mode check. Only `vault` and `neural` (auth-required modes) redirect to `/mode`.

**Change from:**
```ts
React.useEffect(() => {
    if (!isAuthenticated) {
        navigate('/mode');
    }
}, [isAuthenticated, navigate]);
```

**Change to:**
```ts
const AUTH_REQUIRED_MODES: ModeType[] = ['vault', 'neural'];

React.useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
        navigate('/mode');
    }
}, [isAuthenticated, mode, navigate]);
```

- [ ] **Step 2: Verify the change compiles**

Run: `npx tsc --noEmit src/features/collections/views/CollectionsView.tsx 2>&1 | head -20`
Expected: No errors related to this file

- [ ] **Step 3: Commit**

```bash
git add src/features/collections/views/CollectionsView.tsx
git commit -m "fix(collections): only redirect for auth-required modes"
```

---

## Task 2: Add `navigateAfterTransition` to `useModeTransition`

**Files:** Modify: `src/features/modes/useModeTransition.ts`

- [ ] **Step 1: Update the hook signature and same-mode handling**

**Change the `useModeTransition` call site** (we'll update callers in Tasks 3-5), but first update the hook itself:

1. Add `navigateAfterTransition?: () => void` parameter
2. In `requestTransition`, same-mode case calls `navigateAfterTransition?.()` instead of `navigate('/collections')`
3. In `executeTransitionDirect`, after `setMode(targetMode)`, call `navigateAfterTransition?.()` instead of `navigate('/collections')`
4. In `executeTransitionDirect`, for auth-gated modes, call `navigateAfterTransition?.()` for the sign-in path (keep existing `navigate('/sign-in')` as fallback)
5. Add `navigateAfterTransition` to the dependency arrays of `useCallback`s

**Complete new `useModeTransition.ts`:**

```ts
import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getTransitionRule, executeTransitionGuard } from '@/content/modes/mode-transition-rules';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';

interface ModeTransitionState {
    isPending: boolean;
    targetMode: ModeType | null;
    confirmMessage: string | null;
}

export interface UseModeTransitionOptions {
    /** Called after a mode transition completes — use this to navigate in the parent */
    navigateAfterTransition?: () => void;
}

/**
 * Custom hook wrapping mode transition logic:
 * - Checks transition rules
 * - Shows confirmation when required
 * - Runs guard functions
 * - Executes transition with spinner overlay
 * - Calls navigateAfterTransition on completion (parent controls routing)
 */
export function useModeTransition({ navigateAfterTransition }: UseModeTransitionOptions = {}) {
    const navigate = useNavigate();
    const { currentMode, setMode, isAuthenticated } = useApp();
    const { logout } = useCurrentUser();
    const [state, setState] = useState<ModeTransitionState>({
        isPending: false,
        targetMode: null,
        confirmMessage: null,
    });

    const requestTransition = useCallback(
        (targetMode: ModeType) => {
            if (targetMode === currentMode) {
                // Same mode — just go to collections via parent callback
                navigateAfterTransition?.();
                return;
            }

            // Auth-gated modes — redirect to sign-in
            if ((targetMode === 'vault' || targetMode === 'neural') && !isAuthenticated) {
                navigate('/sign-in');
                return;
            }

            // Check transition rule
            const rule = getTransitionRule(currentMode, targetMode);

            if (rule?.requiresConfirmation) {
                setState({
                    isPending: false,
                    targetMode,
                    confirmMessage: rule.reason,
                });
            } else {
                // Direct transition
                executeTransitionDirect(targetMode);
            }
        },
        [currentMode, isAuthenticated, navigate, navigateAfterTransition]
    );

    const executeTransitionDirect = useCallback(
        async (targetMode: ModeType) => {
            setState(s => ({ ...s, isPending: true, confirmMessage: null }));

            try {
                // Run guard if exists
                const guardResult = await executeTransitionGuard(
                    currentMode,
                    targetMode
                ).catch(() => true);

                if (!guardResult) {
                    setState({ isPending: false, targetMode: null, confirmMessage: null });
                    return;
                }

                // Simulate transfer time
                await new Promise(r => setTimeout(r, 1800));

                // Check for downgrade from auth-required mode to local mode
                const isDowngrade =
                    (currentMode === 'neural' || currentMode === 'vault') &&
                    (targetMode === 'walk' || targetMode === 'sprint');

                if (isDowngrade) {
                    console.log('[useModeTransition] Downgrading local mode. Triggering sync and auto sign-out...');
                    await logout();
                }

                setMode(targetMode);
                navigateAfterTransition?.();
            } finally {
                setState({ isPending: false, targetMode: null, confirmMessage: null });
            }
        },
        [currentMode, setMode, navigateAfterTransition]
    );

    const confirmTransition = useCallback(() => {
        if (state.targetMode) {
            executeTransitionDirect(state.targetMode);
        }
    }, [state.targetMode, executeTransitionDirect]);

    const cancelTransition = useCallback(() => {
        setState({ isPending: false, targetMode: null, confirmMessage: null });
    }, []);

    return {
        ...state,
        requestTransition,
        confirmTransition,
        cancelTransition,
    };
}
```

- [ ] **Step 2: Verify the change compiles**

Run: `npx tsc --noEmit src/features/modes/useModeTransition.ts 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/modes/useModeTransition.ts
git commit -m "feat(modes): extract navigation to navigateAfterTransition callback"
```

---

## Task 3: Pass `navigateAfterTransition` in `ModeSelectionView`

**Files:** Modify: `src/features/modes/ModeSelectionView.tsx`

- [ ] **Step 1: Add `onNavigateToCollections` prop and wire it to the hook**

**Changes:**

1. Add `onNavigateToCollections?: () => void` to `ModeSelectionViewProps` interface
2. Destructure `onNavigateToCollections` from props
3. Pass `{ navigateAfterTransition: onNavigateToCollections }` to `useModeTransition()`

**Change `ModeSelectionViewProps` interface (line ~52):**
```ts
export interface ModeSelectionViewProps {
    /** Optional callback for popup context routing */
    onModeSelect?: (modeId: string) => void;
    /** Optional callback for popup authentication routing */
    onSignInClick?: () => void;
    /** Optional callback to navigate back to previous screen */
    onBack?: () => void;
    /** Optional callback invoked after mode transition completes — use to navigate to collections */
    onNavigateToCollections?: () => void;
}
```

**Change the component function signature and destructuring (line ~65):**
```ts
export function ModeSelectionView({ onModeSelect, onSignInClick, onBack, onNavigateToCollections }: ModeSelectionViewProps = {}) {
```

**Change the `useModeTransition` call (line ~68):**
```ts
    const {
        isPending,
        confirmMessage,
        requestTransition,
        confirmTransition,
        cancelTransition,
    } = useModeTransition({ navigateAfterTransition: onNavigateToCollections });
```

- [ ] **Step 2: Verify the change compiles**

Run: `npx tsc --noEmit src/features/modes/ModeSelectionView.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/features/modes/ModeSelectionView.tsx
git commit -m "feat(modes): wire navigateAfterTransition through ModeSelectionView"
```

---

## Task 4: Update popup entry to pass `onNavigateToCollections`

**Files:** Modify: `src/entrypoints/popup/index.tsx`

- [ ] **Step 1: Add `onNavigateToCollections` prop to the `ModeSelectionView` render**

**Find the `ModeSelectionView` render inside `PopupApp` (around line 260) and add the prop:**

```tsx
<ModeSelectionView
    onModeSelect={handleModeSelect}
    onSignInClick={handleSignInClick}
    onBack={previousView ? handleModeSelectionBack : undefined}
    onNavigateToCollections={() => setCurrentView(View.COLLECTIONS)}
/>
```

- [ ] **Step 2: Verify the change compiles**

Run: `npx tsc --noEmit src/entrypoints/popup/index.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/entrypoints/popup/index.tsx
git commit -m "fix(popup): wire onNavigateToCollections to setCurrentView(COLLECTIONS)"
```

---

## Task 5: Update web app `AppRoutes` to pass `onNavigateToCollections`

**Files:** Modify: `src/core/routing/AppRoutes.tsx`

- [ ] **Step 1: Create a wrapper component with `useNavigate` and `setMode`, pass as `onNavigateToCollections`**

The `<Route>` component doesn't have access to hooks directly, so create a small inline wrapper.

**Replace the `/mode` route:**
```tsx
import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/core/context/AppProvider';
import { WelcomePage } from '@/pages/WelcomePage';
import { SignInView } from '@/features/auth/SignInView';
import { ModeSelectionView } from '@/features/modes/ModeSelectionView';
import { CollectionsView } from '@/features/collections/views/CollectionsView';
import { DomainDetailsView } from '@/features/collections/views/DomainDetailsView';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useApp } from '@/core/context/AppProvider';
import { useNavigate } from 'react-router-dom';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

/** Web-app wrapper — provides onNavigateToCollections using react-router + useApp */
function ModeSelectionRoute(): React.JSX.Element {
    const navigate = useNavigate();
    const { setMode } = useApp();

    const handleNavigateToCollections = () => {
        navigate('/collections');
    };

    return (
        <ModeSelectionView
            onNavigateToCollections={handleNavigateToCollections}
        />
    );
}

export function AppRoutes() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<WelcomePage />} />
                    <Route path="/sign-in" element={<SignInView />} />
                    <Route path="/mode" element={<ModeSelectionRoute />} />
                    <Route path="/collections" element={<CollectionsView />} />
                    <Route path="/domain/:domain" element={<DomainDetailsView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    {/* Catch-all */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </AppProvider>
    );
}
```

- [ ] **Step 2: Verify the change compiles**

Run: `npx tsc --noEmit src/core/routing/AppRoutes.tsx 2>&1 | head -20`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/core/routing/AppRoutes.tsx
git commit -m "fix(web): wire onNavigateToCollections via ModeSelectionRoute"
```

---

## Verification

- [ ] Run `npm run build:web 2>&1 | tail -10` — build should succeed
- [ ] In browser (web): open `/mode`, click Focus (walk) — should navigate to `/collections`
- [ ] In browser (web): open `/mode`, click Capture (sprint) — should show spinner then navigate to `/collections`
- [ ] In popup (extension): open popup, navigate to mode selection, click any mode — should navigate to collections view

---

## Self-Review Checklist

- [ ] All 5 files compile with `tsc --noEmit`
- [ ] `npm run build:web` succeeds
- [ ] `npm run lint -- src/features/modes/ src/features/collections/views/ src/core/routing/ src/entrypoints/popup/index.tsx 2>&1 | tail -5` — no new errors introduced
- [ ] `useModeTransition` dependency arrays include `navigateAfterTransition` in both callbacks
- [ ] `CollectionsView` only redirects for `vault` and `neural` modes
- [ ] Popup uses `setCurrentView(View.COLLECTIONS)` as `onNavigateToCollections`
- [ ] Web app uses `navigate('/collections')` as `onNavigateToCollections`
