# Web App Open Design Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Port the Open Design web app prototype into the Vite web SPA with full visual and interaction parity: shell chrome, product routes Home/Library/Ask/Settings, Polar billing UX, guest-accessible shell with capability gates, and a Supabase-backed web library data layer.

**Architecture:** Shell-first vertical slices under `src/web/`. Nested product layout (`WebAppShell`) owns sidebar/topbar/mobile tabbar. Product routes are guest-allowed; capabilities gate via pure `resolveWebCaps`. Library data is a chrome-free Supabase hook (never extension IPC). Public Welcome/auth/legal stay outside the shell. Legacy URLs redirect into the new IA.

**Tech Stack:** React 19, React Router DOM, TypeScript strict, Vitest + Testing Library, CSS custom properties (V2 Editorial), Supabase JS client, existing `BillingProvider` web port.

**Spec:** `docs/superpowers/specs/2026-08-05-web-app-od-parity-prd.md`

**OD source of truth (local path):**  
`/home/sandy/projects/open-design/.od/projects/77039981-726c-431d-8a7a-ae9f169bba0c/underscore-web-app-prototype.html`  
(also available via Open Design MCP project "Web Prototype", entry `underscore-web-app-prototype.html`)

**Work directory:** Prefer the feature worktree at  
`/home/sandy/projects/_underscore/.worktrees/web-app-od-parity`  
on branch `feature/web-app-od-parity`.

## Global Constraints

- Editorial tokens only: no Tailwind utility classes; no hardcoded hex in component TSX; no MD3 (`--md-sys-color-*`); no Ink & Glass (`--ink-1..4`); no Style C aliases (`var(--bg)`, `var(--text-primary)`).
- Fonts via tokens: `var(--serif)`, `var(--sans)`, `var(--mono)` — never declare Inter/Roboto in components.
- Borders: `var(--rule)` / `var(--rule-soft)`; type sizes: `var(--step-*)` or OD type roles already mirrored in CSS.
- Product shell routes: `/home`, `/library`, `/ask`, `/settings` — guest and signed-in both allowed; gate by caps, not by hard login wall on product routes.
- Public routes stay outside shell: `/`, `/sign-in`, auth recovery, privacy, terms, OAuth consent.
- Legacy redirects: `/collections` → `/library`; `/mode` → `/home`; `/domain/:domain` → `/library?domain=`; `/domain/:domain/section/:section` → `/library?domain=&section=`.
- Settings tabs via query: `tab=account|plan|appearance|ai|data`.
- Library selection via query: `domain`, `section` (no separate domain pages).
- Caps matrix: Guest browse-only empty library; Free sync+export; Paid active Ask/AI/MCP; past_due locks AI → Polar portal. Never invent a third commercial tier.
- Never demote paid on billing load failure or error (existing billing rules).
- Plan pill is read-only (no cycle-mode design control). Do not ship force-billing, design-inspection, or prototype data-state toggles.
- Product language: Guest / Free / Account (Paid) — prefer over "Pro" in new web strings.
- No `chrome.runtime` / MessageBus on product web paths. Extension popup build must remain intact.
- Preserve `data-od-id` on key chrome and CTAs where practical.
- Conventional commits: `type(scope): subject`; no emoji in commits.
- Tests: Vitest; assert external behavior at approved seams (caps, billing pure fns, useWebLibrary mock, routes, shell, Ask lock, no chrome on web).
- TDD for pure helpers and data aggregation; UI pages may follow tests for routing/lock behavior.

## File map (create unless noted)

