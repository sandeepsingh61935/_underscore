import { requireUser } from '../_shared/polar.ts';
import {
  isAllowedBillingCorsOrigin,
  isBillingRequestOriginAllowed,
  parseBillingAllowedOrigins,
} from '../_shared/billing-urls.ts';
import { tryRateLimit } from '../_shared/rate-limit.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const ALLOWED_ACTIONS = new Set(['LOGIN', 'LOGOUT', 'LOGIN_FAILED', 'TOKEN_REFRESH']);
const MAX_PROVIDER_LEN = 64;
const MAX_UA_LEN = 256;

function loadAllowedOrigins(): string[] {
  return parseBillingAllowedOrigins(Deno.env.get('BILLING_ALLOWED_ORIGINS'));
}

function auditCors(origin: string | null, allowed: string[]): HeadersInit {
  const headers: Record<string, string> = {
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
    Vary: 'Origin',
  };
  if (origin && isAllowedBillingCorsOrigin(origin, allowed)) {
    headers['Access-Control-Allow-Origin'] = origin;
  }
  return headers;
}

function serviceClient() {
  const url = Deno.env.get('SUPABASE_URL');
  const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

Deno.serve(async (req) => {
  const requestId = crypto.randomUUID().slice(0, 8);
  const allowed = loadAllowedOrigins();
  const origin = req.headers.get('Origin');
  const cors = auditCors(origin, allowed);

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

  // Extension: chrome-extension://pinned-id. No Origin (non-browser): OK.
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

  // Abuse guard on the audit endpoint itself — fail open (logging never blocks).
  const rl = await tryRateLimit(`auth-audit:${userOrErr.id}`, 60, 60 * 1000);
  if (!rl.allowed) {
    return new Response(JSON.stringify({ ok: true, dropped: true }), {
      status: 202,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  let body: { action?: unknown; provider?: unknown };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  if (typeof body.action !== 'string' || !ALLOWED_ACTIONS.has(body.action)) {
    return new Response(JSON.stringify({ error: 'Invalid action' }), {
      status: 400,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
  const provider =
    typeof body.provider === 'string' && body.provider.length > 0
      ? body.provider.slice(0, MAX_PROVIDER_LEN)
      : null;

  const admin = serviceClient();
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Audit store unavailable' }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // Server-observed network attribution only — never trust client-supplied IP.
  const cfIp = req.headers.get('cf-connecting-ip');
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  const ip = cfIp || xff || null;
  const userAgent = req.headers.get('user-agent')?.slice(0, MAX_UA_LEN) ?? null;

  const { error } = await admin.from('auth_audit_events').insert({
    user_id: userOrErr.id,
    action: body.action,
    provider,
    ip,
    user_agent: userAgent,
  });

  if (error) {
    // Undefined table (maintainer hasn't run the migration yet) → explicit 503.
    const missingTable =
      error.code === '42P01' || /auth_audit_events.*(does not exist|not exist)/i.test(error.message);
    console.error('auth-audit insert failed', {
      requestId,
      code: error.code,
      message: error.message,
    });
    return new Response(
      JSON.stringify({ error: missingTable ? 'Audit store unavailable' : 'Audit failed' }),
      {
        status: 503,
        headers: { ...cors, 'Content-Type': 'application/json' },
      }
    );
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
});
