import React, { useEffect, useMemo, useState } from 'react';

import { useAPIKeyStatus } from '../hooks/useAPIKeyStatus';
import { useActiveLLMProvider } from '../hooks/useActiveLLMProvider';
import { useLLMHealthCheck } from '../hooks/useLLMHealthCheck';
import { useOpenRouterModels } from '../hooks/useOpenRouterModels';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';
import { OPENROUTER_FALLBACK_MODELS } from '@/shared/llm/openrouter-models';
import {
  getDefaultModelId,
  getProviderModels,
  resolveProviderModel,
  type ProviderModelOption,
} from '@/shared/llm/provider-models';
import { persistLlmSetupProvider } from '@/shared/constants/popup-navigation-storage';

interface APIKeySetupViewProps {
  initialProvider?: ProviderName;
  onClose: () => void;
}

interface ProviderMeta {
  label: string;
  keyPlaceholder?: string;
  /** Optional endpoint field (only used by Ollama). */
  endpointPlaceholder?: string;
  endpointHelp?: string;
}

const PROVIDER_META: Record<ProviderName, ProviderMeta> = {
  anthropic: { label: 'Anthropic (Claude)', keyPlaceholder: 'sk-ant-...' },
  openai: { label: 'OpenAI (GPT)', keyPlaceholder: 'sk-...' },
  gemini: { label: 'Google Gemini', keyPlaceholder: 'AIza...' },
  openrouter: { label: 'OpenRouter', keyPlaceholder: 'sk-or-...' },
  minimax: { label: 'MiniMax', keyPlaceholder: 'eyJ...' },
  ollama: {
    label: 'Ollama (local)',
    endpointPlaceholder: 'http://localhost:11434',
    endpointHelp: 'Ensure OLLAMA_ORIGINS=chrome-extension://* is set before connecting.',
  },
};

/** Providers that need an API key; ollama uses an endpoint instead. */
const KEY_PROVIDERS: ReadonlyArray<ProviderName> = ['anthropic', 'openai', 'gemini', 'openrouter', 'minimax'];

const CUSTOM_MODEL_VALUE = '__custom__';

function pickCatalogDefault(provider: ProviderName, models: ProviderModelOption[]): string {
  const preferred = getDefaultModelId(provider);
  if (models.some(m => m.id === preferred)) return preferred;
  return models[0]?.id ?? preferred;
}

