/**
 * In-app model catalog presentation.
 * Live lists replace the snapshot; they are not merged.
 */

import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import {
  getProviderModels,
  type ProviderModelOption,
} from '@/shared/llm/provider-models';

export type CatalogDiscovery =
  | { status: 'unknown' }
  | { status: 'unavailable'; error?: string }
  | { status: 'live'; models: readonly ProviderModelOption[] }
  | { status: 'empty'; error?: string };

export type PresentedCatalog = {
  models: ProviderModelOption[];
  error: string | null;
  source: 'live' | 'snapshot' | 'empty';
};

export function presentCatalog(
  provider: ProviderName,
  discovery: CatalogDiscovery
): PresentedCatalog {
  if (discovery.status === 'live' && discovery.models.length > 0) {
    return { models: [...discovery.models], error: null, source: 'live' };
  }

  if (discovery.status === 'empty') {
    if (provider === 'openrouter') {
      return {
        models: [...getProviderModels(provider)],
        error: null,
        source: 'snapshot',
      };
    }
    return { models: [], error: discovery.error ?? null, source: 'empty' };
  }

  if (discovery.status === 'live' && provider === 'openrouter') {
    return { models: [...getProviderModels(provider)], error: null, source: 'snapshot' };
  }

  if (discovery.status === 'live') {
    return { models: [], error: null, source: 'empty' };
  }

  return {
    models: [...getProviderModels(provider)],
    error: discovery.status === 'unavailable' ? (discovery.error ?? null) : null,
    source: 'snapshot',
  };
}

export type CatalogIpcResult =
  | { ok: true; models: ProviderModelOption[] }
  | { ok: false; reason: 'unavailable' | 'error'; message: string };

export type LoadCatalogInput = {
  provider: ProviderName;
  apiKey?: string;
  apiBase?: string;
  useStoredCredentials?: boolean;
  refresh?: boolean;
};

export type LoadCatalogDeps = {
  fetchLive: (
    provider: ProviderName,
    input: { apiKey?: string; apiBase?: string; refresh?: boolean }
  ) => Promise<{ models: ProviderModelOption[]; error?: string }>;
  listViaIpc?: (input: {
    provider: ProviderName;
    apiBase?: string;
  }) => Promise<CatalogIpcResult>;
};

export async function loadInAppCatalog(
  input: LoadCatalogInput,
  deps: LoadCatalogDeps
): Promise<PresentedCatalog> {
  const { provider } = input;
  const key = input.apiKey?.trim();

  if (provider === 'openrouter') {
    const result = await deps.fetchLive(provider, { refresh: input.refresh });
    if (result.models.length > 0) {
      return presentCatalog(provider, { status: 'live', models: result.models });
    }
    return presentCatalog(provider, { status: 'unavailable', error: result.error });
  }

  if (provider === 'ollama') {
    if (deps.listViaIpc) {
      const ipc = await deps.listViaIpc({ provider, apiBase: input.apiBase });
      if (ipc.ok) return presentCatalog(provider, { status: 'live', models: ipc.models });
      if (ipc.reason === 'error') {
        return presentCatalog(provider, { status: 'empty', error: ipc.message });
      }
    }
    const result = await deps.fetchLive(provider, { apiBase: input.apiBase });
    if (result.models.length > 0) {
      return presentCatalog(provider, { status: 'live', models: result.models });
    }
    return presentCatalog(provider, {
      status: 'unavailable',
      error: result.error,
    });
  }

  if (!key && !input.useStoredCredentials) {
    return presentCatalog(provider, { status: 'unknown' });
  }

  if (deps.listViaIpc && input.useStoredCredentials && !key) {
    const ipc = await deps.listViaIpc({ provider, apiBase: input.apiBase });
    if (ipc.ok) return presentCatalog(provider, { status: 'live', models: ipc.models });
    return presentCatalog(provider, { status: 'unknown' });
  }

  if (!key) return presentCatalog(provider, { status: 'unknown' });

  try {
    const result = await deps.fetchLive(provider, {
      apiKey: key,
      apiBase: input.apiBase,
      refresh: input.refresh,
    });
    if (result.models.length > 0) {
      return presentCatalog(provider, { status: 'live', models: result.models });
    }
    return presentCatalog(provider, { status: 'empty', error: result.error });
  } catch (err) {
    return presentCatalog(provider, {
      status: 'unavailable',
      error: err instanceof Error ? err.message : 'Catalog load failed',
    });
  }
}
