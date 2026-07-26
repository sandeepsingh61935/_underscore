# Billing edge functions (Polar)

**Security hardening program:**  
`docs/superpowers/specs/2026-07-25-billing-security-hardening-prd.md`

Do not take real money until **WP-1–WP-3** env + manifest are configured in deploy.

| Function | Auth | Purpose |
|----------|------|---------|
| `billing-checkout` | User JWT | Create Polar checkout (`external_customer_id` = Supabase user id) |
| `billing-portal` | User JWT | Polar customer portal session |
| `polar-webhook` | Polar signature | Upsert `public.billing_entitlements` |

## Secrets / env

```bash
npx supabase secrets set \
  POLAR_ACCESS_TOKEN=polar_oat_... \
  POLAR_WEBHOOK_SECRET=whsec_... \
  POLAR_PRODUCT_ID=<product-uuid> \
  POLAR_SERVER=sandbox \
  BILLING_ALLOWED_ORIGINS=https://underscore-web.pages.dev,http://localhost:3000
```

| Name | Required | Notes |
|------|----------|--------|
| `POLAR_ACCESS_TOKEN` | yes | Org access token |
| `POLAR_WEBHOOK_SECRET` | yes | Standard Webhooks secret |
| `POLAR_PRODUCT_ID` | yes | Account (Paid) product; webhook rejects other products |
| `POLAR_SERVER` | no | `sandbox` or `production` (default) |
| `BILLING_ALLOWED_ORIGINS` | yes | Comma-separated origins for redirects + CORS (WP-1/2) |

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` are provided to Edge automatically.

## Deploy

```bash
npm run supabase:push
npx supabase functions deploy billing-checkout
npx supabase functions deploy billing-portal
npx supabase functions deploy polar-webhook
```

Webhook URL:

`https://<project-ref>.supabase.co/functions/v1/polar-webhook`

## Security controls (landed)

| WP | Control |
|----|---------|
| 1 | `successUrl` / `cancelUrl` allowlisted via `BILLING_ALLOWED_ORIGINS` |
| 2 | CORS exact origin allowlist (no `*`) on checkout/portal |
| 3 | Extension pins Supabase project + `underscore-web.pages.dev` |
| 4 | Webhook: user must exist; **fail-closed** product match for active/trialing/past_due (S-2) |
| 5 | Rate limit: checkout 5/15m, portal 10/15m per user |
| 6 | Pages `_headers` CSP / frame / nosniff |
| 7 | `openBillingUrl` only allows Polar hosts |
| 8 | `VITE_BILLING_DEV_OVERRIDE` ignored when `PROD` |

## Local QA

`VITE_BILLING_DEV_OVERRIDE=true` treats the user as paid for gates without a Polar sub. **Ignored in production builds.** Never set on release.

Optional: `VITE_APP_ORIGIN=https://underscore-web.pages.dev` for checkout success/cancel defaults (must be in `BILLING_ALLOWED_ORIGINS`).

## Architecture note

Mode `pro_xai` is **derived** from entitlement when load state is `ready` (never from free ModeSelector). Load **error** does not demote a previously paid mode.
