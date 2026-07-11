import type { LLMKeyStore } from './llm-key-store';
import type { LlmKeyStoreHolder } from './llm-key-store-holder';
import { buildProvider, resolveConfiguredProvider, tryGetRegistered } from './llm-provider-factory';
import type { BackgroundPageContentCache } from './page-content-cache';
import type { LLMRegistry } from './llm-registry';

import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { buildMarkedPageContext } from '@/shared/llm/build-page-context';
import { buildHighlightExcerpts } from '@/shared/llm/highlight-excerpts';
import {
  IPC_AI_CHAT,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_GET_ACTIVE_PROVIDER,
  IPC_AI_LIST_PROVIDERS,
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
  keyStore?: LLMKeyStore;
  keyStoreHolder?: LlmKeyStoreHolder;
  pageContentCache: BackgroundPageContentCache;
}

function resolveKeyStore(args: RegisterArgs): LLMKeyStore {
  if (args.keyStore) return args.keyStore;
  if (args.keyStoreHolder) return args.keyStoreHolder.get();
  throw new Error('registerAiHandlers requires keyStore or keyStoreHolder');
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
}

interface StatusPayload {
  provider: ProviderName;
}

interface PageContextPayload {
  highlights: Array<{ id?: string; url: string; text: string }>;
}

/** Providers that don't require an API key. */
const KEYLESS_PROVIDERS: ReadonlyArray<ProviderName> = ['ollama'];

export function registerAiHandlers(args: RegisterArgs): void {
  const { bus, registry, pageContentCache } = args;
  const keyStore = () => resolveKeyStore(args);

  bus.subscribe(IPC_AI_LIST_PROVIDERS, () => createSuccessResponse(registry.list()));

  bus.subscribe(IPC_AI_GET_ACTIVE_PROVIDER, async () => {
    try {
      const provider = await keyStore().getActiveProvider();
      return createSuccessResponse({ provider });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_GET_API_KEY_STATUS, async (raw: unknown) => {
    try {
      const { provider } = raw as StatusPayload;
      const model = await keyStore().getModel(provider);
      if (KEYLESS_PROVIDERS.includes(provider)) {
        return createSuccessResponse({ configured: true, model });
      }
      const key = await keyStore().get(provider);
      return createSuccessResponse({ configured: !!key, model });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_SET_API_KEY, async (raw: unknown) => {
    try {
      const { provider, key, model } = raw as SetKeyPayload;
      const trimmedKey = key?.trim();
      const trimmedModel = model?.trim();
      if (!trimmedKey && !trimmedModel) {
        return createErrorResponse('Provide an API key and/or model to save');
      }
      if (trimmedKey) await keyStore().set(provider, trimmedKey);
      if (trimmedModel) await keyStore().setModel(provider, trimmedModel);
      await keyStore().setActiveProvider(provider);
      if (trimmedKey) registry.setConfigured(provider, true);
      return createSuccessResponse({ ok: true as const });
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
        : await (await buildProvider(provider, keyStore(), apiBase, model)).healthCheck();
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
      const instance = await resolveConfiguredProvider(registry, keyStore(), provider);
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
