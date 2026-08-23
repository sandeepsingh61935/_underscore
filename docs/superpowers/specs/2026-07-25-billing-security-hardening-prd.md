# PRD: Billing & Cloudflare security hardening

**Date:** 2026-07-25  
**Status:** Ready for implementation (ordered work packages)  
**Branch base:** `feature/polar-billing` (or `dev` after merge)  
**Source:** Security review of Polar billing + extension + Cloudflare Pages  
**Do not take real money until:** WP-P0 complete  

---

## Problem statement

Account (Paid) billing ships with a correct *trust skeleton* (JWT checkout, signed Polar webhooks, RLS read-only entitlements, derived `pro_xai`). A security review found **gaps that break production readiness**:

1. Checkout accepts arbitrary `successUrl` / return URLs (open redirect after pay).  
2. Edge functions reflect any CORS `Origin`.  
3. Extension `host_permissions` and `externally_connectable` are broader than this app needs.  
4. Webhooks do not verify Polar product id or that `user_id` exists.  
5. Checkout/portal lack rate limits.  
6. Cloudflare Pages serves the web app without baseline security headers / CSP.  
7. Checkout URL host is not validated before `tabs.create` / `window.open`.  
8. Dev override and always-development WXT mode can leak into production builds.

These must be fixed **one work package at a time**, in priority order, without rewriting billing architecture.

---

## Solution

Ship a **sequenced security program**: P0 blocks paid go-live; P1 hardens trust boundaries; P2 is hygiene/CI. Each work package is independently implementable, testable, and mergeable.

**Product experience for honest users must not change:** signed-in Free can still Upgrade; Paid still manages billing via Polar portal; entitlement still drives Account (Paid).

---

## Goals

| ID | Goal | Measure |
|----|------|---------|
| G1 | No open redirect after Polar payment | Only allowlisted HTTPS origins accepted as success/return URLs |
| G2 | Edge billing APIs only callable from trusted web/extension origins | CORS allowlist; unlisted Origin rejected |
| G3 | Extension only talks to our Supabase project and our web origins | Pinned hosts; narrowed `externally_connectable` |
| G4 | Webhook can only grant Paid for our product and real users | Product id allowlist + user existence check |
| G5 | Checkout abuse is rate-limited | Per-user cap with clear 429 |
| G6 | Web app ships baseline browser security headers | Pages `_headers` present and effective |
| G7 | Extension never opens non-Polar checkout hosts | Host allowlist before navigation |
| G8 | Dev-only paid override cannot ship in production | CI / build guard |

---

## Non-goals

- Changing Polar as MoR or pricing model  
- Building custom card forms or invoice UI  
- Moving billing edge off Supabase onto Cloudflare Workers (optional later)  
- Full org Cloudflare WAF / Zero Trust rollout beyond what this PRD specifies  
- Apple IAP / Google Play rails  
- Rewriting mode/entitlement architecture (already landed on `feature/polar-billing`)

---

## Domain vocabulary

| Term | Meaning |
|------|---------|
| Account (Paid) | Mode `pro_xai`; SKU `pro-10x` |
| Entitlement | Row in `billing_entitlements`; server truth for Paid |
| Edge billing | Supabase functions: `billing-checkout`, `billing-portal`, `polar-webhook` |
| App origin | Canonical web host for redirects (`VITE_APP_ORIGIN`) |
| External connect | Chrome `externally_connectable` origins that may message the extension |

---

## Work package index (take one by one)

| WP | Priority | Title | Blocks paid go-live? | Est. |
|----|----------|-------|----------------------|------|
| **WP-1** | P0 | Allowlist Polar success / return URLs | **Yes** | S |
| **WP-2** | P0 | CORS allowlist for billing edge | **Yes** | S |
| **WP-3** | P0 | Narrow extension host + externally_connectable | **Yes** | S |
| **WP-4** | P1 | Webhook product id + user existence | Strongly recommended | M |
| **WP-5** | P1 | Rate-limit checkout & portal | Strongly recommended | M |
| **WP-6** | P1 | Cloudflare Pages security headers | Recommended | S–M |
| **WP-7** | P2 | Validate Polar checkout URL host | Recommended | S |
| **WP-8** | P2 | Production build guards (dev override + WXT mode) | Recommended | S |

Suggested merge order: **WP-1 → WP-2 → WP-3 → WP-4 → WP-5 → WP-6 → WP-7 → WP-8**.  
WP-1/2/3 may land as one PR if preferred, but specs below stay separable for agent/PR tracking.