| Path | Responsibility |
|------|----------------|
| `src/web/caps/resolveWebCaps.ts` | Pure caps projection |
| `src/web/caps/resolveWebCaps.test.ts` | Caps matrix tests |
| `src/web/routing/legacyRedirects.ts` | Pure legacy path → target |
| `src/web/routing/librarySelection.ts` | URL domain/section helpers |
| `src/web/routing/settingsTab.ts` | Settings tab query helpers |
| `src/web/routing/*.test.ts` | Routing pure tests |
| `src/web/theme/web-app.css` | OD shell/page CSS (tokenized) |
| `src/web/layout/WebAppShell.tsx` | Sidebar, topbar, tabbar, outlet |
| `src/web/layout/WebAppShell.test.tsx` | Active nav, collapse, mobile tab |
| `src/web/components/GuestBanner.tsx` | Guest banner |
| `src/web/components/PlanPill.tsx` | Read-only plan pill |
| `src/web/hooks/useWebLibrary.ts` | Supabase library aggregation |
| `src/web/hooks/useWebLibrary.test.ts` | Mocked aggregation tests |
| `src/web/hooks/useWebPrefs.ts` | Theme/density/type local prefs |
| `src/web/pages/HomePage.tsx` | Home dashboard |
| `src/web/pages/LibraryPage.tsx` | Library rail + list |
| `src/web/pages/AskPage.tsx` | Ask lock + paid composer |
| `src/web/pages/WebSettingsPage.tsx` | Tabbed settings OD surface |
| `src/core/routing/AppRoutes.tsx` | **Modify** — nest shell, product routes, redirects |
| `src/main-web.tsx` | **Modify** — import `web-app.css` |
| `src/pages/WelcomePage.tsx` | **Modify** — signed-in → `/home` if needed |

---

### Task 1: Caps helper + routing pure modules

**Files:**
- Create: `src/web/caps/resolveWebCaps.ts`
- Create: `src/web/caps/resolveWebCaps.test.ts`
- Create: `src/web/routing/legacyRedirects.ts`
- Create: `src/web/routing/legacyRedirects.test.ts`
- Create: `src/web/routing/librarySelection.ts`
- Create: `src/web/routing/librarySelection.test.ts`
- Create: `src/web/routing/settingsTab.ts`
- Create: `src/web/routing/settingsTab.test.ts`

**Interfaces:**
- Consumes: nothing from later tasks; may import `BillingStatus` from `@/shared/billing` if useful for past_due typing
- Produces:
  - `export type WebCapFlags = { sync: boolean; export: boolean; ai: boolean; mcp: boolean }`
  - `export type WebPlanLabel = 'Guest' | 'Free' | 'Paid' | 'Past due'`
  - `export type WebCaps = { flags: WebCapFlags; planLabel: WebPlanLabel; isGuest: boolean; isPastDue: boolean; isPaidActive: boolean }`
  - `export function resolveWebCaps(input: { isAuthenticated: boolean; isPaidActive: boolean; billingStatus?: string | null }): WebCaps`
  - `export function resolveLegacyRedirect(pathname: string, params?: { domain?: string; section?: string }): string | null`
  - `export function parseLibrarySelection(search: string): { domain: string | null; section: string | null }`
  - `export function buildLibrarySearch(sel: { domain?: string | null; section?: string | null }): string`
  - `export type SettingsTab = 'account' | 'plan' | 'appearance' | 'ai' | 'data'`
  - `export function parseSettingsTab(search: string): SettingsTab`
  - `export function buildSettingsSearch(tab: SettingsTab): string`

- [ ] **Step 1: Write failing caps tests**

```ts
// src/web/caps/resolveWebCaps.test.ts
import { describe, it, expect } from 'vitest';
import { resolveWebCaps } from './resolveWebCaps';

describe('resolveWebCaps', () => {
  it('guest: browse only', () => {
    const c = resolveWebCaps({ isAuthenticated: false, isPaidActive: false });
    expect(c.isGuest).toBe(true);
    expect(c.planLabel).toBe('Guest');
    expect(c.flags).toEqual({ sync: false, export: false, ai: false, mcp: false });
  });

  it('free signed-in: sync+export, no ai', () => {
    const c = resolveWebCaps({ isAuthenticated: true, isPaidActive: false, billingStatus: 'none' });
    expect(c.isGuest).toBe(false);
    expect(c.planLabel).toBe('Free');
    expect(c.flags).toEqual({ sync: true, export: true, ai: false, mcp: false });
  });

  it('paid active: all caps on', () => {
    const c = resolveWebCaps({ isAuthenticated: true, isPaidActive: true, billingStatus: 'active' });
    expect(c.planLabel).toBe('Paid');
    expect(c.flags.ai).toBe(true);
    expect(c.flags.mcp).toBe(true);
  });

  it('past due: AI locked, still Free/Past due label', () => {
    const c = resolveWebCaps({
      isAuthenticated: true,
      isPaidActive: false,
      billingStatus: 'past_due',
    });
    expect(c.isPastDue).toBe(true);
    expect(c.planLabel).toBe('Past due');
    expect(c.flags.ai).toBe(false);
    expect(c.flags.sync).toBe(true);
    expect(c.flags.export).toBe(true);
  });

  it('does not grant ai when unauthenticated even if isPaidActive true', () => {
    const c = resolveWebCaps({ isAuthenticated: false, isPaidActive: true });
    expect(c.flags.ai).toBe(false);
    expect(c.isGuest).toBe(true);
  });
});
```

