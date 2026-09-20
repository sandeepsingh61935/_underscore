# Web Phone and Tablet Consume Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the existing web app a Pro consume surface on phone and tablet: sign-in wall, read-only library, 767px IA cliff, text-fragment open in a new tab, and a privacy-safe analytics sink.

**Architecture:** Pure classifiers and analytics parsing in `src/web/lib` and `src/shared/analytics`. Pages Function `POST /api/analytics` is a thin allowlist wrapper. `WebAppShell` product routes gain a handheld auth gate. Library/Home/Settings already exist; this plan gates them, it does not add a Flutter tree.

**Tech Stack:** React 19, React Router 6, TypeScript strict, Vitest, Cloudflare Pages Functions, existing Supabase web auth (Google PKCE), V2 CSS custom properties.

**Spec:** `docs/superpowers/specs/2026-09-20-phone-tablet-consume-prd.md`

**ADR:** `docs/04-adrs/031-mobile-consume-clients.md`

## Global Constraints

- Editorial tokens only: no Tailwind; no hardcoded hex in TSX; no MD3; no Ink & Glass (`--ink-1..4`); no Style C aliases (`var(--bg)`, `var(--text-primary)`). Prefer `var(--rule)` / `var(--rule-soft)` on CSS you touch.
- Do not create `apps/mobile/`, Capacitor, PWA manifest, or store listings.
- Do not add Ask, guest handheld library, MCP setup, vault picker, or capture.
- Desktop guest (`basic`) and desktop mutations stay as they are.
- Analytics props: no highlight quote, no raw search string, no email.
- API envelope `{ data, error, meta }`.
- Conventional commits: `type(scope): subject`. No emoji in commits or UI copy.
- Tests: Vitest. TDD for pure helpers. `bun run type-check` before calling a task done.
- Product copy: Guest / Free / Account (Paid) — do not add "Pro" in new strings.

## File map (create unless noted)

| Path | Responsibility |
|------|----------------|
| `src/web/lib/classify-web-client.ts` | Pure `phone` / `tablet` / `desktop` classifier |
| `src/web/lib/classify-web-client.test.ts` | UA / iPad / pointer cases |
| `src/web/lib/use-web-client-kind.ts` | Hook: navigator + matchMedia coarse pointer + innerWidth |
| `src/web/lib/is-mobile-web-viewport.ts` | **Modify** — `WEB_MOBILE_MQ` to 767px; export pure `isMobileWebViewport` |
| `src/web/lib/is-mobile-web-viewport.test.ts` | **Modify** — breakpoint comment/assert if needed |
| `src/shared/analytics/parse-analytics-event.ts` | Allowlist + body parse |
| `src/shared/analytics/parse-analytics-event.test.ts` | Reject PII-shaped / unknown events |
| `src/web/lib/analytics.ts` | **Modify** — `sendBeacon` `/api/analytics` after eventBus |
| `src/web/lib/analytics.test.ts` | Beacon payload tests |
| `functions/api/analytics.ts` | Pages Function POST allowlist |
| `src/web/guards/HandheldAuthGate.tsx` | Redirect unsigned phone/tablet to sign-in |
| `src/web/guards/HandheldAuthGate.test.tsx` | Desktop guest passes; iPhone unsigned redirects |
| `src/core/routing/AppRoutes.tsx` | **Modify** — wrap product shell with gate |
| `src/web/theme/web-app.css` | **Modify** — 820/821 → 767/768 |
| `src/web/pages/LibraryPage.tsx` | **Modify** — consume-only, search/open events |
| `src/web/pages/HomePage.tsx` | **Modify** — consume-only on handheld |
| `src/web/pages/WebSettingsPage.tsx` | **Modify** — hide Integrations + Data on handheld |
| `src/web/components/WebHighlightCard.tsx` | **Modify** — fragment URL + `highlight_open_source` |
| `src/web/routing/settingsTab.ts` | **Modify** — optional handheld tab filter helper |

---

### Task 1: Classify web client

**Files:**
- Create: `src/web/lib/classify-web-client.ts`
- Create: `src/web/lib/classify-web-client.test.ts`

**Interfaces:**
- Consumes: nothing
- Produces:
  - `export type WebClientKind = 'phone' | 'tablet' | 'desktop'`
  - `export type ClassifyWebClientInput = { userAgent: string; maxTouchPoints: number; pointerCoarse: boolean; viewportWidth: number }`
  - `export function classifyWebClient(input: ClassifyWebClientInput): WebClientKind`
  - `export function isHandheldClient(kind: WebClientKind): boolean`

