import type { HealthCheckResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { resolveProviderModel } from '@/shared/llm/provider-models';

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
    case 'openrouter': {
      // Free models still need a key — OpenRouter API has no keyless chat path.
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
      });
    }
    case 'ollama': {
      const apiBase = options.apiBase ?? 'http://localhost:11434';
      const url = `${apiBase.replace(/\/$/, '')}/api/tags`;
      return checkOllamaModelInstalled(url, model);
    }
    default: {
      const exhaustive: never = provider;
      return { ok: false, model: 'unknown', error: `Unknown provider: ${String(exhaustive)}` };
    }
  }
}

/** Ollama has no auth failure mode — the real signal is whether the selected model is installed. */
async function checkOllamaModelInstalled(tagsUrl: string, model: string): Promise<HealthCheckResult> {
  try {
    const response = await fetch(tagsUrl);
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
