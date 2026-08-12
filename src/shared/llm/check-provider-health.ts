/**
 * Provider health in browser/popup (ADR-027).
 * Transport: proxy | direct | unavailable (see health-transport).
 * Direct path uses shared providers' healthCheck() — no hand-rolled HTTP.
 */

import type { HealthCheckResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { resolveCloudHealthTransport } from '@/shared/llm/health-transport';
import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';
import { resolveProviderModel } from '@/shared/llm/provider-models';
import { LLM_PROXY_HEALTH_PATH } from '@/shared/llm/runtime/proxy-policy';

interface CheckOptions {
  apiKey?: string;
  apiBase?: string;
  model?: string;
  /** Cloud health via Pages Function when set. */
  accessToken?: string | null;
  /**
   * Extension may set true (host_permissions).
   * Web must omit/false so missing token does not attempt CORS-doomed direct.
   */
  allowDirectCloud?: boolean;
  proxyBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

/**
 * Run a provider health check in a browser context (popup / page).
 */
export async function checkProviderHealthInBrowser(
  provider: ProviderName,
  options: CheckOptions = {},
): Promise<HealthCheckResult> {
  const model = resolveProviderModel(provider, options.model);
  const fetchFn = options.fetchImpl ?? globalThis.fetch.bind(globalThis);

  const transport = resolveCloudHealthTransport({
    provider,
    accessToken: options.accessToken,
    allowDirectCloud: options.allowDirectCloud,
  });

  if (transport === 'proxy') {
    return checkCloudViaProxy(provider, model, options, fetchFn);
  }
  if (transport === 'unavailable') {
    return {
      ok: false,
      model,
      error: 'Sign in required to verify cloud providers on web',
    };
  }

  try {
    const instance = buildProviderFromConfig({
      provider,
      apiKey: options.apiKey,
      apiBase: options.apiBase,
      model,
    });
    return await instance.healthCheck();
  } catch (err) {
    return {
      ok: false,
      model,
      error: (err as Error).message || 'Health check failed',
    };
  }
}

async function checkCloudViaProxy(
  provider: ProviderName,
  model: string,
  options: CheckOptions,
  fetchFn: typeof fetch,
): Promise<HealthCheckResult> {
  const apiKey = options.apiKey?.trim();
  if (!apiKey) return { ok: false, model, error: 'API key required' };
  const token = options.accessToken?.trim();
  if (!token) {
    return { ok: false, model, error: 'Sign in required to verify cloud providers' };
  }

  const base = (options.proxyBaseUrl ?? '').replace(/\/$/, '');
  try {
    const response = await fetchFn(`${base}${LLM_PROXY_HEALTH_PATH}`, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        authorization: `Bearer ${token}`,
        'x-llm-api-key': apiKey,
      },
      body: JSON.stringify({ provider, model }),
    });
    const json = (await response.json().catch(() => ({}))) as HealthCheckResult & {
      error?: string;
    };
    if (typeof json.ok === 'boolean') {
      return {
        ok: json.ok,
        model: json.model || model,
        error: json.error,
      };
    }
    return {
      ok: false,
      model,
      error: json.error || `HTTP ${response.status}`,
    };
  } catch (err) {
    return { ok: false, model, error: (err as Error).message };
  }
}