- [ ] **Step 1: Write failing tests**

```ts
// src/web/lib/classify-web-client.test.ts
import { describe, expect, it } from 'vitest';

import { classifyWebClient, isHandheldClient } from './classify-web-client';

const desktop = {
  userAgent:
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0',
  maxTouchPoints: 0,
  pointerCoarse: false,
  viewportWidth: 1440,
};

describe('classifyWebClient', () => {
  it('classifies iPhone as phone', () => {
    expect(
      classifyWebClient({
        userAgent:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 390,
      })
    ).toBe('phone');
  });

  it('classifies iPad (Macintosh + touches) as tablet even when wide', () => {
    expect(
      classifyWebClient({
        userAgent:
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 1024,
      })
    ).toBe('tablet');
  });

  it('classifies Android Mobile as phone', () => {
    expect(
      classifyWebClient({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Mobile',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 412,
      })
    ).toBe('phone');
  });

  it('classifies Android tablet (no Mobile token) as tablet', () => {
    expect(
      classifyWebClient({
        userAgent: 'Mozilla/5.0 (Linux; Android 14; SM-X810) AppleWebKit/537.36',
        maxTouchPoints: 5,
        pointerCoarse: true,
        viewportWidth: 800,
      })
    ).toBe('tablet');
  });

  it('classifies desktop Chrome as desktop', () => {
    expect(classifyWebClient(desktop)).toBe('desktop');
  });

  it('does not treat a narrow desktop window as phone', () => {
    expect(classifyWebClient({ ...desktop, viewportWidth: 500 })).toBe('desktop');
  });
});

describe('isHandheldClient', () => {
  it('is true for phone and tablet only', () => {
    expect(isHandheldClient('phone')).toBe(true);
    expect(isHandheldClient('tablet')).toBe(true);
    expect(isHandheldClient('desktop')).toBe(false);
  });
});
```

- [ ] **Step 2: Run tests — expect FAIL**

Run: `bunx vitest run src/web/lib/classify-web-client.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement**

```ts
// src/web/lib/classify-web-client.ts
export type WebClientKind = 'phone' | 'tablet' | 'desktop';

export type ClassifyWebClientInput = {
  userAgent: string;
  maxTouchPoints: number;
  pointerCoarse: boolean;
  viewportWidth: number;
};

export function isHandheldClient(kind: WebClientKind): boolean {
  return kind === 'phone' || kind === 'tablet';
}

export function classifyWebClient(input: ClassifyWebClientInput): WebClientKind {
  const ua = input.userAgent;
  const iPhone = /iPhone|iPod/i.test(ua);
  const iPadToken = /iPad/i.test(ua);
  const iPadOsDesktopUa = /Macintosh/i.test(ua) && input.maxTouchPoints > 1;
  const android = /Android/i.test(ua);
  const androidMobile = android && /Mobile/i.test(ua);

  if (iPhone || androidMobile) return 'phone';
  if (iPadToken || iPadOsDesktopUa) return 'tablet';
  if (android && !androidMobile) return 'tablet';
  if (input.pointerCoarse && input.viewportWidth < 768) return 'phone';
  if (input.pointerCoarse) return 'tablet';
  return 'desktop';
}
```

- [ ] **Step 4: Run tests — expect PASS**

Run: `bunx vitest run src/web/lib/classify-web-client.test.ts`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/web/lib/classify-web-client.ts src/web/lib/classify-web-client.test.ts
git commit -m "feat(web): classify phone tablet and desktop clients"
```

---

### Task 2: Phone IA cliff at 767px

**Files:**
- Modify: `src/web/lib/is-mobile-web-viewport.ts`
- Modify: `src/web/lib/is-mobile-web-viewport.test.ts` (keep existing cases; they already import `isMobileWebViewport`)
- Modify: `src/web/theme/web-app.css` (`max-width: 820px` → `767px`, `min-width: 821px` → `768px`)
- Create: `src/web/lib/use-web-client-kind.ts`

**Interfaces:**
- Consumes: `classifyWebClient` from Task 1
- Produces:
  - `export const WEB_MOBILE_MQ = '(max-width: 767px)'`
  - `export function isMobileWebViewport(mq: { matches: boolean } | null | undefined): boolean`
  - `export function useWebClientKind(): WebClientKind`

