import type { LLMKeyStore } from './llm-key-store';
import type { LlmKeyStoreHolder } from './llm-key-store-holder';
import { buildProvider, resolveConfiguredProvider, tryGetRegistered } from './llm-provider-factory';
import type { BackgroundPageContentCache } from './page-content-cache';
import type { LLMRegistry } from './llm-registry';
import {
  pushExtensionAiPreferences,
  syncExtensionAiPreferences,
} from './ai-prefs-sync';

import type { SupabaseClient } from '@supabase/supabase-js';
import type { LLMRequest, ProviderName } from '@/shared/interfaces/i-llm-service';
import { buildMarkedPageContext } from '@/shared/llm/build-page-context';
import { buildHighlightExcerpts } from '@/shared/llm/highlight-excerpts';
import { fetchProviderModels } from '@/shared/llm/model-discovery';
import {
  IPC_AI_CHAT,
  IPC_AI_HEALTH_CHECK,
  IPC_AI_SET_API_KEY,
  IPC_AI_GET_API_KEY_STATUS,
  IPC_AI_GET_ACTIVE_PROVIDER,
  IPC_AI_SET_ACTIVE_PROVIDER,
  IPC_AI_LIST_PROVIDERS,
  IPC_AI_LIST_PROVIDER_MODELS,
  IPC_AI_GET_PAGE_CONTEXT,
  IPC_AI_SYNC_PREFS,
  createSuccessResponse,
  createErrorResponse,
} from '@/shared/schemas/message-schemas';
import { isInAppLlmProvider } from '@/shared/llm/in-app-providers';
import { canConfigureAiProviders, canUseFeature, type FeatureGateContext } from '@/shared/utils/mode-capabilities';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';

interface MessageBusLike {
  subscribe(messageType: string, handler: (payload: unknown) => unknown | Promise<unknown>): () => void;
}

interface RegisterArgs {
  bus: MessageBusLike;
  registry: LLMRegistry;
  keyStore?: LLMKeyStore;
  keyStoreHolder?: LlmKeyStoreHolder;
  pageContentCache: BackgroundPageContentCache;
  resolveAiGateContext?: () => Promise<FeatureGateContext>;
  /** When set, account prefs sync is available (signed-in Supabase session). */
  getSupabase?: () => SupabaseClient | null;
  getUserId?: () => Promise<string | null>;
}

function resolveKeyStore(args: RegisterArgs): LLMKeyStore {
  if (args.keyStore) return args.keyStore;
  if (args.keyStoreHolder) return args.keyStoreHolder.get();
  throw new Error('registerAiHandlers requires keyStore or keyStoreHolder');
}

async function denyIfAiSetupGated(
  args: RegisterArgs,
): Promise<ReturnType<typeof createErrorResponse> | null> {
  if (!args.resolveAiGateContext) return null;
  const ctx = await args.resolveAiGateContext();
  const gate = canConfigureAiProviders(ctx);
  if (!gate.allowed) {
    return createErrorResponse(featureGateSubtitle(gate.reason));
  }
  return null;
}