- [ ] **Step 2: Run caps tests — expect FAIL**

Run: `npx vitest run src/web/caps/resolveWebCaps.test.ts`
Expected: FAIL (module not found)

- [ ] **Step 3: Implement resolveWebCaps**

```ts
// src/web/caps/resolveWebCaps.ts
export type WebCapFlags = {
  sync: boolean;
  export: boolean;
  ai: boolean;
  mcp: boolean;
};

export type WebPlanLabel = 'Guest' | 'Free' | 'Paid' | 'Past due';

export type WebCaps = {
  flags: WebCapFlags;
  planLabel: WebPlanLabel;
  isGuest: boolean;
  isPastDue: boolean;
  isPaidActive: boolean;
};

export function resolveWebCaps(input: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  billingStatus?: string | null;
}): WebCaps {
  const isGuest = !input.isAuthenticated;
  const isPastDue = !isGuest && input.billingStatus === 'past_due';
  const isPaidActive = !isGuest && input.isPaidActive;

  if (isGuest) {
    return {
      isGuest: true,
      isPastDue: false,
      isPaidActive: false,
      planLabel: 'Guest',
      flags: { sync: false, export: false, ai: false, mcp: false },
    };
  }

  if (isPastDue) {
    return {
      isGuest: false,
      isPastDue: true,
      isPaidActive: false,
      planLabel: 'Past due',
      flags: { sync: true, export: true, ai: false, mcp: false },
    };
  }

  if (isPaidActive) {
    return {
      isGuest: false,
      isPastDue: false,
      isPaidActive: true,
      planLabel: 'Paid',
      flags: { sync: true, export: true, ai: true, mcp: true },
    };
  }

  return {
    isGuest: false,
    isPastDue: false,
    isPaidActive: false,
    planLabel: 'Free',
    flags: { sync: true, export: true, ai: false, mcp: false },
  };
}
```

- [ ] **Step 4: Write routing tests + implement helpers**

`legacyRedirects.ts` mapping (pathname only; params for domain routes):

| pathname pattern | result |
|------------------|--------|
| `/collections` | `/library` |
| `/mode` | `/home` |
| `/domain/:domain` | `/library?domain=<encodeURIComponent(domain)>` |
| `/domain/:domain/section/:section` | `/library?domain=…&section=…` |
| other | `null` |

`librarySelection.ts`:
- `parseLibrarySelection('?domain=a.com&section=%2Fdocs')` → `{ domain: 'a.com', section: '/docs' }`
- empty → `{ domain: null, section: null }`
- `buildLibrarySearch({ domain: 'a.com', section: null })` → `?domain=a.com` (or `domain=a.com` without leading `?` — pick one and stay consistent; prefer **without** leading `?` for use with `navigate({ search })`, so return `domain=a.com` or empty string)

`settingsTab.ts`:
- valid tabs: `account | plan | appearance | ai | data`
- default `account`
- invalid → `account`
- `buildSettingsSearch('plan')` → `tab=plan`

Include at least 3 tests per module.

- [ ] **Step 5: Run all Task 1 tests — expect PASS**