- [ ] **Step 1: Align viewport helper with existing tests**

The test file already expects `isMobileWebViewport`. Implement it and change the media query.

```ts
// src/web/lib/is-mobile-web-viewport.ts
import { useEffect, useState } from 'react';

/** Matches web-app.css tabbar breakpoint (`max-width: 767px`). */
export const WEB_MOBILE_MQ = '(max-width: 767px)';

export function isMobileWebViewport(
  mq: { matches: boolean } | null | undefined
): boolean {
  return Boolean(mq?.matches);
}

export function useMobileWebViewport(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(WEB_MOBILE_MQ).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(WEB_MOBILE_MQ);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return mobile;
}
```

- [ ] **Step 2: Run viewport tests**

Run: `bunx vitest run src/web/lib/is-mobile-web-viewport.test.ts`

Expected: PASS

- [ ] **Step 3: Add client-kind hook**

```ts
// src/web/lib/use-web-client-kind.ts
import { useEffect, useState } from 'react';

import {
  classifyWebClient,
  type WebClientKind,
} from '@/web/lib/classify-web-client';

function readKind(): WebClientKind {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return 'desktop';
  }
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return classifyWebClient({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    pointerCoarse: coarse,
    viewportWidth: window.innerWidth,
  });
}

export function useWebClientKind(): WebClientKind {
  const [kind, setKind] = useState<WebClientKind>('desktop');
  useEffect(() => {
    const update = () => setKind(readKind());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return kind;
}
```

- [ ] **Step 4: Move CSS cliff**

In `src/web/theme/web-app.css` replace the product-shell breakpoints only (do not edit `public-pages.css`):

- `@media (min-width: 821px)` → `@media (min-width: 768px)` (overlay-side desktop rule)
- `@media (max-width: 820px)` → `@media (max-width: 767px)` (tabbar, drawer sidebar, stacked home)

Leave `.lib-shell` two-pane rules that already apply above the phone cliff as-is so tablet portrait gets sidebar + two-pane.

- [ ] **Step 5: Type-check**

Run: `bun run type-check`

Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/web/lib/is-mobile-web-viewport.ts src/web/lib/use-web-client-kind.ts src/web/theme/web-app.css
git commit -m "fix(web): phone tabbar below 768px for tablet sidebar"
```

---

### Task 3: Analytics allowlist and sink

**Files:**
- Create: `src/shared/analytics/parse-analytics-event.ts`
- Create: `src/shared/analytics/parse-analytics-event.test.ts`
- Create: `src/web/lib/analytics.test.ts`
- Create: `functions/api/analytics.ts`
- Modify: `src/web/lib/analytics.ts`

**Interfaces:**
- Consumes: `eventBus` (existing)
- Produces:
  - `export const ANALYTICS_EVENT_NAMES`
  - `export type AnalyticsEventName`
  - `export function parseAnalyticsEvent(raw: unknown): { ok: true; name: AnalyticsEventName; props: Record<string, string | number | boolean> } | { ok: false; error: string }`
  - `trackEvent` still `void`; also beacons `/api/analytics`

- [ ] **Step 1: Write failing parse tests**

```ts
// src/shared/analytics/parse-analytics-event.test.ts
import { describe, expect, it } from 'vitest';

import { parseAnalyticsEvent } from './parse-analytics-event';

describe('parseAnalyticsEvent', () => {
  it('accepts allowlisted name and client prop', () => {
    const r = parseAnalyticsEvent({
      name: 'library_open',
      props: { client: 'phone' },
    });
    expect(r).toEqual({
      ok: true,
      name: 'library_open',
      props: { client: 'phone' },
    });
  });

  it('rejects unknown event names', () => {
    const r = parseAnalyticsEvent({ name: 'debug_dump', props: {} });
    expect(r.ok).toBe(false);
  });

  it('strips quote and q props', () => {
    const r = parseAnalyticsEvent({
      name: 'library_search',
      props: { client: 'tablet', quote: 'secret', q: 'my query', result_count: 3 },
    });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.props).toEqual({ client: 'tablet', result_count: 3 });
      expect(r.props).not.toHaveProperty('quote');
      expect(r.props).not.toHaveProperty('q');
    }
  });
});
```

- [ ] **Step 2: Run parse tests — expect FAIL**

Run: `bunx vitest run src/shared/analytics/parse-analytics-event.test.ts`

Expected: FAIL (module not found)

- [ ] **Step 3: Implement parser**

```ts
// src/shared/analytics/parse-analytics-event.ts
export const ANALYTICS_EVENT_NAMES = [
  'library_open',
  'highlight_open_source',
  'library_search',
] as const;

