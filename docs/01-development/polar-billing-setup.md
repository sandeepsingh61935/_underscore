# Polar billing setup

Platform-agnostic Account (Paid) via [Polar](https://polar.sh) (Merchant of Record).

## Architecture

```
Polar checkout/portal/webhooks
  → Supabase Edge Functions
  → public.billing_entitlements (RLS read-only for users)
  → extension / web project mode pro_xai when isPaidActive
```

One Polar product unlocks Paid on **all** clients that share the Supabase user id.

## 1. Polar dashboard

1. Create org (e.g. underscore LLC).
2. Product: **Account (Paid)**, recurring monthly, description as in product copy.
3. Copy **Product ID**.
4. Create **Organization Access Token** with checkout + customer session scopes.
5. Webhooks → endpoint:
   `https://<project-ref>.supabase.co/functions/v1/polar-webhook`
   Events (minimum):
   - `subscription.created`
   - `subscription.updated`
   - `subscription.active`
   - `subscription.canceled`
   - `customer.state_changed`
6. Copy webhook signing secret.

No custom domain required to start. Support email + optional one-page site for KYC.

## 2. Supabase

```bash
# Apply migration
npm run supabase:push

# Deploy edge functions
npx supabase functions deploy billing-checkout
npx supabase functions deploy billing-portal
npx supabase functions deploy polar-webhook

# Secrets (dashboard or CLI)
npx supabase secrets set \
  POLAR_ACCESS_TOKEN=polar_oat_... \
  POLAR_WEBHOOK_SECRET=whsec_... \
  POLAR_PRODUCT_ID=<uuid> \
  POLAR_SERVER=sandbox
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` are provided automatically to Edge Functions.

Use `POLAR_SERVER=production` for live.

## 3. Client env

Already uses:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

Optional local QA (allows selecting Paid without a subscription):

```bash
VITE_BILLING_DEV_OVERRIDE=true
```

Never enable in production builds.

## 4. Manual test

1. Sign in (web or extension).
2. Settings → **Upgrade to Account (Paid)** → Polar checkout.
3. Complete payment (sandbox card).
4. Webhook upserts entitlement; refresh Settings → pill **Paid**, AI/MCP unlock.
5. **Manage billing** → portal → cancel; after cancel policy, mode returns to Free.

## 5. Product copy (Polar)

See plan notes: Account (Paid), BYOK AI, cross-device account access, not AI tokens.

## Security

- Polar secrets only on Edge Functions.
- Clients never write `billing_entitlements`.
- `external_customer_id` = Supabase `user.id` on every checkout.
