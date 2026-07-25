-- Platform-agnostic billing entitlements (Polar MoR + future store rails).
-- Source of truth for Account (Paid). Clients are read-only; webhooks/service_role write.

CREATE TABLE public.billing_entitlements (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  plan text NOT NULL DEFAULT 'free'
    CHECK (plan IN ('free', 'paid')),
  status text NOT NULL DEFAULT 'none'
    CHECK (status IN (
      'none',
      'trialing',
      'active',
      'past_due',
      'canceled',
      'unpaid'
    )),
  provider text
    CHECK (provider IS NULL OR provider IN ('polar', 'apple_iap', 'google_play')),
  provider_customer_id text,
  provider_subscription_id text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  raw_status text,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.billing_entitlements IS
  'Per-user subscription entitlement. Written by Polar webhooks (service_role) or '
  'future store adapters. Clients SELECT only via RLS. plan=paid + status in '
  '(active, trialing) unlocks Account (Paid) / pro_xai across all platforms.';

CREATE INDEX billing_entitlements_provider_customer_idx
  ON public.billing_entitlements (provider, provider_customer_id)
  WHERE provider_customer_id IS NOT NULL;

CREATE INDEX billing_entitlements_provider_subscription_idx
  ON public.billing_entitlements (provider, provider_subscription_id)
  WHERE provider_subscription_id IS NOT NULL;

ALTER TABLE public.billing_entitlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_entitlements FORCE ROW LEVEL SECURITY;

-- Authenticated users may read their own row only. No INSERT/UPDATE/DELETE for clients.
CREATE POLICY billing_entitlements_select_own
  ON public.billing_entitlements
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- service_role bypasses RLS (webhook writers). No write policies for authenticated.