Run: `npx vitest run src/web/caps src/web/routing`

- [ ] **Step 6: Commit**

```bash
git add src/web/caps src/web/routing
git commit -m "feat(web): add caps and routing pure helpers for OD parity"
```

---

### Task 2: Foundation — web-app CSS, WebAppShell, product routes

**Files:**
- Create: `src/web/theme/web-app.css`
- Create: `src/web/layout/WebAppShell.tsx`
- Create: `src/web/layout/WebAppShell.test.tsx`
- Create: `src/web/components/PlanPill.tsx`
- Create: `src/web/components/GuestBanner.tsx`
- Create: `src/web/pages/HomePage.tsx` (minimal placeholder OK: title "Home")
- Create: `src/web/pages/LibraryPage.tsx` (minimal placeholder)
- Create: `src/web/pages/AskPage.tsx` (minimal placeholder)
- Create: `src/web/pages/WebSettingsPage.tsx` (minimal placeholder)
- Modify: `src/main-web.tsx` — import `./web/theme/web-app.css`
- Modify: `src/core/routing/AppRoutes.tsx` — product nested routes under shell; legacy redirects; **do not** wrap product routes in `ProtectedRoute`
- Optional modify: `src/pages/WelcomePage.tsx` — if authenticated, navigate to `/home`

**Interfaces:**
- Consumes: `resolveWebCaps`, `resolveLegacyRedirect`, React Router `Outlet`/`NavLink`/`useNavigate`/`useLocation`
- Produces: `WebAppShell` rendering sidebar (248→72 collapse), topbar (route label + hint + PlanPill + primary CTA), mobile tabbar, guest-aware user foot; product routes registered

**OD references (port structure + CSS, not prototype-only controls):**
- Shell HTML ~lines 1759–1830 (`data-od-id="app-shell"`, `sidebar`, `primary-nav`, `topbar`, `mobile-tabbar`, `workspace`)
- CSS vars: `--side: 248px` / collapsed `72px`, `--top: 56px`, motion tokens `--dur-*`, `--rise`
- `.app` grid, `.sidebar-collapsed`, `@media (max-width: 820px)` tabbar
- `renderChrome` CTA rules: guest → Sign in; free → Upgrade (settings?tab=plan); paid → hide primary CTA
- Route hints: home "Current page · Active pages · Recent"; library "Search & filter highlights"; ask "Grounded on your library"; settings "Account · plan · type · data"
- **Omit:** `data-action="cycle-mode"`, force-billing segments, design-inspection

**Auth + billing wiring in shell:**
- Read `isAuthenticated` / user email from existing `useApp` or `WebAuthProvider` hooks already used in web (inspect `AppProvider`, auth context in codebase).
- Prefer wrapping product tree with `BillingProvider` `web={{ supabase, getAccessToken }}` when a Supabase client is available on web; if web Supabase client helper already exists, reuse it. If not available yet, shell may show Free/Guest from auth only and leave full billing to Task 6 — but **must not** break when BillingProvider is added later.
- Plan pill labels from `resolveWebCaps(...).planLabel`.

**Routing shape (illustrative):**

```tsx
// Product shell layout route
<Route element={<WebAppShell />}>
  <Route path="/home" element={<HomePage />} />
  <Route path="/library" element={<LibraryPage />} />
  <Route path="/ask" element={<AskPage />} />
  <Route path="/settings" element={<WebSettingsPage />} />
</Route>
// Legacy
<Route path="/collections" element={<Navigate to="/library" replace />} />
<Route path="/mode" element={<Navigate to="/home" replace />} />
<Route path="/domain/:domain" element={<LegacyDomainRedirect />} />
<Route path="/domain/:domain/section/:section" element={<LegacyDomainRedirect />} />
// Remove or stop using ProtectedRoute on collections/domain for product; public auth routes unchanged
```

`LegacyDomainRedirect` uses `useParams` + `resolveLegacyRedirect` + `<Navigate>`.

- [ ] **Step 1: Write WebAppShell test (active nav + collapse)**