export type AnalyticsEventName = (typeof ANALYTICS_EVENT_NAMES)[number];

const NAME_SET = new Set<string>(ANALYTICS_EVENT_NAMES);
const PROP_ALLOW = new Set(['client', 'result_count', 'rank', 'reason']);
const PROP_DENY = new Set(['quote', 'q', 'query', 'email', 'text']);

export function parseAnalyticsEvent(
  raw: unknown
):
  | {
      ok: true;
      name: AnalyticsEventName;
      props: Record<string, string | number | boolean>;
    }
  | { ok: false; error: string } {
  if (!raw || typeof raw !== 'object') return { ok: false, error: 'invalid' };
  const rec = raw as Record<string, unknown>;
  if (typeof rec.name !== 'string' || !NAME_SET.has(rec.name)) {
    return { ok: false, error: 'unknown_event' };
  }
  const propsIn =
    rec.props && typeof rec.props === 'object' && !Array.isArray(rec.props)
      ? (rec.props as Record<string, unknown>)
      : {};
  const props: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(propsIn)) {
    if (PROP_DENY.has(k)) continue;
    if (!PROP_ALLOW.has(k)) continue;
    if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
      props[k] = v;
    }
  }
  return { ok: true, name: rec.name as AnalyticsEventName, props };
}
```

- [ ] **Step 4: Run parse tests — expect PASS**

Run: `bunx vitest run src/shared/analytics/parse-analytics-event.test.ts`

Expected: PASS

- [ ] **Step 5: Beacon from trackEvent**

Replace `src/web/lib/analytics.ts` with:

```ts
import { parseAnalyticsEvent } from '@/shared/analytics/parse-analytics-event';
import { eventBus } from '@/shared/utils/event-bus';

export type AnalyticsProps = Record<
  string,
  string | number | boolean | null | undefined
>;

export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  const parsed = parseAnalyticsEvent({ name, props });
  const payload = {
    name,
    props: parsed.ok ? parsed.props : {},
    timestamp: Date.now(),
  };
  try {
    eventBus.emit('analytics:event', payload);
  } catch {
    // Analytics must never break UX.
  }
  if (!parsed.ok) return;
  try {
    const body = JSON.stringify({ name: parsed.name, props: parsed.props });
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon('/api/analytics', blob);
      return;
    }
    if (typeof fetch === 'function') {
      void fetch('/api/analytics', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body,
        keepalive: true,
      });
    }
  } catch {
    // ignore
  }
}
```

Existing `related_*` events will stop beaconing (not allowlisted) but still hit the bus. Do **not** expand the allowlist in this task.

- [ ] **Step 6: Pages Function**

```ts
// functions/api/analytics.ts
import { parseAnalyticsEvent } from '../../src/shared/analytics/parse-analytics-event';

interface PagesContext {
  request: Request;
}