---

# WP-1 — Allowlist Polar success / return URLs (P0)

## Problem

`billing-checkout` forwards client-provided `successUrl` and `cancelUrl` / `return_url` to Polar with no validation. After payment, Polar redirects the browser to that URL → open redirect / phishing after a real charge.

## User stories

1. As a paying customer, I want to land only on underscore’s app after checkout, so that I am not redirected to a malicious site.  
2. As a developer, I want staging Pages URLs to work for checkout returns, so that QA does not need production domain.  
3. As an attacker with a stolen session token, I cannot cause Polar to redirect victims to my domain after payment.  
4. As an operator, I want invalid success URLs rejected with 400, so that misconfiguration fails closed.

## Functional requirements

### FR-1.1 Allowlist definition

Server-side config (env), not client:

| Env | Purpose | Example |
|-----|---------|---------|
| `BILLING_ALLOWED_ORIGINS` | Comma-separated exact origins | `https://underscore-web.pages.dev,https://app.example.com,http://localhost:3000` |

Rules:

- Parse as list of **origins** (scheme + host + optional port).  
- Paths may be any path **under** an allowed origin (prefix match on origin only).  
- Reject: non-HTTPS except `http://localhost` and `http://127.0.0.1` (dev only).  
- Reject: credentials in URL, `javascript:`, `data:`, protocol-relative `//evil`.  
- Reject: different host/subdomain than listed (no `*.pages.dev` wildcard unless explicitly configured as separate entries).

### FR-1.2 Validation API (edge)

Pure function behavior (testable):

```
isAllowedBillingRedirectUrl(url: string, allowedOrigins: string[]): boolean
```

- Parse URL; fail if invalid.  
- Origin must match an entry exactly (`url.origin === allowed`).  
- Path + query allowed; fragment optional.

### FR-1.3 Checkout handler behavior

- If `successUrl` missing → use default: `{firstAllowedOrigin}/settings?billing=success`.  
- If `successUrl` present and invalid → **400** `{ error: 'Invalid successUrl' }` (do not call Polar).  
- Same for `cancelUrl` / `return_url` when present.  
- Extension default remains `{origin}/settings?billing=success&client=extension` only if origin is allowed.

### FR-1.4 Client defaults

- `VITE_APP_ORIGIN` (or `VITE_BILLING_APP_ORIGIN`) must be one of the allowlisted origins.  
- Document that production deploy sets both client and edge lists consistently.

## Implementation decisions

- Validation lives in shared edge helper (e.g. `_shared/billing-urls.ts`), used only by `billing-checkout`.  
- Do not trust client-only validation.  
- Portal session does not need success URL allowlist (Polar-hosted portal).

## Testing decisions

| Case | Expected |
|------|----------|
| `https://allowed.example/settings?billing=success` | Accept |
| `https://evil.example/` | 400 |
| `https://allowed.example.evil.com/` | 400 |
| `http://localhost:3000/settings` | Accept only if localhost in allowlist |
| Missing successUrl | Default to allowlisted origin + path |
| Empty allowlist env | Fail closed (500 misconfigured) at cold start or first request |

Unit-test pure validator without network. Optional integration: mock Polar not called when 400.

## Acceptance criteria

- [ ] No path exists where Polar receives a non-allowlisted success/return URL.  
- [ ] Unit tests cover accept/reject matrix.  
- [ ] README-billing documents `BILLING_ALLOWED_ORIGINS`.

## Out of scope for WP-1

CORS, rate limits, product id checks.

---

# WP-2 — CORS allowlist for billing edge (P0)

## Problem

`corsHeaders(origin)` sets `Access-Control-Allow-Origin` to the request Origin or `*`. Any website can invoke billing functions from a browser if it obtains a JWT.

## User stories

1. As a user, I want only the official web app (and local dev) to call billing APIs from a browser, so that random sites cannot drive my session against billing.  
2. As an extension user, billing still works via background (no browser CORS path required).  
3. As a developer, localhost remains usable in development.

## Functional requirements

### FR-2.1 Allowlist

Reuse `BILLING_ALLOWED_ORIGINS` (same as WP-1) for CORS.

### FR-2.2 Behavior

| Request | Behavior |
|---------|----------|
| OPTIONS preflight, Origin in allowlist | 204/200 + ACAO = that origin + needed headers |
| OPTIONS, Origin not allowlisted | 403, no `*` |
| POST, Origin header present and not allowlisted | 403 |
| POST without Origin (server/extension/curl) | Allow if JWT valid (no CORS headers required, or omit ACAO) |
| Missing allowlist config | Fail closed |

