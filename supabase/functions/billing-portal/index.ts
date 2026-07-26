import { polarFetch, requireUser } from '../_shared/polar.ts';
import {
  isAllowedBillingCorsOrigin,
  isBillingRequestOriginAllowed,
  parseBillingAllowedOrigins,
} from '../_shared/billing-urls.ts';
import { tryRateLimit } from '../_shared/rate-limit.ts';

function loadAllowedOrigins(): string[] {
  return parseBillingAllowedOrigins(Deno.env.get('BILLING_ALLOWED_ORIGINS'));
}

function billingCors(
  origin: string | null,
  allowed: string[]
): HeadersInit {
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

  if (!allowed.length) {
    return new Response(
      JSON.stringify({ error: 'Billing redirect allowlist is not configured' }),
      {
        status: 500,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }

  const userOrErr = await requireUser(req);
  if (userOrErr instanceof Response) {
    const body = await userOrErr.text();
    return new Response(body, {
      status: userOrErr.status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // WP-5: 10 portal sessions / 15 min per user
  const rl = tryRateLimit(`portal:${userOrErr.id}`, 10, 15 * 60 * 1000);
  if (!rl.allowed) {
    return new Response(
      JSON.stringify({
        error: 'Too many billing requests',
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

  try {
    const res = await polarFetch('/v1/customer-sessions/', {
      method: 'POST',
      body: JSON.stringify({
        external_customer_id: userOrErr.id,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Polar portal error', data);
      return new Response(
        JSON.stringify({
          error: 'Portal session failed — subscribe first',
        }),
        {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }

    const url =
      data.customer_portal_url ||
      data.customerPortalUrl ||
      data.url ||
      null;

    if (!url) {
      return new Response(JSON.stringify({ error: 'No portal URL returned' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ url }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Portal failed' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
