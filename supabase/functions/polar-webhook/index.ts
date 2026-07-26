import {
  entitlementUpsertFromPolarSubscription,
  extractPolarEntitlementSource,
  verifyPolarWebhook,
} from '../_shared/polar.ts';
import {
  decideWebhookEntitlementWrite,
  extractPolarProductId,
} from '../_shared/webhook-product-gate.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

/** Webhooks are server-to-server — no browser CORS. */
const jsonHeaders = { 'Content-Type': 'text/plain' };

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204 });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', {
      status: 405,
      headers: jsonHeaders,
    });
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

  const { data: userData, error: userErr } = await admin.auth.admin.getUserById(
    source.userId
  );
  if (userErr || !userData?.user) {
    console.error('webhook user not found', source.userId);
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  // S-2: fail closed on grant without allowlisted product id
  const productDecision = decideWebhookEntitlementWrite({
    polarStatus: source.polarStatus,
    allowedProductId: Deno.env.get('POLAR_PRODUCT_ID'),
    eventProductId: extractPolarProductId(event),
  });
  if (!productDecision.write) {
    console.error('webhook product gate', productDecision.reason, {
      userId: source.userId,
      status: source.polarStatus,
    });
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
