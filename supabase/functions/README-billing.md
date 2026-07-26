# Billing edge functions (Polar)

**Security hardening program (ordered WPs):**  
`docs/superpowers/specs/2026-07-25-billing-security-hardening-prd.md`  
Do not take real money until WP-1–WP-3 (P0) are done.

| Function | Auth | Purpose |
|----------|------|---------|
| `billing-checkout` | User JWT | Create Polar checkout (`external_customer_id` = Supabase user id) |
| `billing-portal` | User JWT | Polar customer portal session |
| `polar-webhook` | Polar signature | Upsert `public.billing_entitlements` |

## Secrets

```bash
npx supabase secrets set \
  POLAR_ACCESS_TOKEN=polar_oat_... \
  POLAR_WEBHOOK_SECRET=whsec_... \
  POLAR_PRODUCT_ID=<product-uuid> \
  POLAR_SERVER=sandbox
```

Use `POLAR_SERVER=production` for live.

## Deploy

```bash
npm run supabase:push   # migration
npx supabase functions deploy billing-checkout
npx supabase functions deploy billing-portal
npx supabase functions deploy polar-webhook
```

Webhook URL:

`https://<project-ref>.supabase.co/functions/v1/polar-webhook`

## Local QA

`VITE_BILLING_DEV_OVERRIDE=true` treats the user as paid for gates without a Polar sub. Never ship enabled.

Optional: `VITE_APP_ORIGIN=https://your-app.example` for checkout success/cancel redirects.

## Architecture note

Mode `pro_xai` is **derived** from entitlement when load state is `ready` (never from free ModeSelector). Load **error** does not demote a previously paid mode.
