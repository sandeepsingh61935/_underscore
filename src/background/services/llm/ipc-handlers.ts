import type { LLMKeyStore } from './llm-key-store';
import { buildProvider, resolveConfiguredProvider, tryGetRegistered } from './llm-provider-factory';
import type { BackgroundPageContentCache } from './page-content-cache';
import type { LLMRegistry } from './llm-registry';

import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { buildMarkedPageContext } from '@/shared/llm/build-page-context';
import { buildHighlightExcerpts } from '@/shared/llm/highlight-excerpts';
import { openRouterModelRequiresKey } from '@/shared/llm/openrouter-models';
import { fetchProviderModels } from '@/shared/llm/model-discovery';
import {
  IPC_AI_CHAT,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_GET_ACTIVE_PROVIDER,
  IPC_AI_LIST_PROVIDERS,
  IPC_AI_LIST_PROVIDER_MODELS,
  IPC_AI_GET_PAGE_CONTEXT,
  createSuccessResponse,
  createErrorResponse,
} from '@/shared/schemas/message-schemas';

interface MessageBusLike {
  subscribe(messageType: string, handler: (payload: unknown) => unknown | Promise<unknown>): () => void;
}

interface RegisterArgs {
  bus: MessageBusLike;
  registry: LLMRegistry;
  keyStore: LLMKeyStore;
  pageContentCache: BackgroundPageContentCache;
}

interface ChatPayload {
  provider?: ProviderName;
  request: LLMRequest;
}

interface HealthPayload {
  provider: ProviderName;
  apiBase?: string;
  model?: string;
}

interface SetKeyPayload {
  provider: ProviderName;
  key?: string;
  model?: string;
  apiBase?: string;
}

interface StatusPayload {
  provider: ProviderName;
}

interface PageContextPayload {
  highlights: Array<{ id?: string; url: string; text: string }>;
}

interface ListModelsPayload {
  provider: ProviderName;
  apiBase?: string;
}

async function isProviderConfigured(keyStore: LLMKeyStore, provider: ProviderName): Promise<boolean> {
  if (provider === 'ollama') return true;
  if (provider === 'openrouter') {
    const model = await keyStore.getModel(provider);
    if (!openRouterModelRequiresKey(model)) return true;
  }
  const key = await keyStore.get(provider);
  return !!key;
}

export function registerAiHandlers({ bus, registry, keyStore, pageContentCache }: RegisterArgs): void {
  bus.subscribe(IPC_AI_LIST_PROVIDERS, () => createSuccessResponse(registry.list()));

  bus.subscribe(IPC_AI_GET_ACTIVE_PROVIDER, async () => {
    try {
      const provider = await keyStore.getActiveProvider();
      return createSuccessResponse({ provider });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_GET_API_KEY_STATUS, async (raw: unknown) => {
    try {
      const { provider } = raw as StatusPayload;
      const model = await keyStore.getModel(provider);
      const configured = await isProviderConfigured(keyStore, provider);
      const apiBase = provider === 'ollama' ? await keyStore.getApiBase('ollama') : undefined;
      return createSuccessResponse({ configured, model, apiBase });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_SET_API_KEY, async (raw: unknown) => {
    try {
      const { provider, key, model, apiBase } = raw as SetKeyPayload;
      const trimmedKey = key?.trim();
      const trimmedModel = model?.trim();
      const trimmedBase = apiBase?.trim();
      if (!trimmedKey && !trimmedModel && !trimmedBase) {
        return createErrorResponse('Provide a model, API key, or endpoint to save');
      }
      if (trimmedKey) await keyStore.set(provider, trimmedKey);
      if (trimmedModel) await keyStore.setModel(provider, trimmedModel);
      if (provider === 'ollama' && trimmedBase) await keyStore.setApiBase('ollama', trimmedBase);
      await keyStore.setActiveProvider(provider);
      if (trimmedKey || provider === 'ollama' || provider === 'openrouter') {
        registry.setConfigured(provider, true);
      }
      return createSuccessResponse({ ok: true as const });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_LIST_PROVIDER_MODELS, async (raw: unknown) => {
    try {
      const { provider, apiBase } = raw as ListModelsPayload;
      const resolvedBase = provider === 'ollama'
        ? (apiBase?.trim() || await keyStore.getApiBase('ollama'))
        : apiBase;
      const storedKey = await keyStore.get(provider);
      const result = await fetchProviderModels(provider, {
        apiKey: storedKey ?? undefined,
        apiBase: resolvedBase,
      });
      if (result.error && result.models.length === 0) {
        return createErrorResponse(result.error);
      }
      return createSuccessResponse({ models: result.models });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_HEALTH_CHECK, async (raw: unknown) => {
    try {
      const { provider, apiBase, model } = raw as HealthPayload;
      const registered = tryGetRegistered(registry, provider);
      const result = registered
        ? await registered.healthCheck()
        : await (await buildProvider(provider, keyStore, apiBase, model)).healthCheck();
      if (!result.ok) {
        return createErrorResponse(result.error ?? 'Health check failed');
      }
      return createSuccessResponse(result);
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_CHAT, async (raw: unknown) => {
    try {
      const { provider, request } = raw as ChatPayload;
      const instance = await resolveConfiguredProvider(registry, keyStore, provider);
      const result = await instance.chat(request);
      return createSuccessResponse(result);
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_GET_PAGE_CONTEXT, async (raw: unknown) => {
    try {
      const { highlights } = raw as PageContextPayload;
      const built = buildMarkedPageContext(
        highlights,
        (url) => {
          const cached = pageContentCache.getByUrl(url);
          if (!cached) return null;
          return {
            url: cached.url,
            title: cached.title,
            text: cached.text,
            truncated: cached.truncated,
          };
        },
      );
      const { excerpts: highlightExcerpts, cacheMissUrls: excerptMisses } = buildHighlightExcerpts(
        highlights.map((h, i) => ({ id: h.id ?? `hl-${i}`, url: h.url, text: h.text })),
        (url) => {
          const cached = pageContentCache.getByUrl(url);
          if (!cached) return null;
          return {
            url: cached.url,
            title: cached.title,
            text: cached.text,
            truncated: cached.truncated,
          };
        },
      );
      const cacheMissUrls = [...new Set([...built.cacheMissUrls, ...excerptMisses])];
      return createSuccessResponse({ ...built, highlightExcerpts, cacheMissUrls });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });
}