Use Testing Library + MemoryRouter. Mock auth if needed so guest shell renders. Assert:
- `data-od-id="nav-home"` has active class when location is `/home`
- Collapse control toggles `sidebar-collapsed` class on `data-od-id="app-shell"`
- Top CTA shows "Sign in" for guest

- [ ] **Step 2: Run test — expect FAIL**

- [ ] **Step 3: Port CSS + implement shell + wire routes**

Copy OD shell CSS into `web-app.css` (map any OD-only aliases like `--border` to Editorial `--rule-soft` if already present in `global.css`; prefer reusing existing tokens from `global.css` rather than redefining conflicting hex in TSX). Component styles live in CSS file, not inline hex in TSX.

Placeholder pages must export named components and render a single heading with the page name so shell navigation is demonstrable.

- [ ] **Step 4: Run shell tests + type-check path**

Run: `npx vitest run src/web/layout`
Run: `npx tsc --noEmit` (or project `npm run type-check`) — fix type errors introduced.

- [ ] **Step 5: Commit**

```bash
git add src/web src/core/routing/AppRoutes.tsx src/main-web.tsx src/pages/WelcomePage.tsx
git commit -m "feat(web): add WebAppShell, product routes, and OD shell CSS"
```

---

### Task 3: useWebLibrary data layer

**Files:**
- Create: `src/web/hooks/useWebLibrary.ts`
- Create: `src/web/hooks/useWebLibrary.test.ts`
- Create: `src/web/lib/aggregateLibrary.ts` (pure aggregation — easier to test)
- Create: `src/web/lib/aggregateLibrary.test.ts`

**Interfaces:**
- Consumes: Supabase client (injectable), auth session presence
- Produces:

```ts
export type WebHighlight = {
  id: string;
  domain: string;
  path: string;
  quote: string;
  note: string;
  tags: string[];
  savedAt: number; // ms
};

export type WebDomainNode = {
  domain: string;
  count: number;
  lastActive: number;
  sections: { path: string; count: number }[];
};

export type WebLibraryStats = {
  highlightCount: number;
  pageCount: number;
  thisWeekCount: number;
  planLabel: string;
};

export type WebCurrentPage = {
  domain: string;
  path: string;
  sectionLabel: string;
  highlightCount: number;
} | null;

export type WebLibraryState = {
  status: 'idle' | 'loading' | 'ready' | 'error';
  isGuest: boolean;
  highlights: WebHighlight[];
  domains: WebDomainNode[];
  stats: WebLibraryStats;
  recent: WebHighlight[]; // max 6
  currentPage: WebCurrentPage; // most recently active page, not live browser tab
  error: string | null;
  refresh: () => Promise<void>;
};

export function aggregateLibrary(
  rows: WebHighlight[],
  opts?: { now?: number; recentCap?: number }
): Pick<WebLibraryState, 'domains' | 'stats' | 'recent' | 'currentPage'> & {
  highlightCount: number;
};

export function useWebLibrary(opts: {
  isAuthenticated: boolean;
  planLabel: string;
  /** Inject for tests; production may create from env */
  fetchHighlights?: () => Promise<WebHighlight[]>;
}): WebLibraryState;
```

**Rules:**
- Guest: `status: 'ready'`, empty arrays, zero stats, `currentPage: null`, **no demo/seed data**
- Signed-in: fetch via injected `fetchHighlights` or Supabase query against highlights table (inspect existing `supabase-highlight-row` / repository row shapes and map into `WebHighlight`)
- `thisWeekCount`: savedAt within last 7 days of `now`
- `currentPage`: domain+path with most recent `savedAt` among highlights
- `pageCount`: count of unique domain+path pairs
- Never import `chrome` or MessageBus

- [ ] **Step 1: TDD aggregateLibrary tests** (empty, multi-domain, recent cap 6, this-week boundary, currentPage derivation)

- [ ] **Step 2: Implement aggregate + useWebLibrary with mockable fetch**

- [ ] **Step 3: Guest path unit test** — authenticated false never calls fetch

- [ ] **Step 4: Commit**

