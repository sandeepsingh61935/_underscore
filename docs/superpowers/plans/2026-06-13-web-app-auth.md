# Web App Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fake authentication in the Web App with real Supabase OAuth (Google) and Email/Password flows, and seamlessly resume intended mode transitions after OAuth redirects via URL parameters.

**Architecture:** We will modify `SignInView.tsx` to use `supabase.auth` methods instead of fake timeouts. We will update `useModeTransition.ts` to append `?intendedMode=...` when redirecting to `/sign-in`, and update `AppRoutes.tsx` to intercept this parameter on load and automatically apply the mode.

**Tech Stack:** React 18, React Router DOM, Supabase Auth.

---

### Task 1: Resume Intent via AppRoutes

**Files:**
- Modify: `src/core/routing/AppRoutes.tsx`
- Modify: `src/features/modes/useModeTransition.ts`

- [ ] **Step 1: Update `useModeTransition` to pass intent**
  In `src/features/modes/useModeTransition.ts`, modify the `requestTransition` function:
```ts
// BEFORE
            if ((targetMode === 'cloud' || targetMode === 'ai') && !isAuthenticated) {
                navigate('/sign-in');
                return;
            }

// AFTER
            if ((targetMode === 'cloud' || targetMode === 'ai') && !isAuthenticated) {
                navigate(`/sign-in?intendedMode=${targetMode}`);
                return;
            }
```

- [ ] **Step 2: Update `AppRoutes` to intercept intent**
  In `src/core/routing/AppRoutes.tsx`, create an inner component to handle the URL search param logic before rendering routes.
```tsx
// BEFORE
export function AppRoutes() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>

// AFTER
function IntentCatcher({ children }: { children: React.ReactNode }) {
    const { setMode } = useApp();
    const navigate = useNavigate();
    
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const intendedMode = params.get('intendedMode');
        if (intendedMode === 'cloud' || intendedMode === 'ai') {
            setMode(intendedMode);
            navigate('/collections', { replace: true });
        }
    }, [setMode, navigate]);

    return <>{children}</>;
}

export function AppRoutes() {
    return (
        <AppProvider>
            <BrowserRouter>
                <IntentCatcher>
                    <Routes>
// NOTE: Make sure to wrap </Routes> with </IntentCatcher>
```

- [ ] **Step 3: Close the tag**
  In `src/core/routing/AppRoutes.tsx`:
```tsx
// BEFORE
                </Routes>
            </BrowserRouter>
        </AppProvider>

// AFTER
                    </Routes>
                </IntentCatcher>
            </BrowserRouter>
        </AppProvider>
```

- [ ] **Step 4: Commit**
```bash
git add src/core/routing/AppRoutes.tsx src/features/modes/useModeTransition.ts
git commit -m "feat(auth): add intent catcher for mode transitions after auth redirect"
```

---

### Task 2: Supabase Auth in SignInView

**Files:**
- Modify: `src/features/auth/SignInView.tsx`

- [ ] **Step 1: Import Supabase client**
  At the top of `src/features/auth/SignInView.tsx`, import the client:
```tsx
import { createClient } from '@supabase/supabase-js';
```

- [ ] **Step 2: Initialize Supabase client inside the component**
  Inside `SignInView`, initialize the client:
```tsx
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
    const supabase = createClient(supabaseUrl, supabaseKey);
```

- [ ] **Step 3: Update `handleSocialAuth`**
  Modify `handleSocialAuth`:
```tsx
    const handleSocialAuth = async (provider: 'google' | 'apple'): Promise<void> => {
        setIsLoading(true);
        try {
            const params = new URLSearchParams(window.location.search);
            const intendedMode = params.get('intendedMode');
            const redirectUrl = new URL(window.location.href);
            redirectUrl.pathname = '/'; // Base URL
            if (intendedMode) {
                redirectUrl.searchParams.set('intendedMode', intendedMode);
            }
            
            await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: redirectUrl.toString(),
                }
            });
        } catch (err) {
            console.error('Auth error:', err);
            setIsLoading(false);
        }
    };
```

- [ ] **Step 4: Update `handleSubmit` for Email/Password**
  Modify `handleSubmit`:
```tsx
    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        setIsLoading(true);
        try {
            if (isSignIn) {
                const { error } = await supabase.auth.signInWithPassword({ email, password });
                if (error) throw error;
            } else {
                const { error } = await supabase.auth.signUp({ email, password });
                if (error) throw error;
            }
            
            // Email/password doesn't redirect, so manually handle intent or fallback
            const params = new URLSearchParams(window.location.search);
            const intendedMode = params.get('intendedMode');
            if (intendedMode === 'cloud' || intendedMode === 'ai') {
                window.location.href = `/?intendedMode=${intendedMode}`;
            } else {
                navigate('/mode');
            }
        } catch (err) {
            console.error('Auth error:', err);
        } finally {
            setIsLoading(false);
        }
    };
```

- [ ] **Step 5: Commit**
```bash
git add src/features/auth/SignInView.tsx
git commit -m "feat(auth): implement real supabase auth for web app"
```
