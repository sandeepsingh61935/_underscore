import type { HealthCheckResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { resolveProviderModel } from '@/shared/llm/provider-models';
import { openRouterModelRequiresKey } from '@/shared/llm/openrouter-models';

interface CheckOptions {
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

/**
 * Run a provider health check in a browser context (popup / page).
 */
export async function checkProviderHealthInBrowser(
  provider: ProviderName,
  options: CheckOptions = {},
): Promise<HealthCheckResult> {
  const model = resolveProviderModel(provider, options.model);

  switch (provider) {
    case 'gemini': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      const apiBase = options.apiBase ?? 'https://generativelanguage.googleapis.com/v1beta';
      const url = `${apiBase}/models/${model}?key=${encodeURIComponent(apiKey)}`;
      return fetchHealth(url, model);
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
      });
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
      });
    }
    case 'cursor': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      const url = 'https://api.cursor.com/v1/models';
      return fetchHealth(url, model, {
        headers: { authorization: `Basic ${btoa(`${apiKey}:`)}` },
      });
    }
    case 'openrouter': {
      const needsKey = openRouterModelRequiresKey(model);
      const apiKey = options.apiKey?.trim();
      if (needsKey && !apiKey) return { ok: false, model, error: 'API key required for paid models' };
      const apiBase = options.apiBase ?? 'https://openrouter.ai/api/v1';
      const url = `${apiBase}/chat/completions`;
      const headers: Record<string, string> = {
        'content-type': 'application/json',
        'HTTP-Referer': 'https://underscore.app',
        'X-Title': 'Underscore Highlighter',
      };
      if (apiKey) headers['authorization'] = `Bearer ${apiKey}`;
      return fetchHealth(url, model, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'ping' }],
        }),
      });
    }
    case 'minimax': {
      const apiKey = options.apiKey?.trim();
      if (!apiKey) return { ok: false, model, error: 'API key required' };
      return { ok: true, model };
    }
    case 'ollama': {
      const apiBase = options.apiBase ?? 'http://localhost:11434';
      const url = `${apiBase.replace(/\/$/, '')}/api/tags`;
      return fetchHealth(url, model);
    }
    default: {
      const exhaustive: never = provider;
      return { ok: false, model: 'unknown', error: `Unknown provider: ${String(exhaustive)}` };
    }
  }
}

async function fetchHealth(
  url: string,
  model: string,
  init: RequestInit = { method: 'GET' },
): Promise<HealthCheckResult> {
  try {
    const response = await fetch(url, init);
    if (response.ok) return { ok: true, model };
    const errorText = await response.text().catch(() => '');
    const detail = errorText ? `: ${errorText.slice(0, 200)}` : '';
    return { ok: false, model, error: `HTTP ${response.status}${detail}` };
  } catch (err) {
    return { ok: false, model, error: (err as Error).message };
  }
}
