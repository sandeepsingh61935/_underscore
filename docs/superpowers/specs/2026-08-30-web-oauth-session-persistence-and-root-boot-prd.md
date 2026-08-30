# PRD: Web Google OAuth Session Persistence & Authenticated Root Boot

**Date:** 2026-08-30  
**Status:** Ready for implementation — `ready-for-agent`  
**Priority:** P0 (session trust + first-paint trust on production web)  
**Scope:** Web SPA Supabase auth client, WebAuthProvider restore path, root `/` routing / welcome flash for already-signed-in users  
**Surfaces:** Web app only (`underscore-web` / Vercel). Extension Google OAuth via `chrome.identity` is covered by the background-auth reliability PRD and is out of scope here except for session-bridge side effects.  
**ADRs respected:** cloud-first library and integrations; security architecture (RLS, no service-role in browser); no emoji policy  
**Related:** prior audit of `persistSession` / localStorage; Appearance theme localStorage fix (same class of “web vs chrome.storage” bug)

---

## Problem Statement

From the user’s perspective, two failures undermine trust in the web product:

1. **Session persistence:** After signing in with Google on the web app, closing the browser and returning can feel like a forced re-login. The product is expected to remember the account the way modern Google OAuth web apps do (durable session + silent refresh), not treat every cold start as anonymous.

2. **Root boot flash:** Visiting `https://underscore-web.vercel.app/` while already signed in briefly paints the **Welcome / Get Started** marketing page, then jumps to Home. That flash signals “you’re logged out” even when a valid session exists, and makes the app feel unfinished.

Both share a restore/boot problem: auth state is recovered **asynchronously** after first paint, and the root route always mounts Welcome before session resolution completes. Persistence config is largely correct (`persistSession: true`), but it is not pinned to OAuth best practice (explicit PKCE, stable storage key, clear restore diagnostics), and root routing does not wait on auth boot.

---

## Solution

From the user’s perspective:

* After Google sign-in on the web app, closing and reopening the **same origin** keeps them signed in without another Google prompt (until they sign out, revoke access, or the refresh token is invalidated).
* Hitting `/` while signed in opens **Home** (product shell) with **no Welcome flash** — at most a neutral boot skeleton that never shows Get Started copy for authenticated users.
* Hitting `/` while signed out still shows Welcome.
* Auth loading never looks like “guest empty library” for a tick on product routes when a session is about to restore.
* Extension bridge still receives tokens after web sign-in / refresh, but extension sign-out does not mysteriously wipe a healthy web session unless product policy explicitly links them (documented decision below).

---

## User Stories

1. As a signed-in web user, I want my Google session to survive browser close and reopen on the same site, so that I am not forced through OAuth again.
2. As a signed-in web user, I want access tokens to refresh quietly in the background, so that long-lived tabs keep working.
3. As a signed-in web user, I want visiting `/` to open Home immediately (no Welcome flash), so that the product feels like an app, not a landing page after every cold load.
4. As a signed-out visitor, I want `/` to show Welcome / Get Started, so that marketing and install still work.
5. As a signed-in web user, I want a hard refresh on `/home`, `/library`, or `/settings` to stay on that route without bouncing through Welcome, so that deep links are stable.
6. As a signed-in web user, I want OAuth return from Google (`redirectTo`) to land on the intended product route with a session already established, so that the first paint after redirect is authenticated.
7. As a signed-in web user, I want multi-tab sign-in and sign-out to stay consistent, so that logging out in one tab logs out others.
8. As a signed-in web user, I want Sign out in Settings to clear the durable session completely, so that the next visit is truly guest.
9. As a signed-in web user with the extension installed, I want web sign-in to continue syncing tokens to the extension, so that popup/cloud features stay aligned.
10. As a signed-in web user, I do **not** want a transient extension disconnect or extension local clear to silently destroy my web session without an explicit product rule, so that web stays the source of truth for browser login.
11. As a user on a different origin (preview vs production), I understand sessions are per-origin, so that support docs can explain “wrong URL” re-login.
12. As a user in private browsing or “clear cookies on exit,” I accept that the browser may drop storage, so that we do not over-promise impossible persistence.
13. As a user whose Google refresh token was revoked, I want a clean return to signed-out Welcome or Sign in with a stable error if an action fails, so that failure modes are understandable.
14. As a guest user, I want product routes gated as today (extension presence where required), so that guest install policy is unchanged.
15. As a developer, I want the web Supabase client to use explicit PKCE and a stable storage key, so that OAuth matches current Supabase Google guidance.
16. As a developer, I want auth boot status (`loading` | `authenticated` | `unauthenticated`) to be the single gate for root redirect, so that UI never decides “guest” before `getSession` finishes.
17. As a developer, I want restore failures (corrupt storage, refresh_token_not_found) logged with structured codes and to end in unauthenticated without loops, so that diagnosis is possible.
18. As a developer, I want tests that prove: stored session → `/` never paints Welcome Get Started; no session → Welcome; OAuth client options include PKCE + persist + detectSessionInUrl.
19. As a security-conscious user, I want sessions still bound by RLS and anon key only in the browser, so that persistence does not weaken data isolation.
20. As a security-conscious user, I accept localStorage SPA tokens as the v1 model, with CSP and sanitization remaining the XSS mitigations (httpOnly cookie SSR is a later phase).
21. As a user opening `/sign-in` while already authenticated, I want to be sent to Home (or `returnTo`), so that auth pages do not trap logged-in users.
22. As a user mid OAuth redirect with `?code=` / hash tokens, I want `detectSessionInUrl` to complete before any “you’re a guest” UI, so that the callback does not flash Welcome.
23. As a user with `returnTo` / `intendedMode` query params, I want those preserved through OAuth and applied after session establish, so that deep-link onboarding still works.
24. As a paid user, I want billing snapshot load to not block the authenticated shell paint, so that Home is not gated on Polar.
25. As a support engineer, I want a short runbook: check `sb-*-auth-token` in localStorage, same origin, refresh errors in console, so that “keeps logging out” tickets are triaged quickly.