function envelope(
  data: unknown,
  error: { message: string } | null,
  status: number
): Response {
  return new Response(JSON.stringify({ data, error, meta: {} }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export async function onRequest(context: PagesContext): Promise<Response> {
  if (context.request.method !== 'POST') {
    return envelope(null, { message: 'method_not_allowed' }, 405);
  }
  let raw: unknown;
  try {
    raw = await context.request.json();
  } catch {
    return envelope(null, { message: 'invalid_json' }, 400);
  }
  const parsed = parseAnalyticsEvent(raw);
  if (!parsed.ok) {
    return envelope(null, { message: parsed.error }, 400);
  }
  console.info(
    JSON.stringify({
      analytics: true,
      name: parsed.name,
      props: parsed.props,
    })
  );
  return envelope({ ok: true }, null, 200);
}
```

- [ ] **Step 7: trackEvent tests**

```ts
// src/web/lib/analytics.test.ts
import { afterEach, describe, expect, it, vi } from 'vitest';

import { trackEvent } from './analytics';

describe('trackEvent', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('beacons allowlisted events', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    trackEvent('library_open', { client: 'phone', quote: 'nope' });
    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const blob = sendBeacon.mock.calls[0]?.[1] as Blob;
    expect(sendBeacon.mock.calls[0]?.[0]).toBe('/api/analytics');
    expect(blob).toBeInstanceOf(Blob);
  });

  it('does not beacon unknown names', () => {
    const sendBeacon = vi.fn(() => true);
    vi.stubGlobal('navigator', { sendBeacon });
    trackEvent('related_tag_clicked', { rank: 1 });
    expect(sendBeacon).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 8: Run analytics tests**

Run: `bunx vitest run src/shared/analytics/parse-analytics-event.test.ts src/web/lib/analytics.test.ts`

Expected: PASS

- [ ] **Step 9: Commit**

```bash
git add src/shared/analytics src/web/lib/analytics.ts src/web/lib/analytics.test.ts functions/api/analytics.ts
git commit -m "feat(web): privacy-safe analytics sink for consume events"
```

---

### Task 4: Handheld sign-in wall

**Files:**
- Create: `src/web/guards/HandheldAuthGate.tsx`
- Create: `src/web/guards/HandheldAuthGate.test.tsx`
- Modify: `src/core/routing/AppRoutes.tsx`

**Interfaces:**
- Consumes: `useApp().isAuthenticated`, `useWebClientKind`, `isHandheldClient`
- Produces: `HandheldAuthGate` layout route element

- [ ] **Step 1: Write failing gate tests**

Follow existing `AuthPageEntry.test.tsx` patterns (render with MemoryRouter + stubbed `useApp` / `useWebClientKind`).

Cases:

1. `kind=desktop`, `isAuthenticated=false` → child renders (guest allowed).
2. `kind=phone`, `isAuthenticated=false` → Navigate to `/sign-in?returnTo=%2Flibrary` (encode current path).
3. `kind=tablet`, `isAuthenticated=true` → child renders.
4. `kind=phone`, path `/sign-in` is not wrapped (gate only on product shell).

Stub `useWebClientKind` via a test prop override if that is cleaner than mocking the module:

```tsx
// Allow tests to inject kind without mocking navigator:
export function HandheldAuthGate({
  kind: kindProp,
}: {
  kind?: WebClientKind;
}): React.ReactElement {
  const { isAuthenticated } = useApp();
  const hookKind = useWebClientKind();
  const kind = kindProp ?? hookKind;
  const location = useLocation();
  if (!isAuthenticated && isHandheldClient(kind)) {
    const returnTo = `${location.pathname}${location.search}`;
    return (
      <Navigate
        to={`/sign-in?returnTo=${encodeURIComponent(returnTo)}`}
        replace
      />
    );
  }
  return <Outlet />;
}
```

If injecting `kind` on the production component is undesirable, export the pure decision:

```ts
export function handheldAuthRedirect(
  isAuthenticated: boolean,
  kind: WebClientKind,
  returnTo: string
): string | null {
  if (isAuthenticated || !isHandheldClient(kind)) return null;
  return `/sign-in?returnTo=${encodeURIComponent(returnTo)}`;
}
```

Prefer the **pure function** + a thin component. Put the pure function in `src/web/guards/handheld-auth-redirect.ts` and unit-test that (no RTL required).

- [ ] **Step 2: Pure tests**

```ts
// src/web/guards/handheld-auth-redirect.test.ts
import { describe, expect, it } from 'vitest';

import { handheldAuthRedirect } from './handheld-auth-redirect';

describe('handheldAuthRedirect', () => {
  it('null on desktop guest', () => {
    expect(handheldAuthRedirect(false, 'desktop', '/library')).toBeNull();
  });

  it('redirects unsigned phone', () => {
    expect(handheldAuthRedirect(false, 'phone', '/library?domain=a.com')).toBe(
      '/sign-in?returnTo=%2Flibrary%3Fdomain%3Da.com'
    );
  });

  it('null when signed in on tablet', () => {
    expect(handheldAuthRedirect(true, 'tablet', '/home')).toBeNull();
  });
});
```

- [ ] **Step 3: Run — expect FAIL, then implement `handheld-auth-redirect.ts` and the gate component, then PASS**

- [ ] **Step 4: Wrap product shell in AppRoutes**

Inside the `ExtensionPresenceBoot` tree, nest:

```tsx
<Route element={<ExtensionPresenceBoot />}>
  <Route element={<HandheldAuthGate />}>
    <Route element={<WebAppShell />}>
      {/* existing product routes unchanged */}
    </Route>
  </Route>
</Route>
```

Public `/install`, `/help`, `/`, `/sign-in` stay outside the gate.

- [ ] **Step 5: Type-check and commit**

```bash
git add src/web/guards src/core/routing/AppRoutes.tsx
git commit -m "feat(web): sign-in wall for unsigned phone and tablet"
```

---

### Task 5: Read-only consume on handheld

**Files:**
- Modify: `src/web/pages/LibraryPage.tsx`
- Modify: `src/web/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `useWebClientKind`, `isHandheldClient`
- Produces: `readOnly={caps.isGuest || handheld}` and omit mutation callbacks when handheld

- [ ] **Step 1: LibraryPage**

After `caps` is computed:

```ts
const clientKind = useWebClientKind();
const handheld = isHandheldClient(clientKind);
const consumeOnly = caps.isGuest || handheld;
```

Replace `caps.isGuest` at card mutation props with `consumeOnly`:

- `readOnly={consumeOnly}`
- `onNoteSave={consumeOnly ? undefined : handleNoteSave}`
- `onDelete={consumeOnly ? undefined : handleHighlightDelete}`
- Hide scope delete button (`library-scope-delete`) when `consumeOnly`
- Hide export controls if present when `consumeOnly`

Do not change `useWebLibrary` fetch rules.

- [ ] **Step 2: HomePage**

Same pattern: `consumeOnly = guest || handheld`. Pass `readOnly={consumeOnly}` and drop `onNoteSave` when consumeOnly.

- [ ] **Step 3: Type-check**

Run: `bun run type-check`

Expected: PASS

- [ ] **Step 4: Commit**

```bash
git add src/web/pages/LibraryPage.tsx src/web/pages/HomePage.tsx
git commit -m "feat(web): read-only library on phone and tablet"
```

---

### Task 6: Strip handheld settings

**Files:**
- Modify: `src/web/routing/settingsTab.ts`
- Modify: `src/web/routing/settingsTab.test.ts` (create if missing; otherwise extend)
- Modify: `src/web/pages/WebSettingsPage.tsx`

**Interfaces:**
- Consumes: `SettingsTab`, `isHandheldClient`
- Produces: `export const HANDHELD_SETTINGS_TABS: readonly SettingsTab[] = ['account', 'plan', 'appearance', 'keyboard']`
- `export function parseSettingsTab(search: string, opts?: { handheld?: boolean }): SettingsTab` — if handheld and tab is `ai` or `data`, return `account`

Keep the existing `parseSettingsTab(search: string)` signature working: default `handheld: false`. Add an optional second argument **or** a wrapper `parseSettingsTabForClient(search, kind)` so desktop tests stay green.

Prefer a wrapper to avoid breaking callers:

```ts
export function visibleSettingsTabs(handheld: boolean): readonly SettingsTab[] {
  return handheld
    ? (['account', 'plan', 'appearance', 'keyboard'] as const)
    : VALID_TABS;
}

export function coerceSettingsTab(
  tab: SettingsTab,
  handheld: boolean
): SettingsTab {
  if (!handheld) return tab;
  return tab === 'ai' || tab === 'data' ? 'account' : tab;
}
```

- [ ] **Step 1: Tests for coerce + visible lists**

- [ ] **Step 2: Implement helpers, run tests PASS**

- [ ] **Step 3: WebSettingsPage**

```ts
const clientKind = useWebClientKind();
const handheld = isHandheldClient(clientKind);
const tabs = TABS.filter((t) => visibleSettingsTabs(handheld).includes(t.id));
const tab = coerceSettingsTab(parseSettingsTab(location.search), handheld);
```

If URL is `?tab=ai` on handheld, `useEffect` navigate to `buildSettingsSearch('account')` replace.

Do not render `AiPanel` or `DataPanel` when `handheld`.

- [ ] **Step 4: Type-check and commit**

```bash
git add src/web/routing/settingsTab.ts src/web/pages/WebSettingsPage.tsx src/web/routing/settingsTab.test.ts
git commit -m "feat(web): hide integrations and vault settings on handheld"
```

---

### Task 7: Open source + consume events

**Files:**
- Modify: `src/web/components/WebHighlightCard.tsx`
- Modify: `src/web/components/WebHighlightCard.test.tsx` (extend existing fragment tests)
- Modify: `src/web/pages/LibraryPage.tsx`
- Modify: `src/web/pages/HomePage.tsx`

**Interfaces:**
- Consumes: `buildTextFragmentUrl`, `pageHrefForLibrary`, `trackEvent`, `useWebClientKind`
- Produces: path link href is fragment URL; click tracks `highlight_open_source`

- [ ] **Step 1: Fragment href on the card**

Where `sourceHref` is built today:

```ts
const pageUrl = pageHrefForLibrary(h.domain, h.path);
const sourceHref =
  !isRail && pageUrl
    ? buildTextFragmentUrl(pageUrl, { exact: h.quote })
    : null;
```

On the `<a className="hl-path hl-path-link">` keep `target="_blank"` `rel="noopener noreferrer"`. Add:

```ts
onClick={() => {
  trackEvent('highlight_open_source', { client: /* cannot use hook result inside without passing prop */ });
}}
```

Do **not** call `useWebClientKind` inside the card if that couples chrome to every tile. Pass `clientKind?: WebClientKind` optional prop defaulting to `'desktop'` from parent, or track without client and let `trackEvent` omit it. Spec requires `client`. Pass `clientKind` from LibraryPage/HomePage.

```ts
// WebHighlightCardProps
clientKind?: WebClientKind;
```

```ts
onClick={() => {
  trackEvent('highlight_open_source', { client: clientKind ?? 'desktop' });
}}
```

- [ ] **Step 2: Library open + search events**

In `LibraryPage`:

```ts
useEffect(() => {
  if (!isAuthenticated) return;
  trackEvent('library_open', { client: clientKind });
}, [isAuthenticated, clientKind]);
```

When the committed search query is non-empty, debounce 400ms:

```ts
useEffect(() => {
  const q = search.trim();
  if (!q) return;
  const t = window.setTimeout(() => {
    trackEvent('library_search', {
      client: clientKind,
      result_count: filteredCount,
    });
  }, 400);
  return () => window.clearTimeout(t);
}, [search, filteredCount, clientKind]);
```

Use the actual search state variable name already in the file (do not invent a second query string). Never pass the query text.

- [ ] **Step 3: Extend WebHighlightCard tests**

Existing test expects a fragment URL. Update `pageHrefForLibrary` + `buildTextFragmentUrl` assertion so the path `<a href>` contains `#:~:text=`.

- [ ] **Step 4: Run**

Run: `bunx vitest run src/web/components/WebHighlightCard.test.tsx`

Expected: PASS

- [ ] **Step 5: `bun run type-check` and commit**

```bash
git add src/web/components/WebHighlightCard.tsx src/web/components/WebHighlightCard.test.tsx src/web/pages/LibraryPage.tsx src/web/pages/HomePage.tsx
git commit -m "feat(web): text-fragment open and consume analytics events"
```

---

### Task 8: Verify v0 gate

**Files:** none new

- [ ] **Step 1: Unit suite for this feature**

Run:

```bash
bunx vitest run src/web/lib/classify-web-client.test.ts src/web/lib/is-mobile-web-viewport.test.ts src/shared/analytics/parse-analytics-event.test.ts src/web/lib/analytics.test.ts src/web/guards/handheld-auth-redirect.test.ts src/web/components/WebHighlightCard.test.tsx
```

Expected: PASS

- [ ] **Step 2: Type-check + production web type path**

Run: `bun run type-check`

Expected: PASS

- [ ] **Step 3: Manual checklist (do not skip)**

1. Desktop unsigned: `/library` still guest empty state, not redirected.
2. DevTools iPhone UA, unsigned: `/library` → `/sign-in?returnTo=...`
3. Signed-in, width 390: tabbar; cards have no delete/note editors.
4. Width 800, iPad UA: sidebar, two-pane, still no mutations, no Integrations tab.
5. Click quote path: new tab, URL has `#:~:text=`.
6. Network: POST `/api/analytics` for `library_open` with `client`, no quote.

- [ ] **Step 4: No Flutter commit**

Confirm `git status` has no `apps/mobile`.

---

## Self-review

| Spec item | Task |
| --- | --- |
| 767 / 768 IA | Task 2 |
| Sign-in wall phone+tablet | Task 4 |
| Read-only handheld | Task 5 |
| Settings strip | Task 6 |
| Text fragment new tab | Task 7 |
| Analytics sink + three events | Tasks 3, 7 |
| No Flutter / PWA / capture | Global constraints + Task 8 |