### FR-2.3 Headers

When allowed:

```
Access-Control-Allow-Origin: <exact origin>
Access-Control-Allow-Methods: POST, OPTIONS
Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
Vary: Origin
```

Do **not** set `Access-Control-Allow-Credentials: true` unless cookies are required (prefer Bearer only).

### FR-2.4 Webhook function

`polar-webhook` must **not** use browser CORS allow-all. Prefer no CORS or same strict list; Polar servers do not need browser CORS.

## Implementation decisions

- Shared `corsForBilling(req)` helper.  
- Apply to `billing-checkout` and `billing-portal` only.  
- Extension path: background uses `fetch` without Origin → unaffected.

## Testing decisions

| Case | Expected |
|------|----------|
| Origin = allowlisted | ACAO reflects that origin |
| Origin = evil.com | 403 |
| No Origin + valid JWT | 200 business logic |
| OPTIONS evil | 403 |

## Acceptance criteria

- [ ] No response sets `Access-Control-Allow-Origin: *` on billing checkout/portal.  
- [ ] Allowlist shared with WP-1 documented once.

## Out of scope for WP-2

WAF rules, Cloudflare Bot Fight Mode.

---

# WP-3 — Narrow extension host permissions & externally_connectable (P0)

## Problem

- `host_permissions` includes `https://*.supabase.co/*` (any Supabase project).  
- `externally_connectable.matches` includes `https://*.pages.dev/*` (any Pages project can message the extension).

## User stories

1. As a user, only underscore’s backend and web app can be reached or message the extension, so that other sites cannot abuse extension messaging.  
2. As a developer, I can still use localhost and our Pages project during development.  
3. As a security reviewer, the manifest least-privilege list is auditable.

## Functional requirements

### FR-3.1 host_permissions (billing-related)

Replace:

```
https://*.supabase.co/*
```

With pinned project URL(s), from config/docs:

```
https://<PROJECT_REF>.supabase.co/*
```

If sandbox project exists, list both explicitly. No wildcard on `supabase.co`.

Leave existing LLM/Ollama hosts unchanged in this WP unless already in scope.

### FR-3.2 externally_connectable

Replace `https://*.pages.dev/*` with explicit list:

| Environment | Match |
|-------------|--------|
| Production Pages | `https://underscore-web.pages.dev/*` (or actual project name) |
| Custom domain (when live) | `https://app.example.com/*` |
| Local web | `http://localhost/*`, `http://127.0.0.1/*` (keep) |

Remove broad `*.pages.dev`.

### FR-3.3 External message handlers

If any `onMessageExternal` / external bridge exists:

- Reject senders whose origin is not in the same allowlist.  
- Document that session bridge from web → extension only works from listed origins.

### FR-3.4 Config source of truth

Document pins in:

- `wxt.config.ts` (values)  
- `README-billing.md` or security section (why pinned)

Prefer constants file if multiple places need the same origin list (extension vs docs).

## Testing decisions

- Manifest snapshot / unit test that `host_permissions` does not contain `*.supabase.co` and `externally_connectable` does not contain `*.pages.dev`.  
- Manual: web app on allowlisted origin still syncs session / billing; random pages.dev cannot.

## Acceptance criteria

- [ ] No `*.supabase.co` or `*.pages.dev` wildcards in production manifest.  
- [ ] Checkout/entitlement still works against pinned Supabase.  
- [ ] Web ↔ extension session bridge still works from allowlisted web origin.

## Out of scope for WP-3

Removing LLM host permissions; MV3 CSP overhaul.

---

# WP-4 — Webhook product allowlist + user existence (P1)

## Problem

Signed webhooks upsert entitlement using `external_id` as `user_id` without:

1. Confirming the user exists in Auth.  
2. Confirming the subscription is for **Account (Paid)** product.

Misconfiguration or extra products on the Polar org could grant Paid incorrectly.

## User stories

1. As an operator, only the Account (Paid) Polar product grants Paid features.  
2. As a platform, we never write entitlements for non-existent user ids.  
3. As a customer of a different Polar product on the same org, I am not accidentally upgraded in underscore.

## Functional requirements

### FR-4.1 Product allowlist

Env: `POLAR_PRODUCT_ID` (existing) — treat as **sole** paid product unless `POLAR_PRODUCT_IDS` comma-list is introduced.

