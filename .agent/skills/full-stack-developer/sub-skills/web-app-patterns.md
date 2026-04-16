---
name: Web App Patterns
description: Patterns for building the _underscore web application — public pages, authenticated dashboard, routing, auth, and data fetching.
---

# Web App Patterns

Patterns for the web app (`vite.config.web.ts` build target). The web app is a SPA hosted on Cloudflare Pages.

---

## 1. Page Component Pattern

```typescript
// src/web/app/highlights/HighlightsPage.tsx
import type { Metadata } from '../types';

export const metadata: Metadata = {
  title: 'Your Highlights — _underscore',
  description: 'Browse and manage all your saved highlights',
};

export default function HighlightsPage() {
  const { data: highlights, isLoading, error } = useHighlights();

  if (isLoading) return <HighlightsSkeleton />;
  if (error) return <ErrorBoundaryFallback error={error} />;

  return (
    <AppShellWeb>
      <PageHeader title="Highlights" />
      <HighlightList highlights={highlights} />
    </AppShellWeb>
  );
}
```

**Rules:**
- Export `metadata` for SEO (title, description, OpenGraph)
- Use skeleton loaders — never show empty states during load
- Wrap in `AppShellWeb` (web-specific, different from extension `AppShell`)
- Error boundary for all async data pages

---

## 2. Routing

Reference: React Router v7 (`vite.config.web.ts` entry)

```typescript
// src/web/router.tsx
const router = createBrowserRouter([
  // Public routes
  { path: '/', element: <LandingPage /> },
  { path: '/features', element: <FeaturesPage /> },
  { path: '/pricing', element: <PricingPage /> },

  // Auth routes
  { path: '/sign-in', element: <SignInPage /> },
  { path: '/sign-up', element: <SignUpPage /> },

  // Protected app routes — wrapped in AuthGuard
  {
    path: '/app',
    element: <AuthGuard><AppLayout /></AuthGuard>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'highlights', element: <HighlightsPage /> },
      { path: 'highlights/:id', element: <HighlightDetailPage /> },
      { path: 'collections', element: <CollectionsPage /> },
      { path: 'collections/:id', element: <CollectionDetailPage /> },
      { path: 'domains', element: <DomainsPage /> },
      { path: 'domains/:domain', element: <DomainDetailPage /> },
      { path: 'search', element: <SearchPage /> },
      { path: 'import', element: <ImportPage /> },
      { path: 'export', element: <ExportPage /> },
      { path: 'settings', element: <SettingsPage /> },
      { path: 'settings/account', element: <AccountSettingsPage /> },
      { path: 'settings/sync', element: <SyncStatusPage /> },
    ],
  },
]);
```

### Protected Route Guard

```typescript
// src/web/components/AuthGuard.tsx
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useSupabaseAuth();

  if (isLoading) return <PageLoadingSpinner />;
  if (!user) return <Navigate to="/sign-in" replace />;

  return <>{children}</>;
}
```

---

## 3. Auth Flow (Web)

The web app uses Supabase client-side PKCE flow — NOT `chrome.identity`.

```typescript
// src/web/hooks/useSupabaseAuth.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function useSupabaseAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null)
    );

    return () => subscription.unsubscribe();
  }, []);

  return { user, isLoading };
}
```

**Key differences from extension auth:**
- Extension: `chrome.identity` → Supabase (background service worker)
- Web: Supabase client PKCE (browser, no chrome.* APIs)
- Same Supabase project, same database — just different auth entry points

---

## 4. Data Fetching

Use SWR for server state management in the web app:

```typescript
// src/web/hooks/useHighlights.ts
import useSWR from 'swr';
import { apiClient } from '../api/client';

export function useHighlights(filters?: HighlightFilters) {
  const key = filters ? ['/api/highlights', filters] : '/api/highlights';

  const { data, error, isLoading, mutate } = useSWR(
    key,
    ([url, params]) => apiClient.get(url, { params }),
    {
      revalidateOnFocus: false,
      dedupingInterval: 5000,
    }
  );

  return {
    highlights: data?.data ?? [],
    total: data?.meta?.total ?? 0,
    isLoading,
    error,
    refresh: mutate,
  };
}
```

**Rules:**
- Use SWR for read operations
- Use `mutate()` for optimistic updates after write operations
- Never fetch directly in page components — always through hooks
- API calls go to Cloudflare Workers via `apiClient` (not directly to Supabase)

---

## 5. Responsive Layout

```typescript
// Breakpoints (Tailwind)
// sm:  640px  — large phone / small tablet
// md:  768px  — tablet portrait
// lg:  1024px — tablet landscape / small laptop
// xl:  1280px — desktop
// 2xl: 1536px — large desktop

// Web app layout pattern
<div className="flex min-h-screen bg-surface">
  {/* Sidebar — hidden on mobile, shown on lg+ */}
  <aside className="hidden lg:flex lg:w-64 flex-col bg-surface-container border-r border-outline-variant">
    <SideNav />
  </aside>

  {/* Main content */}
  <main className="flex-1 min-w-0">
    {/* Top bar — shown on mobile */}
    <header className="lg:hidden flex items-center px-4 h-16 border-b border-outline-variant">
      <MobileMenuButton />
    </header>

    <div className="px-4 py-6 md:px-6 lg:px-8 max-w-5xl mx-auto">
      {children}
    </div>
  </main>
</div>
```

---

## 6. Marketing Pages

Public pages (landing, features, pricing) are part of the same SPA but optimized for SEO:

```typescript
// Keep marketing pages:
// - Minimal JS interactions (prefer CSS animations)
// - Semantic HTML (article, section, h1-h6 hierarchy)
// - Open Graph meta tags
// - No authentication-dependent content
// - CTA → Chrome Web Store install link or /sign-up

// Example hero section pattern
<section className="py-20 md:py-32 bg-gradient-to-b from-primary-container to-surface">
  <div className="container mx-auto px-4 text-center">
    <h1 className="text-display-small md:text-display-medium text-on-surface mb-6">
      Highlight anything. Remember everything.
    </h1>
    <p className="text-body-large text-on-surface-variant max-w-2xl mx-auto mb-8">
      {/* tagline */}
    </p>
    <Button variant="filled" size="lg" asChild>
      <a href={CHROME_STORE_URL}>Add to Chrome — it's free</a>
    </Button>
  </div>
</section>
```

---

## 7. Cloudflare Worker API Pattern

Workers use Hono for routing:

```typescript
// src/web/api/highlights.ts
import { Hono } from 'hono';
import { createSupabaseClient } from '../lib/supabase';
import { validateJWT } from '../middleware/auth';

const highlights = new Hono();

highlights.use('*', validateJWT);

highlights.get('/', async (c) => {
  const user = c.get('user');
  const supabase = createSupabaseClient(c.env);

  const { data, error } = await supabase
    .from('highlights')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) return c.json({ data: null, error: { code: 'DB_ERROR', message: error.message } }, 500);

  return c.json({ data, error: null, meta: { total: data.length } });
});

highlights.post('/', async (c) => {
  const user = c.get('user');
  const body = await c.req.json();
  // validate with Zod schema, then insert
});

export { highlights };
```

**Response envelope** (always):
```typescript
{ data: T | null, error: { code: string, message: string } | null, meta?: { page: number, total: number } }
```
