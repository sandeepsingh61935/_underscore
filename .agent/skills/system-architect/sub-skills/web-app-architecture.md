---
name: Web App Architecture
description: Architecture for the _underscore web application — Cloudflare Pages SPA, Cloudflare Workers API, Supabase integration, auth session management, and caching.
---

# Web App Architecture

---

## 1. Hosting Stack

| Layer | Service | Plan | Notes |
|-------|---------|------|-------|
| Static SPA | Cloudflare Pages | Free | Unlimited requests, 500 builds/month |
| Edge API | Cloudflare Workers | Free | 100K req/day, < 10ms avg latency |
| Database | Supabase PostgreSQL | Free | 500MB, 50K auth users |
| Realtime | Supabase Realtime | Free | 200 concurrent connections |
| Asset storage | Cloudflare R2 | Free | 10GB, 10M reads/month |

---

## 2. SPA Architecture

```
Cloudflare Pages serves the built React SPA
  ├── index.html — app shell
  ├── assets/ — hashed chunks (cached 1 year)
  └── _headers — CSP, CORS, security headers

React Router v7 handles client-side routing
  ├── / → LandingPage (public, SEO)
  ├── /features, /pricing → public marketing
  ├── /sign-in, /sign-up → auth pages
  └── /app/* → protected app routes (AuthGuard)
```

### Build Configuration

```typescript
// vite.config.web.ts
export default defineConfig({
  build: {
    rollupOptions: {
      input: { main: 'index.web.html' },
      output: {
        manualChunks: {
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-supabase': ['@supabase/supabase-js'],
          'vendor-ui': ['@radix-ui/...', 'lucide-react'],
        }
      }
    }
  }
});
```

---

## 3. Edge API (Cloudflare Workers + Hono)

```
Worker receives request
  → Hono router matches route
    → CORS middleware (allow: extension ID + web domain)
      → Rate limit middleware
        → Auth middleware (validate JWT from Authorization header)
          → Route handler
            → Supabase (server-side client with service role key)
              → JSON response (envelope format)
```

### Worker Entry Point

```typescript
// src/web/api/index.ts
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { highlights } from './highlights';
import { collections } from './collections';
import { sync } from './sync';
import { auth } from './auth';

const app = new Hono();

app.use('*', cors({ origin: ['https://underscore.app', 'chrome-extension://...'] }));
app.route('/v1/auth', auth);
app.route('/v1/highlights', highlights);
app.route('/v1/collections', collections);
app.route('/v1/sync', sync);

export default app;
```

### Auth Middleware

```typescript
// src/web/api/middleware/auth.ts
export const validateJWT = createMiddleware(async (c, next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return c.json({ error: 'Unauthorized' }, 401);

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return c.json({ error: 'Invalid token' }, 401);

  c.set('user', user);
  await next();
});
```

---

## 4. Supabase Integration (Web)

Web app uses Supabase differently from the extension:

| Concern | Extension | Web App |
|---------|-----------|---------|
| Auth | chrome.identity → GoTrue | Browser PKCE → GoTrue |
| Database reads | Background worker → Supabase JS SDK | Workers → Supabase server SDK |
| Realtime | chrome.runtime messages | Supabase Realtime channels (browser) |
| Token storage | chrome.storage.local (encrypted) | httpOnly cookies (Supabase managed) |

### Realtime Sync (Web)

```typescript
// Subscribe to highlight changes for the current user
const channel = supabase
  .channel('highlights')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'highlights',
    filter: `user_id=eq.${user.id}`
  }, handleChange)
  .subscribe();

// Cleanup
return () => supabase.removeChannel(channel);
```

---

## 5. Static Assets and CDN

```
_headers file (Cloudflare Pages):
  /assets/*
    Cache-Control: public, max-age=31536000, immutable
  /
    Cache-Control: no-cache
  /*
    X-Frame-Options: DENY
    X-Content-Type-Options: nosniff
    Content-Security-Policy: default-src 'self'; ...
```

**Rule**: All static assets are content-hash named by Vite → 1-year cache. HTML files are never cached (always fresh).

---

## 6. Auth Session Management

Web app uses Supabase's built-in session management:

```typescript
// Supabase handles:
// - PKCE flow for initial auth
// - httpOnly cookies for session persistence
// - Automatic token refresh (before 5min expiry)
// - Session termination on logout

// Application code only needs:
const { data: { session } } = await supabase.auth.getSession();
// session is null if not authenticated
```

**Security**: Token refresh uses a separate long-lived refresh token (30 days). Supabase rotates refresh tokens on each use (rotation detection).

---

## 7. Marketing Page Strategy

Marketing pages (`/`, `/features`, `/pricing`) are part of the same SPA but should feel static:

- Minimal JS — prefer CSS animations and transitions
- No client-side data fetching on initial render
- Semantic HTML for SEO (`<article>`, `<section>`, `h1`-`h6` hierarchy)
- Open Graph + Twitter Card meta tags
- Structured data (JSON-LD) for rich search results
- Core Web Vitals targets: LCP < 2.5s, FID < 100ms, CLS < 0.1

Consider extracting marketing pages to static HTML if JS bundle becomes too large for landing page performance targets.
