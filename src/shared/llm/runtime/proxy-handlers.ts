/**
 * Cloudflare Pages Function handlers for LLM pass-through (ADR-027).
 * No durable key storage; keys only in request hop.
 */

import { createClient } from '@supabase/supabase-js';

import { rowToEntitlement } from '@/shared/billing/entitlement';
import type { BillingEntitlementRow } from '@/shared/billing/types';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';
import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';
import { parseLlmRequest } from './parse-llm-request';
import {
  llmProxyCorsHeaders,
  resolveLlmProxyAllowedOrigins,
} from './proxy-cors';
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

export interface ProxyEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
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
    req.headers.get('x-llm-api-key')
    || req.headers.get('X-Llm-Api-Key')
    || ''
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
  env: ProxyEnv,
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
      'user_id, plan, status, current_period_end, cancel_at_period_end, provider, provider_customer_id',
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

async function readJsonBody(req: Request): Promise<
  | { ok: true; body: Record<string, unknown> }
  | { ok: false; response: Response }
> {
  const cl = req.headers.get('content-length');
  if (cl && Number(cl) > LLM_PROXY_MAX_BODY_BYTES) {
    return { ok: false, response: jsonResponse(413, { error: 'Request body too large' }) };
  }
  const text = await req.text();
  if (text.length > LLM_PROXY_MAX_BODY_BYTES) {
    return { ok: false, response: jsonResponse(413, { error: 'Request body too large' }) };
  }
  try {
    const body = JSON.parse(text) as Record<string, unknown>;
    return { ok: true, body };
  } catch {
    return { ok: false, response: jsonResponse(400, { error: 'Invalid JSON' }) };
  }
}

/**
 * POST /api/llm/stream
 * Headers: Authorization: Bearer <jwt>, X-Llm-Api-Key: <user key>
 * Body: { provider, model?, request }
 */
export async function handleLlmStreamProxy(
  req: Request,
  env: ProxyEnv,
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
      jsonResponse(400, { error: 'Invalid or non-cloud provider (use Ollama direct on client)' }),
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

  let state = rateByUser.get(auth.userId) ?? emptyRateLimitState();
  const { decision, next } = checkAndRecordStreamStart(state);
  rateByUser.set(auth.userId, next);
  if (!decision.ok) {
    const msg =
      decision.reason === 'concurrent'
        ? 'Another stream is already in progress'
        : 'Rate limit exceeded; try again later';
    return withCors(req, env, jsonResponse(429, { error: msg }));
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
    }),
  );
}

/**
 * POST /api/llm/health
 * Headers: Authorization, X-Llm-Api-Key
 * Body: { provider, model? }
 */
export async function handleLlmHealthProxy(
  req: Request,
  env: ProxyEnv,
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
      }),
    );
  }
}

/** Test helper: reset in-memory rate limits. */
export function resetLlmProxyRateLimitsForTests(): void {
  rateByUser.clear();
}
