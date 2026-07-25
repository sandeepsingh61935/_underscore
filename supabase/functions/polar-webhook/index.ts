import {
  corsHeaders,
  entitlementUpsertFromPolarSubscription,
  extractPolarEntitlementSource,
  verifyPolarWebhook,
} from '../_shared/polar.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

Deno.serve(async (req) => {
  const cors = corsHeaders();

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: cors });
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: cors });
  }

  const secret = Deno.env.get('POLAR_WEBHOOK_SECRET');
  if (!secret) {
    console.error('POLAR_WEBHOOK_SECRET missing');
    return new Response('Misconfigured', { status: 500, headers: cors });
  }

  const body = await req.text();
  const ok = await verifyPolarWebhook(body, req.headers, secret);
  if (!ok) {
    return new Response('', { status: 403, headers: cors });
  }

  let event: { type?: string; data?: Record<string, unknown> };
  try {
    event = JSON.parse(body);
  } catch {
    return new Response('Invalid JSON', { status: 400, headers: cors });
  }

  const source = extractPolarEntitlementSource(event);
  if (!source) {
    // Ignore events we do not map (e.g. product updates)
    return new Response('', { status: 202, headers: cors });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!supabaseUrl || !serviceKey) {
    console.error('Supabase service env missing');
    return new Response('Misconfigured', { status: 500, headers: cors });
  }

  const admin = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const row = entitlementUpsertFromPolarSubscription(source);
  const { error } = await admin.from('billing_entitlements').upsert(row, {
    onConflict: 'user_id',
  });

  if (error) {
    console.error('entitlement upsert failed', error);
    return new Response('DB error', { status: 500, headers: cors });
  }

  return new Response('', { status: 202, headers: cors });
});