export function APIKeySetupView({ initialProvider, onClose }: APIKeySetupViewProps): React.ReactElement {
  const active = useActiveLLMProvider();
  const [provider, setProvider] = useState<ProviderName | null>(null);
  const [key, setKey] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:11434');
  const [health, setHealth] = useState<string | null>(null);
  const [modelChoice, setModelChoice] = useState<string>('');
  const [customModel, setCustomModel] = useState('');

  const status = useAPIKeyStatus(provider ?? 'anthropic');
  const { run: runIpcHealthCheck } = useLLMHealthCheck();
  const openRouterModels = useOpenRouterModels(provider === 'openrouter');

  useEffect(() => {
    const resolved = initialProvider ?? active.provider ?? 'anthropic';
    setProvider(resolved);
  }, [initialProvider, active.provider]);

  useEffect(() => {
    setModelChoice('');
    setCustomModel('');
    setKey('');
    setHealth(null);
  }, [provider]);

  const catalogModels = useMemo(() => {
    if (!provider) return [];
    if (provider === 'openrouter') {
      return openRouterModels.models.length > 0 ? openRouterModels.models : OPENROUTER_FALLBACK_MODELS;
    }
    return getProviderModels(provider);
  }, [provider, openRouterModels.models]);
  const resolvedModel = modelChoice === CUSTOM_MODEL_VALUE
    ? customModel.trim() || (provider ? getDefaultModelId(provider) : '')
    : modelChoice;

  useEffect(() => {
    if (!provider || status.model === null) return;
    if (provider === 'openrouter' && openRouterModels.loading) return;

    const inCatalog = catalogModels.some(m => m.id === status.model);
    if (inCatalog) {
      setModelChoice(status.model);
      setCustomModel('');
    } else {
      setModelChoice(CUSTOM_MODEL_VALUE);
      setCustomModel(status.model);
    }
  }, [status.model, provider, catalogModels, openRouterModels.loading]);

  if (!provider) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
        <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>Loading provider...</p>
      </div>
    );
  }

  const meta = PROVIDER_META[provider];
  const requiresKey = KEY_PROVIDERS.includes(provider);

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', height: '100%', width: '100%',
        padding: 'var(--step-2)', gap: 'var(--step-1)',
      }}
    >
      <h2 className="u-serif" style={{ margin: 0 }}>AI provider setup</h2>
      {active.provider && (
        <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', margin: 0 }}>
          Summarize uses: {PROVIDER_META[active.provider].label}
          {active.provider === provider ? ' (this provider)' : ''}
        </p>
      )}

      <label className="u-kicker">Provider</label>
      <select
        value={provider}
        onChange={e => {
          const next = e.target.value as ProviderName;
          setProvider(next);
          void persistLlmSetupProvider(next);
        }}
      >
        {(Object.keys(PROVIDER_META) as ProviderName[]).map(p => (
          <option key={p} value={p}>{PROVIDER_META[p].label}</option>
        ))}
      </select>

      <label className="u-kicker">Model</label>
      {provider === 'openrouter' && (
        <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', margin: 0 }}>
          {openRouterModels.loading
            ? 'Loading free models from OpenRouter...'
            : `${catalogModels.length} free models (from OpenRouter API)`}
        </p>
      )}
      <select
        value={modelChoice || pickCatalogDefault(provider, catalogModels)}
        disabled={provider === 'openrouter' && openRouterModels.loading}
        onChange={e => {
          const next = e.target.value;
          setModelChoice(next);
        }}
      >
        {catalogModels.map(m => (
          <option key={m.id} value={m.id}>
            {m.label}{m.hint ? ` (${m.hint})` : ''}
          </option>
        ))}
        <option value={CUSTOM_MODEL_VALUE}>Custom model id...</option>
      </select>

      {modelChoice === CUSTOM_MODEL_VALUE && (
        <>
          <label className="u-kicker">Custom model id</label>
          <input
            type="text"
            value={customModel}
            onChange={e => setCustomModel(e.target.value)}
            placeholder={getDefaultModelId(provider)}
          />
        </>
      )}

      {provider === 'openrouter' && (
        <button
          type="button"
          disabled={openRouterModels.loading}
          onClick={() => { void openRouterModels.refresh(); }}
        >
          Refresh models
        </button>
      )}

      {requiresKey && (
        <>
          <label className="u-kicker">{meta.label} API key</label>
          <input
            type="password"
            value={key}
            onChange={e => setKey(e.target.value)}
            placeholder={status.configured ? 'Key saved — leave blank to keep' : meta.keyPlaceholder}
          />
        </>
      )}

      {provider === 'ollama' && (
        <>
          <label className="u-kicker">Ollama endpoint</label>
          <input
            type="text"
            value={apiBase}
            onChange={e => setApiBase(e.target.value)}
            placeholder={meta.endpointPlaceholder}
          />
          <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
            {meta.endpointHelp}
          </p>
        </>
      )}

      <div style={{ display: 'flex', gap: 'var(--step-1)' }}>
        <button type="button" onClick={async () => {
          setHealth(null);
          const modelToSave = resolveProviderModel(provider, resolvedModel);

          if (requiresKey) {
            const trimmedKey = key.trim();
            if (!trimmedKey && !status.configured) {
              setHealth('Failed: Enter an API key first');
              return;
            }
            const saveResult = await status.save({
              ...(trimmedKey ? { key: trimmedKey } : {}),
              model: modelToSave,
            });
            if (!saveResult.success) {
              setHealth(`Failed to save: ${saveResult.error}`);
              return;
            }
            void persistLlmSetupProvider(provider);
            await active.refresh();

            if (trimmedKey) {
              const healthResult = await checkProviderHealthInBrowser(provider, {
                apiKey: trimmedKey,
                model: modelToSave,
              });
              if (healthResult.ok) setHealth(`OK: ${healthResult.model}`);
              else setHealth(`Failed: ${healthResult.error ?? 'Health check failed'}`);
              return;
            }

            const ipcResult = await runIpcHealthCheck(provider);
            if (ipcResult.success && ipcResult.data.ok) {
              setHealth(`OK: ${ipcResult.data.model}`);
            } else {
              setHealth(`Failed: ${ipcResult.success ? ipcResult.data.error : ipcResult.error ?? 'Health check failed'}`);
            }
            return;
          }

          const saveResult = await status.save({ model: modelToSave });
          if (!saveResult.success) {
            setHealth(`Failed to save: ${saveResult.error}`);
            return;
          }
          void persistLlmSetupProvider(provider);
          await active.refresh();

          const healthResult = await checkProviderHealthInBrowser(provider, {
            apiBase,
            model: modelToSave,
          });
          if (healthResult.ok) setHealth(`OK: ${healthResult.model}`);
          else setHealth(`Failed: ${healthResult.error ?? 'Health check failed'}`);
        }}>Save & test</button>
        <button type="button" onClick={onClose}>Close</button>
      </div>

      {health && <p style={{ color: 'var(--ink)' }}>{health}</p>}
      {status.configured && requiresKey && !key && (
        <p className="u-caps" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
          API key on file. Change model and Save & test without re-entering the key.
        </p>
      )}
    </div>
  );
}
