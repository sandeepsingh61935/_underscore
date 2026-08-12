/**
 * Cloudflare Pages Function handlers for LLM pass-through (ADR-027).
 * No durable key storage; keys only in request hop.
 */

import { createClient } from '@supabase/supabase-js';

import { rowToEntitlement } from '@/shared/billing/entitlement';
import type { BillingEntitlementRow } from '@/shared/billing/types';
import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';
import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';
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
import { encodeSseEvent } from './sse';

export interface ProxyEnv {
  SUPABASE_URL?: string;
  SUPABASE_ANON_KEY?: string;
  /** Fallback names used by some Pages setups */
  VITE_SUPABASE_URL?: string;
  VITE_SUPABASE_ANON_KEY?: string;
}

/** Module-level rate map (per isolate). */
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

function isLlmRequest(value: unknown): value is LLMRequest {
  if (!value || typeof value !== 'object') return false;
  const v = value as LLMRequest;
  return (
    typeof v.systemPrompt === 'string'
    && Array.isArray(v.messages)
    && typeof v.maxTokens === 'number'
  );
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
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = await requirePaidUser(req, env);
  if (auth instanceof Response) {
    return withCors(req, auth);
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return withCors(req, parsed.response);

  const provider = parseProvider(parsed.body['provider']);
  if (!provider) {
    return withCors(
      req,
      jsonResponse(400, { error: 'Invalid or non-cloud provider (use Ollama direct on client)' }),
    );
  }

  const apiKey = apiKeyFromRequest(req);
  if (!apiKey) {
    return withCors(req, jsonResponse(400, { error: 'Missing X-Llm-Api-Key' }));
  }

  const request = parsed.body['request'];
  if (!isLlmRequest(request)) {
    return withCors(req, jsonResponse(400, { error: 'Invalid request payload' }));
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
    return withCors(req, jsonResponse(429, { error: msg }));
  }

  let providerInstance;
  try {
    providerInstance = buildProviderFromConfig({ provider, apiKey, model });
  } catch (err) {
    rateByUser.set(auth.userId, releaseStream(rateByUser.get(auth.userId) ?? next));
    return withCors(req, jsonResponse(400, { error: (err as Error).message }));
  }

  const encoder = new TextEncoder();
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), LLM_PROXY_MAX_STREAM_MS);

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
        const result = await providerInstance.streamChat(
          request,
          (chunk) => {
            if (chunk.delta) push({ type: 'CHUNK', payload: { delta: chunk.delta } });
          },
          abort.signal,
        );
        push({ type: 'DONE', payload: result });
      } catch (err) {
        if (!abort.signal.aborted) {
          push({
            type: 'ERROR',
            payload: {
              message: `[${provider}] ${(err as Error).message || 'stream failed'}`,
            },
          });
        }
      } finally {
        clearTimeout(timeout);
        const cur = rateByUser.get(auth.userId) ?? emptyRateLimitState();
        rateByUser.set(auth.userId, releaseStream(cur));
        try {
          controller.close();
        } catch {
          /* closed */
        }
      }
    },
    cancel() {
      abort.abort();
      clearTimeout(timeout);
      const cur = rateByUser.get(auth.userId) ?? emptyRateLimitState();
      rateByUser.set(auth.userId, releaseStream(cur));
    },
  });

  return withCors(
    req,
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
    return new Response(null, { status: 204, headers: corsHeaders(req) });
  }
  if (req.method !== 'POST') {
    return jsonResponse(405, { error: 'Method not allowed' });
  }

  const auth = await requirePaidUser(req, env);
  if (auth instanceof Response) {
    return withCors(req, auth);
  }

  const parsed = await readJsonBody(req);
  if (!parsed.ok) return withCors(req, parsed.response);

  const provider = parseProvider(parsed.body['provider']);
  if (!provider) {
    return withCors(req, jsonResponse(400, { error: 'Invalid cloud provider' }));
  }

  const apiKey = apiKeyFromRequest(req);
  if (!apiKey) {
    return withCors(req, jsonResponse(400, { error: 'Missing X-Llm-Api-Key' }));
  }

  const model =
    typeof parsed.body['model'] === 'string' ? parsed.body['model'] : undefined;

  try {
    const instance = buildProviderFromConfig({ provider, apiKey, model });
    const result = await instance.healthCheck();
    return withCors(req, jsonResponse(result.ok ? 200 : 502, result));
  } catch (err) {
    return withCors(
      req,
      jsonResponse(400, {
        ok: false,
        model: model ?? 'unknown',
        error: (err as Error).message,
      }),
    );
  }
}

function corsHeaders(req: Request): HeadersInit {
  const origin = req.headers.get('Origin') || '*';
  return {
    'access-control-allow-origin': origin,
    'access-control-allow-headers':
      'authorization, content-type, x-llm-api-key',
    'access-control-allow-methods': 'POST, OPTIONS',
    vary: 'Origin',
  };
}

function withCors(req: Request, res: Response): Response {
  const headers = new Headers(res.headers);
  const extra = corsHeaders(req);
  for (const [k, v] of Object.entries(extra)) {
    headers.set(k, v as string);
  }
  return new Response(res.body, { status: res.status, headers });
}

/** Test helper: reset in-memory rate limits. */
export function resetLlmProxyRateLimitsForTests(): void {
  rateByUser.clear();
}
