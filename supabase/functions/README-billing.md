# Billing edge functions (Polar)

**Security hardening program:**  
`docs/superpowers/specs/2026-07-25-billing-security-hardening-prd.md`

Do not take real money until **WP-1–WP-3** env + manifest are configured in deploy.

| Function | Auth | Purpose |
|----------|------|---------|
| `billing-checkout` | User JWT | Create Polar checkout (`external_customer_id` = Supabase user id) |
| `billing-portal` | User JWT | Polar customer portal session |
| `billing-sync` | User JWT | Pull Polar customer state → `billing_entitlements` (post-checkout / Sync / webhook fallback) |
| `polar-webhook` | Polar signature | Upsert `public.billing_entitlements` |

## Secrets / env

```bash
npx supabase secrets set \
  POLAR_ACCESS_TOKEN=polar_oat_... \
  POLAR_WEBHOOK_SECRET=whsec_... \
  POLAR_PRODUCT_ID=<product-uuid> \
  POLAR_SERVER=sandbox \
  BILLING_ALLOWED_ORIGINS=https://underscore-web.pages.dev,http://localhost:3000,http://localhost:5173
```

| Name | Required | Notes |
|------|----------|--------|
| `POLAR_ACCESS_TOKEN` | yes | Org access token with **`customers:read`** (required for `billing-sync`) |
| `POLAR_WEBHOOK_SECRET` | yes | Standard Webhooks secret (`whsec_…`) — must match Polar dashboard |
| `POLAR_PRODUCT_ID` | yes | Account (Paid) product; webhook + sync reject other products |
| `POLAR_SERVER` | no | `sandbox` or `production` (default) |
| `BILLING_ALLOWED_ORIGINS` | yes | Comma-separated **http(s) origins** for success/cancel redirects + web CORS. Must include `https://underscore-web.pages.dev` (extension default return URL). **Do not rely on `chrome-extension://…` alone** — WHATWG `URL.origin` for that scheme is `"null"`, so redirects fail with `Invalid successUrl`. Extension **CORS** is pinned in code (`BILLING_ALLOWED_EXTENSION_IDS`), not this list. |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge automatically.

## Deploy

```bash
npm run supabase:push
npx supabase functions deploy billing-checkout
npx supabase functions deploy billing-portal
npx supabase functions deploy billing-sync
npx supabase functions deploy polar-webhook --no-verify-jwt
```

Webhook URL:

`https://<project-ref>.supabase.co/functions/v1/polar-webhook`

## Security controls (landed)

| WP | Control |
|----|---------|
| 1 | `successUrl` / `cancelUrl` allowlisted via `BILLING_ALLOWED_ORIGINS` |
| 2 | CORS exact origin allowlist (no `*`) on checkout/portal/sync |
| 3 | Extension pins Supabase project + `underscore-web.pages.dev` |
| 4 | Webhook + sync: fail-closed product match for grants (S-2); only `subscription.*` / customer state (not `order.*`) |
| 5 | Rate limit (durable DB): checkout 5/15m, portal 10/15m, **sync 20/15m** per user via `billing_try_rate_limit` |
| 6 | Pages `_headers` CSP / frame / nosniff |
| 7 | `openBillingUrl` only allows Polar hosts |
| 8 | Dev paid override requires **both** `VITE_BILLING_DEV_OVERRIDE` and `VITE_ALLOW_BILLING_DEV_OVERRIDE` (never in release) |

## Local QA

```bash
VITE_BILLING_DEV_OVERRIDE=true
VITE_ALLOW_BILLING_DEV_OVERRIDE=true
```

Treats the user as paid for gates without a Polar sub. **Both flags required.** Never set the allow flag on release builds (WXT uses `mode: 'development'` for extension packaging).

Optional: `VITE_APP_ORIGIN=https://underscore-web.pages.dev` for checkout success/cancel defaults (must be in `BILLING_ALLOWED_ORIGINS`).

## Architecture note

Mode `pro_xai` is **derived** from entitlement when load state is `ready` (never from free ModeSelector). Load **error** does not demote a previously paid mode.

Dual path after pay: Polar webhook (push) + client/extension `billing-sync` (pull). Extension Sync uses IPC → background → `billing-sync`.
