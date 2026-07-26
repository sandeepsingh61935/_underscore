import {
  polarFetch,
  polarProductId,
  requireUser,
} from '../_shared/polar.ts';
import {
  isAllowedBillingCorsOrigin,
  isBillingRequestOriginAllowed,
  parseBillingAllowedOrigins,
  resolveBillingRedirectUrl,
  resolveBillingReturnUrl,
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

  // Web: allowlisted origin. Extension: chrome-extension://pinned-id. No Origin: OK.
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

  // WP-5: 5 checkouts / 15 min per user
  const rl = tryRateLimit(`checkout:${userOrErr.id}`, 5, 15 * 60 * 1000);
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

  let body: {
    successUrl?: string;
    cancelUrl?: string;
    customerIpAddress?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const success = resolveBillingRedirectUrl(
    body.successUrl,
    allowed,
    'success'
  );
  if (!success.ok) {
    return new Response(JSON.stringify({ error: success.error }), {
      status: success.error.includes('not configured') ? 500 : 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const ret = resolveBillingReturnUrl(body.cancelUrl, allowed);
  if (!ret.ok) {
    return new Response(JSON.stringify({ error: ret.error }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const productId = polarProductId();
  const payload: Record<string, unknown> = {
    products: [productId],
    external_customer_id: userOrErr.id,
    customer_email: userOrErr.email,
    success_url: success.url,
    metadata: { user_id: userOrErr.id },
    customer_metadata: { user_id: userOrErr.id },
  };
  if (ret.url) payload.return_url = ret.url;
  // Prefer edge-observed IP only if present on request; ignore untrusted client IP
  const cfIp = req.headers.get('cf-connecting-ip');
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const edgeIp = cfIp || xff;
  if (edgeIp) {
    payload.customer_ip_address = edgeIp;
  }

  try {
    const res = await polarFetch('/v1/checkouts/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      console.error('Polar checkout error', data);
      return new Response(
        JSON.stringify({
          error: 'Checkout failed',
        }),
        {
          status: 502,
          headers: { ...cors, 'Content-Type': 'application/json' },
        }
      );
    }
    if (!data.url) {
      return new Response(JSON.stringify({ error: 'No checkout URL returned' }), {
        status: 502,
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }
    return new Response(JSON.stringify({ url: data.url }), {
      status: 200,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: 'Checkout failed' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
