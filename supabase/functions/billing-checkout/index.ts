import {
  corsHeaders,
  polarFetch,
  polarProductId,
  requireUser,
} from '../_shared/polar.ts';

Deno.serve(async (req) => {
  const origin = req.headers.get('Origin');
  const cors = corsHeaders(origin);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...cors, 'Content-Type': 'application/json' },
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

  if (!body.successUrl || typeof body.successUrl !== 'string') {
    return new Response(JSON.stringify({ error: 'successUrl is required' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  const productId = polarProductId();
  const payload: Record<string, unknown> = {
    products: [productId],
    external_customer_id: userOrErr.id,
    customer_email: userOrErr.email,
    success_url: body.successUrl,
    metadata: { user_id: userOrErr.id },
    customer_metadata: { user_id: userOrErr.id },
  };
  if (body.cancelUrl) payload.return_url = body.cancelUrl;
  if (body.customerIpAddress) {
    payload.customer_ip_address = body.customerIpAddress;
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
          error: data?.detail?.[0]?.msg || data?.error || 'Checkout failed',
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
