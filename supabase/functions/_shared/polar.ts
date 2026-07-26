/** Shared Polar + entitlement helpers for Supabase Edge Functions (Deno). */

export type BillingPlan = 'free' | 'paid';
export type BillingStatus =
  | 'none'
  | 'trialing'
  | 'active'
  | 'past_due'
  | 'canceled'
  | 'unpaid';

export function polarApiBase(): string {
  const server = (Deno.env.get('POLAR_SERVER') ?? 'production').toLowerCase();
  return server === 'sandbox'
    ? 'https://sandbox-api.polar.sh'
    : 'https://api.polar.sh';
}

export function polarAccessToken(): string {
  const token = Deno.env.get('POLAR_ACCESS_TOKEN');
  if (!token) throw new Error('POLAR_ACCESS_TOKEN is not configured');
  return token;
}

export function polarProductId(): string {
  const id = Deno.env.get('POLAR_PRODUCT_ID');
  if (!id) throw new Error('POLAR_PRODUCT_ID is not configured');
  return id;
}

export async function polarFetch(
  path: string,
  init: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${polarAccessToken()}`);
  headers.set('Content-Type', 'application/json');
  return fetch(`${polarApiBase()}${path}`, { ...init, headers });
}

export function mapPolarSubscriptionStatus(
  polarStatus: string | null | undefined
): BillingStatus {
  switch ((polarStatus ?? '').toLowerCase()) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
      return 'past_due';
    case 'canceled':
    case 'cancelled':
      return 'canceled';
    case 'unpaid':
    case 'incomplete':
    case 'incomplete_expired':
      return 'unpaid';
    default:
      return 'none';
  }
}

export function planFromPolarStatus(status: BillingStatus): BillingPlan {
  if (status === 'active' || status === 'trialing' || status === 'past_due') {
    return 'paid';
  }
  return 'free';
}

export function entitlementUpsertFromPolarSubscription(input: {
  userId: string;
  polarStatus: string;
  polarCustomerId?: string | null;
  polarSubscriptionId?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd?: boolean | null;
}) {
  const status = mapPolarSubscriptionStatus(input.polarStatus);
  const plan = planFromPolarStatus(status);
  return {
    user_id: input.userId,
    plan,
    status,
    provider: 'polar' as const,
    provider_customer_id: input.polarCustomerId ?? null,
    provider_subscription_id: input.polarSubscriptionId ?? null,
    current_period_end: input.currentPeriodEnd ?? null,
    cancel_at_period_end: Boolean(input.cancelAtPeriodEnd),
    raw_status: input.polarStatus,
    updated_at: new Date().toISOString(),
  };
}

export function extractPolarEntitlementSource(event: {
  type?: string;
  data?: Record<string, unknown> | null;
}): {
  userId: string;
  polarStatus: string;
  polarCustomerId: string | null;
  polarSubscriptionId: string | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
} | null {
  const data = event.data;
  if (!data || typeof data !== 'object') return null;
  const type = event.type ?? '';

  if (type.startsWith('subscription.') || type.startsWith('order.')) {
    return parseSubscriptionLike(data);
  }

  if (type === 'customer.state_changed' || type === 'customer.updated') {
    const customer = data;
    const externalId = resolveUserIdFromPayload(customer);
    const activeSubs = Array.isArray(customer['active_subscriptions'])
      ? (customer['active_subscriptions'] as Record<string, unknown>[])
      : [];

    if (activeSubs.length > 0) {
      const sub = activeSubs[0]!;
      const parsed = parseSubscriptionLike(sub);
      if (parsed) return parsed;
      if (externalId) {
        return {
          userId: externalId,
          polarStatus: String(sub['status'] ?? 'active'),
          polarCustomerId:
            typeof customer['id'] === 'string' ? customer['id'] : null,
          polarSubscriptionId:
            typeof sub['id'] === 'string' ? sub['id'] : null,
          currentPeriodEnd:
            typeof sub['current_period_end'] === 'string'
              ? sub['current_period_end']
              : null,
          cancelAtPeriodEnd: Boolean(sub['cancel_at_period_end']),
        };
      }
    }

    if (externalId) {
      return {
        userId: externalId,
        polarStatus: 'canceled',
        polarCustomerId:
          typeof customer['id'] === 'string' ? customer['id'] : null,
        polarSubscriptionId: null,
        currentPeriodEnd: null,
        cancelAtPeriodEnd: false,
      };
    }
  }

  return null;
}

/** Resolve Supabase user id from Polar payload (external_id / metadata). */
function resolveUserIdFromPayload(
  data: Record<string, unknown>
): string | null {
  const asStr = (v: unknown): string | null =>
    typeof v === 'string' && v.trim() ? v.trim() : null;

  // Nested customer object
  const customer = data['customer'];
  if (customer && typeof customer === 'object') {
    const c = customer as Record<string, unknown>;
    const fromCustomer =
      asStr(c['external_id']) ??
      asStr((c['metadata'] as Record<string, unknown> | undefined)?.['user_id']);
    if (fromCustomer) return fromCustomer;
  }

  // Direct fields on subscription / order
  const direct =
    asStr(data['customer_external_id']) ??
    asStr(data['external_customer_id']) ??
    asStr(data['external_id']);
  if (direct) return direct;

  // Checkout/subscription metadata we set at checkout
  const meta = data['metadata'];
  if (meta && typeof meta === 'object') {
    const m = meta as Record<string, unknown>;
    const fromMeta = asStr(m['user_id']) ?? asStr(m['external_customer_id']);
    if (fromMeta) return fromMeta;
  }

  const customerMeta = data['customer_metadata'];
  if (customerMeta && typeof customerMeta === 'object') {
    const m = customerMeta as Record<string, unknown>;
    const fromCm = asStr(m['user_id']);
    if (fromCm) return fromCm;
  }

  return null;
}

function parseSubscriptionLike(data: Record<string, unknown>) {
  const userId = resolveUserIdFromPayload(data);
  if (!userId) return null;

  const customer = (data['customer'] ?? null) as Record<string, unknown> | null;
  const polarCustomerId =
    (customer && typeof customer['id'] === 'string' ? customer['id'] : null) ??
    (typeof data['customer_id'] === 'string' ? data['customer_id'] : null);

  // period end may be ISO string or null
  let currentPeriodEnd: string | null = null;
  const cpe = data['current_period_end'];
  if (typeof cpe === 'string') currentPeriodEnd = cpe;
  else if (typeof cpe === 'number') {
    currentPeriodEnd = new Date(cpe * (cpe < 1e12 ? 1000 : 1)).toISOString();
  }

  return {
    userId,
    polarStatus: String(data['status'] ?? 'none'),
    polarCustomerId,
    polarSubscriptionId: typeof data['id'] === 'string' ? data['id'] : null,
    currentPeriodEnd,
    cancelAtPeriodEnd: Boolean(data['cancel_at_period_end']),
  };
}

/** Standard Webhooks verification (Polar). Secret may include whsec_ prefix. */
export async function verifyPolarWebhook(
  body: string,
  headers: Headers,
  secret: string
): Promise<boolean> {
  const msgId = headers.get('webhook-id');
  const timestamp = headers.get('webhook-timestamp');
  const signatureHeader = headers.get('webhook-signature');
  if (!msgId || !timestamp || !signatureHeader) return false;

  // Reject stale timestamps (>5 min)
  const ts = Number(timestamp);
  if (!Number.isFinite(ts) || Math.abs(Date.now() / 1000 - ts) > 300) {
    return false;
  }

  let keyBytes: Uint8Array;
  const raw = secret.startsWith('whsec_') ? secret.slice(6) : secret;
  try {
    keyBytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
  } catch {
    // Plain secret fallback
    keyBytes = new TextEncoder().encode(secret);
  }

  const signedContent = `${msgId}.${timestamp}.${body}`;
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(signedContent)
  );
  const expected = btoa(String.fromCharCode(...new Uint8Array(sig)));

  // header format: "v1,base64sig v1,other"
  const parts = signatureHeader.split(' ');
  for (const part of parts) {
    const [ver, sigB64] = part.split(',');
    if (ver === 'v1' && sigB64 && timingSafeEqual(sigB64, expected)) {
      return true;
    }
  }
  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) {
    out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return out === 0;
}

export function corsHeaders(origin?: string | null): HeadersInit {
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Headers':
      'authorization, x-client-info, apikey, content-type, webhook-id, webhook-timestamp, webhook-signature',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

export async function requireUser(
  req: Request
): Promise<{ id: string; email?: string } | Response> {
  const auth = req.headers.get('Authorization');
  if (!auth?.startsWith('Bearer ')) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const token = auth.slice(7);
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!supabaseUrl || !anonKey) {
    return new Response(JSON.stringify({ error: 'Server misconfigured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const { createClient } = await import(
    'https://esm.sh/@supabase/supabase-js@2.49.1'
  );
  const client = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await client.auth.getUser(token);
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  return { id: data.user.id, email: data.user.email };
}
