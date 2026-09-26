/**
 * Cloudflare Pages Function handlers for LLM pass-through (ADR-027).
 * No durable key storage; keys only in request hop.
 */

import { createClient } from '@supabase/supabase-js';

import { parseLlmRequest } from './parse-llm-request';
import { llmProxyCorsHeaders, resolveLlmProxyAllowedOrigins } from './proxy-cors';
import {
  LLM_PROXY_MAX_BODY_BYTES,
  LLM_PROXY_MAX_STREAM_MS,
  isCloudLlmProvider,
} from './proxy-policy';
import {
  checkAndRecordStreamStart,
  emptyRateLimitState,
  releaseStream,
  type RateLimitState,
} from './proxy-rate-limit';
import { runProviderStream } from './run-provider-stream';
import { encodeSseEvent } from './sse';

import { rowToEntitlement } from '@/shared/billing/entitlement';
import type { BillingEntitlementRow } from '@/shared/billing/types';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';
import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';

export interface ProxyEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  SUPABASE_SERVICE_ROLE_KEY?: string;
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
  LLM_PROXY_ALLOWED_ORIGINS?: string;
  BILLING_ALLOWED_ORIGINS?: string;
}

/**
 * Soft per-isolate limits (not global across CF isolates). Product must not
 * treat these as hard multi-region guarantees until KV/DO-backed counters.
 */
const rateByUser = new Map<string, RateLimitState>();

function jsonResponse(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
    },
  });
}

function getSupabaseEnv(env: ProxyEnv): { url: string; anonKey: string } | null {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const anonKey = env.SUPABASE_ANON_KEY || env.VITE_SUPABASE_ANON_KEY || '';
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

function bearerToken(req: Request): string | null {
  const h = req.headers.get('authorization') || req.headers.get('Authorization');
  if (!h) return null;
  const m = /^Bearer\s+(.+)$/i.exec(h.trim());
  return m?.[1]?.trim() || null;
}

function apiKeyFromRequest(req: Request): string {
  return (
    req.headers.get('x-llm-api-key') ||
    req.headers.get('X-Llm-Api-Key') ||
    ''
  ).trim();
}

function allowedOrigins(env: ProxyEnv): string[] {
  return resolveLlmProxyAllowedOrigins(env);
}

function withCors(req: Request, env: ProxyEnv, res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(llmProxyCorsHeaders(req, allowedOrigins(env)))) {
    headers.set(k, v);
  }
  return new Response(res.body, { status: res.status, headers });
}

async function requirePaidUser(
  req: Request,
  env: ProxyEnv
): Promise<{ userId: string } | Response> {
  const creds = getSupabaseEnv(env);
  if (!creds) {
    return jsonResponse(500, { error: 'Server misconfigured (Supabase env)' });
  }
  const token = bearerToken(req);
  if (!token) {
    return jsonResponse(401, { error: 'Missing authorization' });
  }

  const supabase = createClient(creds.url, creds.anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const { data: userData, error: userErr } = await supabase.auth.getUser(token);
  if (userErr || !userData.user) {
    return jsonResponse(401, { error: 'Invalid session' });
  }
  const userId = userData.user.id;

  const { data: row, error: entErr } = await supabase
    .from('billing_entitlements')
    .select(
      'user_id, plan, status, current_period_end, cancel_at_period_end, provider, provider_customer_id'
    )
    .eq('user_id', userId)
    .maybeSingle();

  if (entErr) {
    return jsonResponse(503, { error: 'Could not verify entitlement' });
  }

  const entitlement = rowToEntitlement(row as BillingEntitlementRow | null);
  if (!entitlement.isPaidActive) {
    return jsonResponse(403, { error: 'Chat requires an active paid plan' });
  }

  return { userId };
}

function parseProvider(raw: unknown): ProviderName | null {
  if (typeof raw !== 'string' || !isInAppLlmProvider(raw)) return null;
  if (!isCloudLlmProvider(raw)) return null;
  return raw;
}

async function readJsonBody(
  req: Request
): Promise<
  { ok: true; body: Record<string, unknown> } | { ok: false; response: Response }
> {
  const cl = req.headers.get('content-length');
  if (cl && Number(cl) > LLM_PROXY_MAX_BODY_BYTES) {
    return {
      ok: false,
      response: jsonResponse(413, { error: 'Request body too large' }),
    };
  }
  const text = await req.text();
  if (text.length > LLM_PROXY_MAX_BODY_BYTES) {
    return {
      ok: false,
      response: jsonResponse(413, { error: 'Request body too large' }),
    };
  }
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, body };
  } catch {
    return { ok: false, response: jsonResponse(400, { error: 'Invalid JSON' }) };
  }
}