---

## Implementation Decisions

### A. Ideal Google OAuth persistence (web)

1. **Keep Supabase Auth + Google as the system of record.** Do not invent a parallel cookie jar in v1.

2. **Web Supabase client auth options (explicit):**
   - `persistSession: true` (already)
   - `autoRefreshToken: true` (already)
   - `detectSessionInUrl: true` (already)
   - **`flowType: 'pkce'`** (pin; OAuth best practice for browser SPAs)
   - **Stable `storageKey`** derived from project ref or a fixed product constant so env churn does not orphan sessions unnecessarily
   - Default storage remains **localStorage** (survives browser close). Do not switch to sessionStorage.

3. **WebAuthProvider restore contract:**
   - Status starts as `loading` until the first definitive session resolution (`getSession` / `INITIAL_SESSION`).
   - Only then publish `authenticated` or `unauthenticated`.
   - Surfaces that branch on guest vs account **must** treat `loading` as boot, not guest.
   - On `TOKEN_REFRESHED` / `SIGNED_IN`, continue bridging tokens to the extension.
   - Document and implement **logout coupling policy:** preferred default for this PRD — **web sign-out clears extension; extension-only clear does not force web sign-out** unless the message is an explicit user-initiated global logout. (Today extension `AUTH_SESSION_CLEARED` can call web `signOut`; tighten so accidental extension storage wipes do not kill web sessions.)

4. **OAuth redirect:** Keep `signInWithOAuth({ provider: 'google', options: { redirectTo } })` with allow-listed production/preview origins in Supabase dashboard (ops checklist, not code). Prefer `redirectTo` into product (`/home` or `returnTo`) rather than bare `/` when possible to reduce marketing paint on return.

5. **No “remember me” toggle in v1.** Persistence is always on for successful sign-in; Sign out is the only user off-switch.

6. **Out of band ops:** Confirm Supabase Google provider enabled, redirect URLs include production Vercel origin, JWT/refresh settings sane. Capture in Further Notes runbook.

7. **Security posture unchanged at trust boundary:** anon key only; RLS on user data; no service role in SPA; tokens in localStorage remain XSS-sensitive — rely on CSP + DOMPurify; httpOnly SSR cookies are **explicitly later**.

### B. Authenticated root boot (no Welcome flash)

8. **Root route ownership:** `/` must not mount full Welcome marketing UI until auth status is known **or** must mount a **boot shell** that is neither Welcome nor product chrome.

9. **Preferred behavior matrix:**

   | Auth status | `/` behavior |
   |-------------|--------------|
   | `loading` | Neutral boot (minimal skeleton / blank paper) — **no** Get Started, no guest CTAs |
   | `authenticated` | `replace` navigate to `/home` (or honor safe `returnTo`) **before** Welcome body |
   | `unauthenticated` | Welcome as today |

