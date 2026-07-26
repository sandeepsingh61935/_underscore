/**
 * Pull Polar customer state into billing_entitlements (JWT user).
 * Fallback when webhooks fail (e.g. signature issues).
 * Requires OAT scope: customers:read
 *
 * Product rules mirror webhook S-2 fail-closed (exact product match only).
 */
import {
  entitlementUpsertFromPolarSubscription,
  polarFetch,
  polarProductId,
  requireUser,
} from '../_shared/polar.ts';
import {
  isAllowedBillingCorsOrigin,
  isBillingRequestOriginAllowed,
  parseBillingAllowedOrigins,
} from '../_shared/billing-urls.ts';
import { tryRateLimit } from '../_shared/rate-limit.ts';
import { resolveBillingSyncFromSubscriptions } from '../_shared/polar-sync.ts';

function loadAllowedOrigins(): string[] {
  return parseBillingAllowedOrigins(Deno.env.get('BILLING_ALLOWED_ORIGINS'));
}

function billingCors(origin: string | null, allowed: string[]): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type',
    Vary: 'Origin',
  };
  if (origin && isAllowedBillingCorsOrigin(origin, allowed)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

Deno.serve(async (req) => {
  const allowed = loadAllowedOrigins();
  const origin = req.headers.get('Origin');
  const cors = billingCors(origin, allowed);

  if (req.method === 'OPTIONS') {
    if (origin && !isAllowedBillingCorsOrigin(origin, allowed)) {
      return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
      });
    }
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (!isBillingRequestOriginAllowed(origin, allowed)) {
    return new Response(JSON.stringify({ error: 'Origin not allowed' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', Vary: 'Origin' },
    });
  }

  const userOrErr = await requireUser(req);
  if (userOrErr instanceof Response) {
    const body = await userOrErr.text();
    return new Response(body, {
      status: userOrErr.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // WP-5: 20 syncs / 15 min per user (focus + post-checkout poll)
  const rl = tryRateLimit(`billing-sync:${userOrErr.id}`, 20, 15 * 60 * 1000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many billing sync requests',
        code: 'RATE_LIMITED',
        retryAfterMs: rl.retryAfterMs,
      }),
      {
        status: 429,
        headers: {
          ...cors,
          'Content-Type': 'application/json',
          'Retry-After': String(Math.ceil(rl.retryAfterMs / 1000)),
        },
      }
    );
  }

  const userId = userOrErr.id;
  let productId: string;
  try {
    productId = polarProductId();
  } catch {
    return new Response(
      JSON.stringify({ error: 'POLAR_PRODUCT_ID is not configured' }),
      {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }

  // Polar: GET /v1/customers/external/{external_id}/state
  const res = await polarFetch(
    `/v1/customers/external/${encodeURIComponent(userId)}/state`,
    { method: 'GET' }
  );

  const { createClient } = await import(
    'https://esm.sh/@supabase/supabase-js@2.49.1'
  );
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function upsertFree(
    polarCustomerId: string | null,
    reason: string
  ): Promise<Response> {
    const freeRow = entitlementUpsertFromPolarSubscription({
      userId,
      polarStatus: 'canceled',
      polarCustomerId,
      polarSubscriptionId: null,
      currentPeriodEnd: null,
      cancelAtPeriodEnd: false,
    });
    const { error } = await admin.from('billing_entitlements').upsert(freeRow, {
      onConflict: 'user_id',
    });
    if (error) {
      console.error('billing-sync free upsert failed', error);
      return new Response(JSON.stringify({ error: 'DB error' }), {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({ ok: true, plan: 'free', reason }),
      { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
    );
  }

  if (res.status === 404) {
    // No Polar customer — demote so stale paid rows do not linger
    return await upsertFree(null, 'no_polar_customer');
  }

  if (!res.ok) {
    const errBody = await res.text();
    console.error('Polar customer state failed', res.status, errBody);
    return new Response(
      JSON.stringify({
        error:
          res.status === 403
            ? 'Polar token missing customers:read scope — create new OAT with customers:read'
            : 'Failed to sync from Polar',
      }),
      {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }

  const state = (await res.json()) as {
    id?: string;
    active_subscriptions?: Array<{
      id?: string;
      status?: string;
      product_id?: string;
      current_period_end?: string;
      cancel_at_period_end?: boolean;
    }>;
  };

  const subs = Array.isArray(state.active_subscriptions)
    ? state.active_subscriptions
    : [];

  const decision = resolveBillingSyncFromSubscriptions({
    allowedProductId: productId,
    subscriptions: subs,
    customerExists: true,
  });

  if (decision.action === 'upsert_free') {
    return await upsertFree(state.id ?? null, decision.reason);
  }

  const match = decision.sub;
  const row = entitlementUpsertFromPolarSubscription({
    userId,
    polarStatus: match.status ?? 'active',
    polarCustomerId: state.id ?? null,
    polarSubscriptionId: match.id ?? null,
    currentPeriodEnd: match.current_period_end ?? null,
    cancelAtPeriodEnd: Boolean(match.cancel_at_period_end),
  });

  const { error } = await admin.from('billing_entitlements').upsert(row, {
    onConflict: 'user_id',
  });

  if (error) {
    console.error('billing-sync upsert failed', error);
    return new Response(JSON.stringify({ error: 'DB error' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  console.log('billing-sync upserted', {
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
  });

  return new Response(
    JSON.stringify({
      ok: true,
      plan: row.plan,
      status: row.status,
      reason: decision.reason,
    }),
    { status: 200, headers: { ...cors, 'Content-Type': 'application/json' } }
  );
});