/**
 * Durable per-user quota for LLM streams (backs the per-isolate in-memory
 * limiter so counters survive multi-isolate / cold starts).
 * Reuses the `billing_try_rate_limit` RPC: 200 starts / day + 30 / minute.
 *
 * Fail-open on infrastructure failure: the in-memory limiter below still
 * bounds abuse per isolate, and blocking all paid chat on an RPC hiccup is
 * worse than a burst. Returns 'unavailable' so callers can distinguish.
 */
export const LLM_PROXY_DAILY_MAX = 200;
export const LLM_PROXY_DAILY_WINDOW_MS = 24 * 60 * 60 * 1000;
export const LLM_PROXY_DURABLE_PER_MINUTE = 30;
export const LLM_PROXY_DURABLE_MINUTE_WINDOW_MS = 60 * 1000;

export interface DurableRpc {
  rpc: (
    fn: string,
    args: Record<string, unknown>
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
}

export async function checkDurableLlmQuota(
  admin: DurableRpc,
  userId: string,
  nowMs: number = Date.now()
): Promise<{ ok: true } | { ok: false; reason: 'unavailable' | 'rate_limit' }> {
  const calls: Array<[string, number, number]> = [
    [`llm-proxy-day:${userId}`, LLM_PROXY_DAILY_MAX, LLM_PROXY_DAILY_WINDOW_MS],
    [`llm-proxy-min:${userId}`, LLM_PROXY_DURABLE_PER_MINUTE, LLM_PROXY_DURABLE_MINUTE_WINDOW_MS],
  ];
  try {
    for (const [key, max, windowMs] of calls) {
      const { data, error } = await admin.rpc('billing_try_rate_limit', {
        p_key: key,
        p_max: max,
        p_window_ms: windowMs,
        p_now_ms: nowMs,
      });
      if (error) return { ok: false, reason: 'unavailable' };
      const rec = data as { allowed?: unknown } | null;
      if (!rec || typeof rec !== 'object' || rec.allowed !== true) {
        // Malformed RPC payload fails closed (deny), mirroring billing edge.
        return { ok: false, reason: 'rate_limit' };
      }
    }
    return { ok: true };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
}

function durableAdminClient(env: ProxyEnv): DurableRpc | null {
  const url = env.SUPABASE_URL || env.VITE_SUPABASE_URL || '';
  const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY || '';
  if (!url || !serviceKey) return null;
  const client = createClient(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return { rpc: (fn, args) => client.rpc(fn, args) as unknown as Promise<{ data: unknown; error: { message: string } | null }> };
}
export async function handleLlmStreamProxy(
  req: Request,
  env: ProxyEnv
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: llmProxyCorsHeaders(req, allowedOrigins(env)),
    });
  }
  if (req.method !== 'POST') {
    return withCors(req, env, jsonResponse(405, { error: 'Method not allowed' }));
  }