async function denyIfAiGated(
  args: RegisterArgs,
): Promise<ReturnType<typeof createErrorResponse> | null> {
  if (!args.resolveAiGateContext) return null;
  const ctx = await args.resolveAiGateContext();
  const gate = canUseFeature('ai', ctx);
  if (!gate.allowed) {
    return createErrorResponse(featureGateSubtitle(gate.reason));
  }
  return null;
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
  /** When true, remove stored key for this provider (local only). */
  clearKey?: boolean;
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

async function isProviderConfigured(store: LLMKeyStore, provider: ProviderName): Promise<boolean> {
  if (provider === 'ollama') return store.getOllamaVerified();
  // OpenRouter free models still need an API key (auth ≠ billing).
  const key = await store.get(provider);
  return !!key;
}

export function registerAiHandlers(args: RegisterArgs): void {
  const { bus, registry, pageContentCache } = args;
  const keyStore = () => resolveKeyStore(args);

  const pushPrefsOrdered = async (): Promise<void> => {
    const supabase = args.getSupabase?.() ?? null;
    if (!supabase) return;
    const userId = (await args.getUserId?.()) ?? null;
    if (!userId) return;
    try {
      await pushExtensionAiPreferences(supabase, userId, keyStore());
    } catch {
      // Offline / migration pending — local store remains source of truth.
      // eslint-disable-next-line no-console -- intentional once-per-fail ops signal
      console.warn('[ai_prefs_sync_failed] extension push');
    }
  };

  bus.subscribe(IPC_AI_LIST_PROVIDERS, () => createSuccessResponse(registry.list()));

  bus.subscribe(IPC_AI_SYNC_PREFS, async () => {
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const supabase = args.getSupabase?.() ?? null;
      const userId = (await args.getUserId?.()) ?? null;
      if (!supabase || !userId) {
        return createSuccessResponse({
          source: 'empty' as const,
          wroteRemote: false,
          synced: false,
        });
      }
      const result = await syncExtensionAiPreferences(supabase, userId, keyStore());
      return createSuccessResponse({
        source: result.source,
        wroteRemote: result.wroteRemote,
        synced: true,
        defaultProvider: result.prefs.defaultProvider,
      });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_GET_ACTIVE_PROVIDER, async () => {
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const provider = await keyStore().getActiveProvider();
      return createSuccessResponse({ provider });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_SET_ACTIVE_PROVIDER, async (raw: unknown) => {
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const { provider } = raw as StatusPayload;
      if (!isInAppLlmProvider(provider)) {
        return createErrorResponse('Unknown in-app LLM provider');
      }
      const store = keyStore();
      const configured = await isProviderConfigured(store, provider);
      if (!configured) {
        return createErrorResponse('Provider is not configured on this device');
      }
      await store.setActiveProvider(provider);
      await pushPrefsOrdered();
      return createSuccessResponse({ ok: true as const, provider });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_GET_API_KEY_STATUS, async (raw: unknown) => {
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const { provider } = raw as StatusPayload;
      const store = keyStore();
      const model = await store.getModel(provider);
      const configured = await isProviderConfigured(store, provider);
      const apiBase = provider === 'ollama' ? await store.getApiBase('ollama') : undefined;
      return createSuccessResponse({ configured, model, apiBase });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_SET_API_KEY, async (raw: unknown) => {
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const { provider, key, model, apiBase, clearKey } = raw as SetKeyPayload;
      if (!isInAppLlmProvider(provider)) {
        return createErrorResponse('Unknown in-app LLM provider');
      }
      const store = keyStore();

      if (clearKey) {
        if (provider === 'ollama') {
          await store.setOllamaVerified(false);
        } else {
          await store.clear(provider);
        }
        registry.setConfigured(provider, false);
        await pushPrefsOrdered();
        return createSuccessResponse({ ok: true as const });
      }

      const trimmedKey = key?.trim();
      const trimmedModel = model?.trim();
      const trimmedBase = apiBase?.trim();
      if (!trimmedKey && !trimmedModel && !trimmedBase) {
        return createErrorResponse('Provide a model, API key, or endpoint to save');
      }
      if (trimmedKey) await store.set(provider, trimmedKey);
      if (trimmedModel) await store.setModel(provider, trimmedModel);
      if (provider === 'ollama') {
        if (trimmedBase) await store.setApiBase('ollama', trimmedBase);
        // The UI only reaches save after a successful connect+model check, so this write is truthful.
        await store.setOllamaVerified(true);
      }
      await store.setActiveProvider(provider);
      if (trimmedKey || provider === 'ollama' || provider === 'openrouter') {
        registry.setConfigured(provider, true);
      }
      await pushPrefsOrdered();
      return createSuccessResponse({ ok: true as const });
    } catch (err) {
      return createErrorResponse((err as Error).message);
    }
  });

  bus.subscribe(IPC_AI_LIST_PROVIDER_MODELS, async (raw: unknown) => {
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const { provider, apiBase } = raw as ListModelsPayload;
      const store = keyStore();
      const resolvedBase = provider === 'ollama'
        ? (apiBase?.trim() || await store.getApiBase('ollama'))
        : apiBase;
      const storedKey = await store.get(provider);
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
    const denied = await denyIfAiSetupGated(args);
    if (denied) return denied;
    try {
      const { provider, apiBase, model } = raw as HealthPayload;
      const registered = tryGetRegistered(registry, provider);
      // A registered instance may hold a stale model/apiBase; when the UI
      // passes a draft value, rebuild against it so verify tests what the
      // user actually selected rather than the last-saved config.
      const result = registered && apiBase === undefined && model === undefined
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
    const denied = await denyIfAiGated(args);
    if (denied) return denied;
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
    const denied = await denyIfAiGated(args);
    if (denied) return denied;
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