```bash
git add src/web/hooks src/web/lib
git commit -m "feat(web): add useWebLibrary aggregation over Supabase"
```

---

### Task 4: Home page (OD parity)

**Files:**
- Modify: `src/web/pages/HomePage.tsx`
- Create: `src/web/pages/HomePage.test.tsx` (guest empty + title kicker)
- Optional: `src/web/components/home/*` if file grows large

**Interfaces:**
- Consumes: `useWebLibrary`, `resolveWebCaps`, auth, billing snapshot if available
- Produces: Home matching OD `viewHome` / `data-od-id="home"`

**OD behavior to implement (lines ~2859–3000 region):**
- Greeting via time of day; include name/email local-part when signed in
- Guest title "Your local library", kicker "Local only" (`data-od-id="home-kicker"`)
- Guest banner when guest
- Stats: Highlights, Pages, This week, Plan (`data-od-id="home-stats"`)
- Current page pack (`home-current-page`) when data; navigate to library with domain/section
- "Ask this page" only when `caps.ai` and current page has highlights
- Active pages list → library filtered by domain
- Recent highlights max 6; "View all" → `/library`
- Primary head CTA: Paid+data → Ask library; signed-in+data → Library; else contextual
- Empty guest: true empty, no SEED

- [ ] **Step 1: Guest Home test** — kicker + empty, no fake quotes

- [ ] **Step 2: Implement Home**

- [ ] **Step 3: Commit**

```bash
git add src/web/pages/HomePage.tsx src/web/pages/HomePage.test.tsx src/web/components
git commit -m "feat(web): implement Home page OD parity"
```

---

### Task 5: Library page (OD parity)

**Files:**
- Modify: `src/web/pages/LibraryPage.tsx`
- Create: `src/web/pages/LibraryPage.test.tsx`
- Optional components: domain tree rail, search bar, highlight list

**Interfaces:**
- Consumes: `useWebLibrary`, `parseLibrarySelection` / `buildLibrarySearch`, caps for Export
- Produces: flush workspace library UI with domain/section rail + main list; URL sync