On subscription-like events:

- Extract product id from payload (subscription product / items — support Polar’s current schema; document field path).  
- If product not in allowlist → **do not** set plan=paid; either ignore or write free/canceled for that user if cancel event.  
- Log structured reason `product_not_allowed`.

### FR-4.2 User existence

Before upsert:

- Admin: load user by id (`auth.admin.getUserById` or equivalent).  
- If not found → 202 ignore (or 400 log); **do not** insert orphan entitlement row.

### FR-4.3 Metadata consistency (optional but recommended)

If both `external_id` and `metadata.user_id` present and differ → reject event (log, 202).

### FR-4.4 Cancel / empty state

`customer.state_changed` with no active allowed products → set free/canceled as today, still only if user exists.

## Implementation decisions

- Logic in `polar-webhook` after signature verify, before upsert.  
- Keep signature verification as first gate.  
- Pure helpers for “is allowed product” unit-tested with fixture payloads.

## Testing decisions

| Case | Expected |
|------|----------|
| Valid sig + allowed product + real user | Upsert paid |
| Valid sig + other product | No paid grant |
| Valid sig + unknown user uuid | No row |
| Invalid sig | 403, no DB |

Use mocked Supabase admin + fixture webhook bodies.

## Acceptance criteria

- [ ] Paid entitlement only for allowlisted product(s).  
- [ ] No entitlement rows for non-existent users.  
- [ ] Unit tests with Polar-like fixtures.

## Out of scope for WP-4

Multi-product catalog UI; refund edge cases beyond status mapping.

---

# WP-5 — Rate-limit checkout and portal (P1)

## Problem

Authenticated users can spam Polar checkout/portal creation (abuse, cost, card testing noise).

## User stories

1. As a normal user, I can open checkout a few times while retrying payment without friction.  
2. As an attacker with a stolen token, I cannot generate unlimited Polar sessions.  
3. As an operator, I see 429 with clear retry guidance.

## Functional requirements

### FR-5.1 Limits (defaults)

| Endpoint | Limit | Window |
|----------|-------|--------|
| `billing-checkout` | 5 requests | 15 minutes per user id |
| `billing-portal` | 10 requests | 15 minutes per user id |

Configurable via env if cheap (`BILLING_CHECKOUT_RATE=5/15m`).

### FR-5.2 Identity key

Rate key = authenticated Supabase `user.id` (after JWT validation).  
Do not rate-limit only by IP (shared NAT); IP secondary optional.

### FR-5.3 Storage

Prefer durable enough for multi-isolate:

- Supabase table `billing_rate_limits` (user_id, action, window_start, count), or  
- Existing project rate-limiter pattern if one exists in shared utils.

Fail policy: if rate store unavailable → fail closed (503) or fail open **document choice**; prefer fail closed for checkout.

### FR-5.4 Response

```
HTTP 429
{ "error": "Too many billing requests", "code": "RATE_LIMITED", "retryAfterMs": <n> }
```

## Implementation decisions

- Apply **after** auth, **before** Polar API call.  
- Reuse project rate-limiter utilities if present (`src/shared/utils/rate-limiter.ts` patterns) adapted for edge.

## Testing decisions

- Unit: counter increments; 6th checkout in window → 429.  
- Unit: portal independent bucket from checkout.  
- Window expiry resets count.

## Acceptance criteria

- [ ] Exceeding limit returns 429 without calling Polar.  
- [ ] Honest retry within limit succeeds.  
- [ ] Documented defaults in README-billing.

## Out of scope for WP-5

Global IP WAF; CAPTCHA/Turnstile (optional follow-up).

---

# WP-6 — Cloudflare Pages security headers (P1)

## Problem

`underscore-web` on Cloudflare Pages ships without a `_headers` security baseline (CSP, clickjacking, nosniff, etc.).

## User stories

1. As a user of the web app, the browser applies a strict CSP and framing policy.  
2. As an operator, staging `pages.dev` is `noindex`.  
3. As a developer, headers are in-repo and deploy with `web:deploy`.

## Functional requirements

### FR-6.1 Add `public-web/_headers` (copied to build output)

Baseline (adjust after smoke test):

```txt
/*
  X-Frame-Options: DENY
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://*.supabase.co https://api.polar.sh https://sandbox-api.polar.sh; font-src 'self' data:

https://:project.pages.dev/*
  X-Robots-Tag: noindex

https://:version.:project.pages.dev/*
  X-Robots-Tag: noindex
```