  const auth = await requirePaidUser(req, env);
  if (auth instanceof Response) {
    return withCors(req, env, auth);
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return withCors(req, env, parsed.response);

  const provider = parseProvider(parsed.body['provider']);
  if (!provider) {
    return withCors(
      req,
      env,
      jsonResponse(400, {
        error: 'Invalid or non-cloud provider (use Ollama direct on client)',
      })
    );
  }

  const apiKey = apiKeyFromRequest(req);
  if (!apiKey) {
    return withCors(req, env, jsonResponse(400, { error: 'Missing X-Llm-Api-Key' }));
  }

  const request = parseLlmRequest(parsed.body['request']);
  if (!request) {
    return withCors(req, env, jsonResponse(400, { error: 'Invalid request payload' }));
  }

  const model =
    typeof parsed.body['model'] === 'string' ? parsed.body['model'] : undefined;

  const state = rateByUser.get(auth.userId) ?? emptyRateLimitState();
  const { decision, next } = checkAndRecordStreamStart(state);
  rateByUser.set(auth.userId, next);
  if (!decision.ok) {
    const msg =
      decision.reason === 'concurrent'
        ? 'Another stream is already in progress'
        : 'Rate limit exceeded; try again later';
    return withCors(req, env, jsonResponse(429, { error: msg }));
  }

  // Durable quota second (only when the service-role key is configured):
  // survives multi-isolate / cold starts. 'unavailable' fails open into the
  // in-memory decision above; over-limit denies and releases the slot.
  const admin = durableAdminClient(env);
  if (admin) {
    const quota = await checkDurableLlmQuota(admin, auth.userId);
    if (!quota.ok && quota.reason === 'rate_limit') {
      rateByUser.set(auth.userId, releaseStream(rateByUser.get(auth.userId) ?? next));
      return withCors(req, env, jsonResponse(429, { error: 'Rate limit exceeded; try again later' }));
    }
  }

  let providerInstance;
  try {
    providerInstance = buildProviderFromConfig({ provider, apiKey, model });
  } catch (err) {
    rateByUser.set(auth.userId, releaseStream(rateByUser.get(auth.userId) ?? next));
    return withCors(req, env, jsonResponse(400, { error: (err as Error).message }));
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), LLM_PROXY_MAX_STREAM_MS);
  let released = false;
  const releaseOnce = (): void => {
    if (released) return;
    released = true;
    clearTimeout(timeout);
    const cur = rateByUser.get(auth.userId) ?? emptyRateLimitState();
    rateByUser.set(auth.userId, releaseStream(cur));
  };

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const push = (event: Parameters<typeof encodeSseEvent>[0]): void => {
        try {
          controller.enqueue(encoder.encode(encodeSseEvent(event)));
        } catch {
          abort.abort();
        }
      };

      try {
        await runProviderStream(providerInstance, request, push, abort.signal);
      } finally {
        releaseOnce();
        try {
          controller.close();
        } catch {
          /* closed */
        }
      }
    },
    cancel() {
      abort.abort();
      releaseOnce();
    },
  });

  return withCors(
    req,
    env,
    new Response(stream, {
      status: 200,
      headers: {
        'content-type': 'text/event-stream; charset=utf-8',
        'cache-control': 'no-store',
        connection: 'keep-alive',
      },
    })
  );
}

/**
 * POST /api/llm/health
 * Headers: Authorization, X-Llm-Api-Key
 * Body: { provider, model? }
 */
export async function handleLlmHealthProxy(
  req: Request,
  env: ProxyEnv
): Promise<Response> {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: llmProxyCorsHeaders(req, allowedOrigins(env)),
    });
  }
  if (req.method !== 'POST') {
    return withCors(req, env, jsonResponse(405, { error: 'Method not allowed' }));
  }

  const auth = await requirePaidUser(req, env);
  if (auth instanceof Response) {
    return withCors(req, env, auth);
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return withCors(req, env, parsed.response);

  const provider = parseProvider(parsed.body['provider']);
  if (!provider) {
    return withCors(req, env, jsonResponse(400, { error: 'Invalid cloud provider' }));
  }

  const apiKey = apiKeyFromRequest(req);
  if (!apiKey) {
    return withCors(req, env, jsonResponse(400, { error: 'Missing X-Llm-Api-Key' }));
  }

  const model =
    typeof parsed.body['model'] === 'string' ? parsed.body['model'] : undefined;

  try {
    const instance = buildProviderFromConfig({ provider, apiKey, model });
    const result = await instance.healthCheck();
    return withCors(req, env, jsonResponse(result.ok ? 200 : 502, result));
  } catch (err) {
    return withCors(
      req,
      env,
      jsonResponse(400, {
        ok: false,
        model: model ?? 'unknown',
        error: (err as Error).message,
      })
    );
  }
}

/** Test helper: reset in-memory rate limits. */
export function resetLlmProxyRateLimitsForTests(): void {
  rateByUser.clear();
}