**OD behavior:**
- Rail: All + domains with expandable sections; selection updates `?domain=&section=`
- Search + refine filters + tags (client-side on fetched set for v1)
- Export button only when `caps.export`
- Paid + domain selected: Ask affordance → `/ask` with scope if easy, else settings/ask route
- Guest empty: true empty state (`LibraryEmptyGuest` pattern or OD empty copy)
- Workspace flush class: shell should set flush for library (from Task 2; ensure HomePage doesn't force flush)

- [ ] **Step 1: Test URL selection sync** (parse/build already tested; page-level: selecting All clears params)

- [ ] **Step 2: Implement Library**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): implement Library page with domain rail and URL sync"
```

---

### Task 6: Settings + Billing (OD parity)

**Files:**
- Modify: `src/web/pages/WebSettingsPage.tsx`
- Create: `src/web/pages/WebSettingsPage.test.tsx`
- Create: `src/web/components/settings/*` as needed (Account, Plan, Appearance, AI, Data panels)
- Modify: `src/core/routing/AppRoutes.tsx` if BillingProvider not yet on web tree — wrap product shell with `BillingProvider` web config
- Reuse: `resolveSettingsBillingCta` from `@/shared/utils/settings-billing-cta`
- Extend tests: `src/shared/utils/settings-billing-cta.test.ts` only if new cases needed

**Interfaces:**
- Consumes: billing context (`useBilling` / context from BillingProvider), caps, `parseSettingsTab`
- Produces: tabbed Settings with deep link `?tab=`; Polar checkout/portal only

**OD / PRD billing rules:**
- Tabs: account | plan | appearance | ai | data
- Guest Account: Sign in CTAs; no fake upgrade enabled without auth
- Free: Upgrade via Polar checkout (`startCheckout`)
- Paid: Manage via portal (`openPortal`)
- Return banners: pending activation, active after return, cancel, cancel-scheduled — use existing BillingProvider return handling if present; surface banners with `data-od-id` from OD (`billing-return-pending`, etc.)
- Appearance: Light/Dark/System; density compact/comfortable/roomy; typography entry (reuse `TypographySettings` / `useTypePreset` patterns if web-safe; persist via `localStorage` key `underscore.web.prefs`)
- AI & MCP: locked when `!caps.ai` with Upgrade; paid shows provider status stubs if no real web config API
- Data: sync/export when entitled; delete library confirm modal (wire only if web-safe API exists; else disabled + honest message)
- Never demote paid on load error
- No force-billing UI

- [ ] **Step 1: Test settings tab deep link** — `?tab=plan` shows plan panel

- [ ] **Step 2: Implement WebSettingsPage + billing CTAs**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): implement Settings tabs and Polar billing UX"
```

---

### Task 7: Ask page (lock + paid shell)

**Files:**
- Modify: `src/web/pages/AskPage.tsx`
- Create: `src/web/pages/AskPage.test.tsx`

**Interfaces:**
- Consumes: `resolveWebCaps` / caps.ai, library domains for grounding tree
- Produces: lock panel when `!caps.ai`; full Ask UI when paid

**OD / PRD rules:**
- Guest lock: Account (Paid) copy; Sign in + See plan CTAs
- Free lock: Upgrade (checkout) + Plan details → settings?tab=plan
- Past due: lock → portal fix billing
- Paid: grounding tree (library / domain / section) + chat composer
- Streaming: best-effort only if a chrome-free stream path exists in codebase; otherwise composer submit shows **honest error** (no fabricated model text)
- Never call `chrome.runtime` from this page

- [ ] **Step 1: Tests** — guest lock CTAs; free lock; paid renders composer (mock caps)

- [ ] **Step 2: Implement Ask**

- [ ] **Step 3: Commit**

```bash
git commit -m "feat(web): implement Ask lock panel and paid composer shell"
```

---

### Task 8: Polish, guards, acceptance hardening

**Files:**
- Modify any shell/page gaps from side-by-side OD check
- Create: `src/web/guards/noChromeRuntime.test.ts` (or eslint-friendly unit that greps product modules — prefer importing web product entry modules and asserting no accidental chrome mock usage; simpler: static test that `src/web/**/*` files do not contain `chrome.runtime`)
- Modify: motion — respect `prefers-reduced-motion` in CSS (OD already has rules; ensure ported)
- Sign-out stays in shell as guest (wire sign-out handler if missing)
- Signed-in Welcome → `/home`
- Run: `npm run type-check`, focused web tests, and `npm run build` (extension) smoke if time permits

- [ ] **Step 1: Platform guard test** — fail if `chrome.runtime` string appears under `src/web/`

- [ ] **Step 2: Fix remaining OD gaps** (topbar hints, flush library/ask, guest banner, data-od-ids)

- [ ] **Step 3: Full verification**

```bash
npx vitest run src/web src/shared/utils/settings-billing-cta.test.ts
npm run type-check
npm run build:web
```

- [ ] **Step 4: Commit**

```bash
git commit -m "feat(web): polish OD parity shell and platform guards"
```

---

## Self-review (plan vs PRD)

| PRD area | Task |
|----------|------|
| Caps matrix | 1 |
| Legacy redirects + query IA | 1–2 |
| Shell chrome collapse/mobile | 2 |
| Home dashboard | 4 |
| Library rail/search | 5 |
| Settings tabs + Polar | 6 |
| Ask lock/stream best-effort | 7 |
| Guest empty, no seed | 3–5 |
| No prototype controls | 2, 6 |
| Extension non-regression | 8 (build) |
| Editorial tokens | Global + 2 |
| Platform no chrome | 7–8 |

## Execution notes for SDD controller

- Implementers work only in the feature worktree path unless told otherwise.
- Never dispatch parallel implementers (file conflicts on AppRoutes / shell).
- Parallel agents may only be used for independent review or investigation, not concurrent implementation.
- After each task: review-package + task reviewer before next task.
- OD HTML is large (~4600 lines); implementers should `grep`/`sed` targeted regions rather than loading the whole file into context.