Notes:

- Vite/React may need CSP tuning (`unsafe-inline` styles often required initially).  
- Prefer tightening `script-src` to `'self'` only (no `unsafe-eval`).  
- `connect-src` must include Supabase project URL and Polar API if called from browser (checkout is redirect-based; still allow Supabase auth).  
- Custom domain later: drop noindex for production host only.

### FR-6.2 Deploy path

Confirm `vite.config.web.ts` `publicDir` is `public-web` so `_headers` is emitted into `dist-web` for Pages.  
Verify with deploy or `wrangler pages` local that headers appear on responses.

### FR-6.3 Auth / billing flows still work

Smoke:

- Sign-in  
- Settings load  
- Upgrade opens Polar (navigation top-level, not framed)

## Implementation decisions

- Static `_headers` only (no Pages Functions required).  
- Follow Cloudflare Pages headers docs for syntax.  
- Do not apply CORS `*` on static assets.

## Testing decisions

- File exists in repo under `public-web/_headers`.  
- Post-build: file present in `dist-web/_headers` (or Pages-recognized location).  
- Manual: DevTools response headers on `/` and `/settings`.  
- Manual: app not broken by CSP (console free of CSP blocks for critical paths).

## Acceptance criteria

- [ ] Production Pages responses include X-Frame-Options DENY and CSP.  
- [ ] Staging pages.dev has noindex.  
- [ ] Login + settings smoke pass.

## Out of scope for WP-6

Cloudflare WAF paid rulesets; Turnstile on login (separate PRD if needed).

---

# WP-7 — Validate Polar checkout URL host (P2)

## Problem

Clients open whatever URL edge returns. Defense-in-depth: only navigate to Polar-controlled hosts.

## User stories

1. As a user, Upgrade never opens a non-Polar domain in a new tab.  
2. As a developer, sandbox Polar hosts still work.

## Functional requirements

### FR-7.1 Allowlisted hosts

Exact host allowlist (update if Polar docs change):

- `polar.sh`  
- `www.polar.sh`  
- `sandbox.polar.sh`  
- `api.polar.sh` / checkout CDN hosts **only if** documented as checkout UI hosts  

Prefer allowlisting **checkout UI** hosts, not arbitrary API hosts. Confirm against Polar checkout `url` field in sandbox.

### FR-7.2 Behavior

```
assertPolarCheckoutUrl(url: string): string  // throws if invalid
```

- Scheme must be `https:`  
- Host in allowlist  
- Used in: `openBillingUrl` path for checkout (and optionally portal URLs if portal is also Polar-hosted)

### FR-7.3 Failure

If invalid: do not navigate; surface error to user (“Billing provider returned an unexpected URL”).

## Testing decisions

| URL | Result |
|-----|--------|
| `https://polar.sh/checkout/...` | OK |
| `https://evil.com/` | Throw / no open |
| `http://polar.sh/...` | Reject |

## Acceptance criteria

- [ ] Unit tests on host allowlist.  
- [ ] Checkout still opens in sandbox and production.

## Out of scope for WP-7

Certificate pinning; Polar phishing page detection beyond host check.

---

# WP-8 — Production build guards (P2)

## Problem

- `VITE_BILLING_DEV_OVERRIDE=true` forces Paid locally; catastrophic if shipped.  
- WXT `mode: 'development'` always may bake wrong env into extension builds.

## User stories

1. As a release manager, production artifacts cannot enable billing dev override.  
2. As a developer, local override still works when explicitly set.  
3. As CI, bad production config fails the pipeline.

## Functional requirements

### FR-8.1 Dev override guard

- Runtime: if `import.meta.env.PROD` (or equivalent) and override true → **ignore** override and log once.  
- CI: script or test fails if production env file / build defines `VITE_BILLING_DEV_OVERRIDE=true`.

### FR-8.2 Extension build mode

- Document required production build command.  
- Prefer: production builds use production mode for env loading; development mode only for local `wxt`.  
- If hardcoding mode must remain for a known WXT bug, add a **release checklist item** and CI assert on expected env values (Supabase URL project ref, override unset).

### FR-8.3 Checklist artifact

Short checklist in README-billing:

- [ ] `POLAR_SERVER=production`  
- [ ] `BILLING_ALLOWED_ORIGINS` production only  
- [ ] Override unset  
- [ ] Webhook secret rotated if leaked  
- [ ] WP-1–3 merged  

## Testing decisions

