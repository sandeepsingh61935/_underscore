import {
  entitlementUpsertFromPolarSubscription,
  extractPolarEntitlementSource,
  verifyPolarWebhook,
} from '../_shared/polar.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** Webhooks are server-to-server — no browser CORS. */
const jsonHeaders = { 'Content-Type': 'text/plain' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: jsonHeaders });
  }

  const secret = Deno.env.get('POLAR_WEBHOOK_SECRET');
  if (!secret) {
    console.error('POLAR_WEBHOOK_SECRET missing');
    return new Response('Misconfigured', { status: 500, headers: jsonHeaders });
  }

  const body = await req.text();
  const ok = await verifyPolarWebhook(body, req.headers, secret);
  if (!ok) {
    return new Response('', { status: 403, headers: jsonHeaders });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: jsonHeaders });
  }

  const source = extractPolarEntitlementSource(event);
  if (!source) {
    // Ignore events we do not map (e.g. product updates)
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase service env missing');
    return new Response('Misconfigured', { status: 500, headers: jsonHeaders });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // WP-4: only grant for known users and allowlisted product (best-effort product from payload)
  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
    source.userId
  );
  if (userErr || !userData?.user) {
    console.error('webhook user not found', source.userId);
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  const allowedProduct = Deno.env.get('POLAR_PRODUCT_ID');
  const eventProductId = extractProductId(event);
  if (
    allowedProduct &&
    eventProductId &&
    eventProductId !== allowedProduct &&
    source.polarStatus !== 'canceled' &&
    source.polarStatus !== 'cancelled'
  ) {
    // Active sub for a different product — do not grant paid
    console.error('webhook product not allowlisted', eventProductId);
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  const row = entitlementUpsertFromPolarSubscription(source);
  const { error } = await admin.from('billing_entitlements').upsert(row, {
    onConflict: 'user_id',
  });

  if (error) {
    console.error('entitlement upsert failed', error);
    return new Response('DB error', { status: 500, headers: jsonHeaders });
  }

  return new Response('', { status: 202, headers: jsonHeaders });
});

function extractProductId(event: {
  type?: string;
  data?: Record<string, unknown> | null;
}): string | null {
  const data = event.data;
  if (!data) return null;
  if (typeof data['product_id'] === 'string') return data['product_id'];
  const product = data['product'] as Record<string, unknown> | undefined;
  if (product && typeof product['id'] === 'string') return product['id'];
  return null;
}
