import type { HealthCheckResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { resolveCloudHealthTransport } from '@/shared/llm/health-transport';
import { resolveProviderModel } from '@/shared/llm/provider-models';
import { LLM_PROXY_HEALTH_PATH } from '@/shared/llm/runtime/proxy-policy';

interface CheckOptions {
  apiKey?: string;
  apiBase?: string;
  model?: string;
  /**
   * When set, cloud health goes through the Pages Function (web + ADR-027).
   */
  accessToken?: string | null;
  /**
   * Extension may set true to call cloud providers via host_permissions.
   * Web must omit/false so missing token returns a clear error.
   */
  allowDirectCloud?: boolean;
  /** Override proxy path base (tests). */
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

  switch (provider) {
    case 'gemini': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      const apiBase = options.apiBase ?? 'https://generativelanguage.googleapis.com/v1beta';
      const url = `${apiBase}/models/${model}?key=${encodeURIComponent(apiKey)}`;
      return fetchHealth(url, model, undefined, fetchFn);
    }
    case 'anthropic': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      const apiBase = options.apiBase ?? 'https://api.anthropic.com/v1';
      const url = `${apiBase}/messages`;
      return fetchHealth(url, model, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'x-api-key': apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }, fetchFn);
    }
    case 'openai': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      const apiBase = options.apiBase ?? 'https://api.openai.com/v1';
      const url = `${apiBase}/chat/completions`;
      return fetchHealth(url, model, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }, fetchFn);
    }
    case 'xai': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      const apiBase = options.apiBase ?? 'https://api.x.ai/v1';
      const url = `${apiBase}/chat/completions`;
      return fetchHealth(url, model, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }, fetchFn);
    }
    case 'openrouter': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) {
        return {
          ok: false,
          model,
          error: 'OpenRouter API key required (free at openrouter.ai/keys). Free models do not charge credits.',
        };
      }
      const apiBase = options.apiBase ?? 'https://openrouter.ai/api/v1';
      const url = `${apiBase}/chat/completions`;
      return fetchHealth(url, model, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'HTTP-Referer': 'https://underscore.app',
          'X-Title': 'Underscore Highlighter',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      }, fetchFn);
    }
    case 'ollama': {
      const apiBase = options.apiBase ?? 'http://localhost:11434';
      const url = `${apiBase.replace(/\/$/, '')}/api/tags`;
      return checkOllamaModelInstalled(url, model, fetchFn);
    }
    default: {
      const exhaustive: never = provider;
      return { ok: false, model: 'unknown', error: `Unknown provider: ${String(exhaustive)}` };
    }
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
  if (!token) return { ok: false, model, error: 'Sign in required to verify cloud providers' };

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

async function checkOllamaModelInstalled(
  tagsUrl: string,
  model: string,
  fetchFn: typeof fetch = fetch,
): Promise<HealthCheckResult> {
  try {
    const response = await fetchFn(tagsUrl);
    if (!response.ok) return { ok: false, model, error: `HTTP ${response.status}` };
    const json = await response.json() as { models?: Array<{ name: string }> };
    const names = (json.models ?? []).map(m => m.name);
    if (names.length === 0) {
      return { ok: false, model, error: 'No models installed — run ollama pull <model>' };
    }
    if (!names.includes(model)) {
      return { ok: false, model, error: `Model not installed — run ollama pull ${model}` };
    }
    return { ok: true, model };
  } catch (err) {
    return { ok: false, model, error: (err as Error).message };
  }
}

async function fetchHealth(
  url: string,
  model: string,
  init: RequestInit = { method: 'GET' },
  fetchFn: typeof fetch = fetch,
): Promise<HealthCheckResult> {
  try {
    const response = await fetchFn(url, init);
    if (response.ok) return { ok: true, model };
    const errorText = await response.text().catch(() => '');
    const detail = errorText ? `: ${errorText.slice(0, 200)}` : '';
    return { ok: false, model, error: `HTTP ${response.status}${detail}` };
  } catch (err) {
    return { ok: false, model, error: (err as Error).message };
  }
}