10. **Implementation shape (highest seam):** Introduce a small **RootEntry** (or enhance Welcome gate) that reads `useWebAuth().status` (or App-level auth loading that mirrors it). Do not rely solely on a `useEffect` navigate after Welcome paint — that is the flash.

11. **Authenticated deep links:** `/sign-in` while authenticated → redirect Home/`returnTo` with replace.

12. **Guest product gate unchanged:** `GuestExtensionGate` still applies to `/home|library|settings`; authenticated users pass through. Boot must not send authenticated users into the guest install wall incorrectly during `loading`.

13. **No full-page reload hacks** (`window.location`) for routine restore.

### C. Modules / seams (no brittle file locks)

| Seam | Role |
|------|------|
| Web Supabase client factory | Auth option source of truth (PKCE, persist, storageKey) |
| WebAuthProvider | Session restore, status enum, extension bridge policy |
| Root entry / App routes | `/` boot matrix; optional `/sign-in` auth redirect |
| WelcomePage | Marketing only when unauthenticated; must not own primary auth race |
| Session bridge | Web → extension token push; clarify clear directionality |
| Tests | Client options unit; RootEntry/Welcome behavior with mocked auth status |

---

## Testing Decisions

**Good tests** assert user-visible boot and session behavior, not private Supabase internals.

1. **Web client options seam:** Creating the web client applies `persistSession`, `autoRefreshToken`, `detectSessionInUrl`, `flowType: 'pkce'`, and a stable storage key (mock `createClient` spy).

2. **WebAuthProvider status seam:** With injected session → status becomes `authenticated`; with null session → `unauthenticated`; never leaves `loading` forever; initial status is `loading` before resolution.

3. **Root boot seam (highest UI seam):**
   - `status=loading` + `/` → no Get Started / welcome primary CTA text
   - `status=authenticated` + `/` → ends on `/home` (MemoryRouter) without Welcome marketing markers
   - `status=unauthenticated` + `/` → Welcome visible

4. **Sign-in redirect:** authenticated user on `/sign-in` → redirected away from sign-in form.

5. **Prior art:** `WebAuthProvider` / `SignInView` tests; `WelcomePage.test.tsx`; `GuestExtensionGate.test.tsx`; `app-theme-storage.test.ts` (pattern for storage round-trip). Prefer extending these over new E2E unless Playwright already covers auth.

6. **Do not** require live Google in CI. Mock Supabase auth APIs.

---

## Out of Scope

* Extension `chrome.identity` Google PKCE reliability (separate PRD).
* Full Supabase SSR / httpOnly cookie auth migration.
* Guest ↔ account library merge.
* Changing RLS policies or JWT expiry in Supabase beyond documenting required dashboard settings.
* Magic-link / phone auth redesign.
* Forcing single global logout across web + extension in both directions (only clarify web→extension clear; optional product follow-up for true global logout).
* Theme persistence (already fixed via localStorage).
* Marketing redesign of Welcome beyond boot gating.

---

## Further Notes

### Why flash happens today

* `WebAuthProvider` resolves session async; `isAuthenticated` is false during `loading`.
* `/` always renders `WelcomePage`.
* Welcome only `navigate('/home')` in `useEffect` after `isAuthenticated` flips true → one frame (or more) of Get Started.

### Persistence reality check

* Code already sets `persistSession: true` (localStorage). Re-login-after-close is **not** intended.
* If production still drops sessions, triage: origin mismatch, storage cleared, refresh token invalid, or restore race mis-read as guest — this PRD hardens the last class and pins PKCE.

### Ops checklist (Supabase dashboard)

* Google provider enabled.
* Redirect URLs include `https://underscore-web.vercel.app/**` and local dev origins used by the team.
* Site URL matches primary production origin.

### Source of truth

* This file: `docs/superpowers/specs/2026-08-30-web-oauth-session-persistence-and-root-boot-prd.md`
* Tracker issue: publish with label `ready-for-agent`

---

## Seams summary (for implementer)

1. Web Supabase auth client options  
2. WebAuthProvider loading/authenticated/unauthenticated + bridge logout policy  
3. Root entry boot matrix on `/`  
4. Optional authenticated `/sign-in` redirect  
5. Unit/integration tests at those seams  

No new backend tables. No Workers auth change required for v1.
