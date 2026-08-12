/**
 * Web browser ILlmRuntime (ADR-027).
 * Ollama → direct fetch; cloud → same-origin Pages Function SSE proxy.
 */

import type { LLMRequest, LLMResult, ProviderName } from '@/shared/interfaces/i-llm-service';
import { buildProviderFromConfig } from '@/shared/llm/providers/build-provider-from-config';
import type { ILlmRuntime, LlmStreamArgs } from './i-llm-runtime';
import {
  LLM_PROXY_STREAM_PATH,
  usesWebProxy,
} from './proxy-policy';
import { parseSseBuffer } from './sse';
import type { LlmStreamEvent } from './stream-protocol';

export interface BrowserLlmCredentials {
  apiKey?: string;
  apiBase?: string;
  model?: string;
}

export interface BrowserLlmRuntimeOptions {
  /** Resolve device credentials for a provider (webLlmKeys). */
  getCredentials: (provider: ProviderName) => BrowserLlmCredentials | null;
  /** Active/default provider when args.provider omitted. */
  getDefaultProvider: () => ProviderName | null;
  /** Supabase access token for proxy auth. */
  getAccessToken: () => Promise<string | null>;
  /** Override proxy base (tests). Default: same origin. */
  proxyBaseUrl?: string;
  fetchImpl?: typeof fetch;
}

function resolveProvider(
  args: LlmStreamArgs,
  getDefaultProvider: () => ProviderName | null,
): ProviderName {
  if (args.provider) return args.provider;
  const d = getDefaultProvider();
  if (!d) {
    throw new Error(
      'No model configured. Open Settings → Models & providers and add a provider.',
    );
  }
  return d;
}

async function readProxySse(
  response: Response,
  onEvent: (e: LlmStreamEvent) => void,
): Promise<void> {
  if (!response.body) {
    onEvent({ type: 'ERROR', payload: { message: 'Empty stream response' } });
    return;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let sawTerminal = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parsed = parseSseBuffer(buffer);
    buffer = parsed.rest;
    for (const ev of parsed.events) {
      onEvent(ev);
      if (ev.type === 'DONE' || ev.type === 'ERROR') sawTerminal = true;
    }
  }
  if (buffer.trim()) {
    const parsed = parseSseBuffer(`${buffer}\n\n`);
    for (const ev of parsed.events) {
      onEvent(ev);
      if (ev.type === 'DONE' || ev.type === 'ERROR') sawTerminal = true;
    }
  }
  if (!sawTerminal) {
    onEvent({
      type: 'ERROR',
      payload: { message: 'Stream ended without completion' },
    });
  }
}

export function createBrowserLlmRuntime(options: BrowserLlmRuntimeOptions): ILlmRuntime {
  const fetchFn = options.fetchImpl ?? globalThis.fetch.bind(globalThis);
  const base = (options.proxyBaseUrl ?? '').replace(/\/$/, '');

  return {
    async streamChat(args, onEvent, signal) {
      let provider: ProviderName;
      try {
        provider = resolveProvider(args, options.getDefaultProvider);
      } catch (err) {
        onEvent({ type: 'ERROR', payload: { message: (err as Error).message } });
        return;
      }

      const creds = options.getCredentials(provider);
      if (provider !== 'ollama' && !creds?.apiKey?.trim()) {
        onEvent({
          type: 'ERROR',
          payload: {
            message: `Add your ${provider} API key on this device (Settings → Models & providers).`,
          },
        });
        return;
      }

      try {
        if (!usesWebProxy(provider)) {
          const service = buildProviderFromConfig({
            provider,
            apiKey: creds?.apiKey,
            apiBase: creds?.apiBase,
            model: creds?.model,
          });
          const result = await service.streamChat(
            args.request,
            (chunk) => {
              if (chunk.delta) onEvent({ type: 'CHUNK', payload: { delta: chunk.delta } });
            },
            signal,
          );
          onEvent({ type: 'DONE', payload: result });
          return;
        }

        const token = await options.getAccessToken();
        if (!token) {
          onEvent({
            type: 'ERROR',
            payload: { message: 'Sign in required for cloud model streaming.' },
          });
          return;
        }

        const response = await fetchFn(`${base}${LLM_PROXY_STREAM_PATH}`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            authorization: `Bearer ${token}`,
            'x-llm-api-key': creds?.apiKey?.trim() ?? '',
          },
          body: JSON.stringify({
            provider,
            model: creds?.model,
            request: args.request,
          }),
          signal,
        });

        if (!response.ok) {
          const text = await response.text().catch(() => '');
          let message = `Stream proxy failed (${response.status})`;
          try {
            const j = JSON.parse(text) as { error?: string; message?: string };
            message = j.error ?? j.message ?? message;
          } catch {
            if (text) message = `${message}: ${text.slice(0, 200)}`;
          }
          onEvent({ type: 'ERROR', payload: { message } });
          return;
        }

        await readProxySse(response, onEvent);
      } catch (err) {
        if (signal.aborted) return;
        onEvent({
          type: 'ERROR',
          payload: { message: (err as Error).message || 'Stream failed' },
        });
      }
    },

    async chat(args, signal): Promise<LLMResult> {
      let text = '';
      let result: LLMResult | null = null;
      const controller = signal ?? new AbortController().signal;
      await this.streamChat(
        args,
        (ev) => {
          if (ev.type === 'CHUNK') text += ev.payload.delta;
          if (ev.type === 'DONE') result = ev.payload;
          if (ev.type === 'ERROR') throw new Error(ev.payload.message);
        },
        controller instanceof AbortSignal ? controller : new AbortController().signal,
      );
      if (result) return result;
      return { text, inputTokens: 0, outputTokens: 0, durationMs: 0 };
    },
  };
}

/** Request body shape for /api/llm/stream and /api/llm/health */
export interface LlmProxyStreamBody {
  provider: ProviderName;
  model?: string;
  request: LLMRequest;
}

export interface LlmProxyHealthBody {
  provider: ProviderName;
  model?: string;
}
