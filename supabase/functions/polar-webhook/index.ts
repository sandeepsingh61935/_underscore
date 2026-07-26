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
    console.error('webhook signature invalid');
    return new Response('', { status: 403, headers: jsonHeaders });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: jsonHeaders });
  }

  console.log('webhook received', {
    type: event.type ?? 'unknown',
    hasData: Boolean(event.data),
  });

  const source = extractPolarEntitlementSource(event);
  if (!source) {
    console.error('webhook: could not resolve user/subscription from payload', {
      type: event.type,
      dataKeys: event.data ? Object.keys(event.data) : [],
    });
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  console.log('webhook source resolved', {
    userId: source.userId,
    status: source.polarStatus,
    subscriptionId: source.polarSubscriptionId,
  });

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
    console.error('webhook user not found in auth.users', {
      userId: source.userId,
      err: userErr?.message,
    });
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  const eventProductId = extractPolarProductId(event);
  const productDecision = decideWebhookEntitlementWrite({
    polarStatus: source.polarStatus,
    allowedProductId: Deno.env.get('POLAR_PRODUCT_ID'),
    eventProductId,
  });
  if (!productDecision.write) {
    console.error('webhook product gate blocked write', {
      reason: productDecision.reason,
      userId: source.userId,
      status: source.polarStatus,
      eventProductId,
      allowed: Deno.env.get('POLAR_PRODUCT_ID') ? 'set' : 'missing',
    });
    return new Response('', { status: 202, headers: jsonHeaders });
  }

  const row = entitlementUpsertFromPolarSubscription(source);
  const { error } = await admin.from('billing_entitlements').upsert(row, {
    onConflict: 'user_id',
  });

  if (error) {
    console.error('entitlement upsert failed', {
      message: error.message,
      code: error.code,
      details: error.details,
    });
    return new Response('DB error', { status: 500, headers: jsonHeaders });
  }

  console.log('entitlement upserted', {
    userId: row.user_id,
    plan: row.plan,
    status: row.status,
  });

  return new Response('', { status: 202, headers: jsonHeaders });
});
