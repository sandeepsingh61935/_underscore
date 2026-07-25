import { corsHeaders, polarFetch, requireUser } from '../_shared/polar.ts';

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
          error:
            data?.detail?.[0]?.msg ||
            data?.error ||
            'Portal session failed — subscribe first',
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