- Unit: `isBillingDevOverrideEnabled()` false when PROD even if env true (if FR-8.1 runtime ignore).  
- CI job dry-run documented.

## Acceptance criteria

- [ ] Production build path cannot enable free Paid.  
- [ ] Checklist exists for human release.

## Out of scope for WP-8

Full multi-environment Terraform.

---

## Cross-cutting implementation decisions

1. **Config env names** (edge secrets / env):

| Name | Used by |
|------|---------|
| `BILLING_ALLOWED_ORIGINS` | WP-1, WP-2 |
| `POLAR_ACCESS_TOKEN` | existing |
| `POLAR_WEBHOOK_SECRET` | existing |
| `POLAR_PRODUCT_ID` | existing + WP-4 |
| `POLAR_SERVER` | existing |
| `VITE_APP_ORIGIN` | client redirects |
| `VITE_BILLING_DEV_OVERRIDE` | local only; WP-8 |

2. **No Polar secrets in `VITE_*` or Cloudflare Pages public env.**  
3. **Do not enable Cloudflare Bot Fight Mode on a future CF-hosted webhook** without Polar IP allowlisting (keep webhooks on Supabase Edge).  
4. **Each WP = one PR** preferred (`fix(security): …` conventional commits).  
5. **Test before mark complete:** unit for pure validators; smoke checkout in Polar sandbox after WP-1–3.

---

## Testing strategy (program-level)

| Layer | What |
|-------|------|
| Pure functions | URL allowlist, CORS origin match, Polar host allowlist, product allowlist |
| Edge handlers | Mock Polar + auth; assert 400/403/429 and that Polar fetch not called |
| Extension manifest | Static assert least privilege |
| Pages | Header presence after build/deploy |
| E2E (optional) | Sandbox checkout happy path after P0 |

Good tests assert **external behavior** (status codes, headers, no navigation to evil URL), not private helper names.

Prior art: `tests/unit/shared/billing/entitlement.test.ts`, existing rate-limiter tests, auth hardening tests.

---

## Rollout plan

| Phase | WPs | Gate |
|-------|-----|------|
| **Block paid** | 1, 2, 3 | Merged + sandbox checkout smoke |
| **Harden trust** | 4, 5 | Webhook fixtures + 429 tests |
| **Platform hygiene** | 6, 7, 8 | Headers live + CI guards |
| **Go-live** | — | Real Polar product + secrets + checklist |

---

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| CSP breaks web auth | Smoke after WP-6; loosen style-src only as needed |
| Pinned Supabase host wrong | Confirm project ref before WP-3 merge |
| Allowlist omits custom domain | Update `BILLING_ALLOWED_ORIGINS` + manifest when domain goes live |
| Rate limit false positives | Defaults generous; env-tunable |

---

## Success metrics

- Zero open-redirect findings on re-review of checkout.  
- Manifest audit: no broad Pages/Supabase wildcards.  
- Webhook cannot grant Paid for non-allowlisted product in tests.  
- Pages response includes frame denial + CSP.  
- Production build cannot set billing dev override.

---

## Further notes

- Security review source conversation: 2026-07-25 billing + Cloudflare security review.  
- Architecture already on branch: entitlements, BillingProvider, derived `pro_xai`.  
- This PRD does **not** replace Polar KYC / product setup; it hardens code around it.  
- Take **WP-1 first** if only one package can ship this week.

---

## Appendix A — Quick owner checklist per WP

| WP | Primary surfaces | Done when |
|----|------------------|-----------|
| 1 | Edge `billing-checkout` | Invalid successUrl → 400; tests green |
| 2 | Edge CORS helper | No `ACAO: *`; tests green |
| 3 | `wxt.config.ts` | Pinned hosts; bridge still works |
| 4 | `polar-webhook` | Product + user checks; fixtures |
| 5 | checkout + portal | 429 after N; Polar not called |
| 6 | `public-web/_headers` | Headers on Pages |
| 7 | `openBillingUrl` / assert helper | Evil host blocked |
| 8 | build/CI + runtime | Override cannot ship PROD |

---

## Appendix B — Suggested commit subjects

```
fix(security): allowlist Polar checkout redirect URLs
fix(security): restrict billing edge CORS origins
fix(security): pin extension supabase and pages origins
fix(security): validate Polar webhook product and user
fix(security): rate-limit billing checkout and portal
fix(security): add Cloudflare Pages security headers
fix(security): allowlist Polar checkout navigation hosts
fix(security): guard billing dev override in production builds
```
