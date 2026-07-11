import React, { useEffect, useMemo, useState } from 'react';

import { ModelPickerList } from './ModelPickerList';
import { StatusDot } from './StatusDot';

import { useAPIKeyStatus } from '@/features/ai/hooks/useAPIKeyStatus';
import { useLLMHealthCheck } from '@/features/ai/hooks/useLLMHealthCheck';
import { useProviderModels } from '@/features/ai/hooks/useProviderModels';
import {
  CUSTOM_MODEL_ID,
  PROVIDER_META,
} from '@/features/ai/constants/provider-setup';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';
import { OPENROUTER_FALLBACK_MODELS, openRouterModelRequiresKey } from '@/shared/llm/openrouter-models';
import {
  getDefaultModelId,
  resolveProviderModel,
  type ProviderModelOption,
} from '@/shared/llm/provider-models';
import { persistLlmSetupProvider } from '@/shared/constants/popup-navigation-storage';

export interface ProviderDetailPanelProps {
  provider: ProviderName;
  onBack: () => void;
  onSaved: () => void;
}

type OpenRouterFilter = 'all' | 'free' | 'paid';

function pickDefaultModel(provider: ProviderName, models: ProviderModelOption[]): string {
  const preferred = getDefaultModelId(provider);
  if (models.some(m => m.id === preferred)) return preferred;
  return models[0]?.id ?? preferred;
}

function modelRequiresKey(
  provider: ProviderName,
  modelId: string,
  catalog: ProviderModelOption[],
): boolean {
  if (provider === 'ollama') return false;
  if (provider === 'openrouter') return openRouterModelRequiresKey(modelId, catalog);
  return true;
}

function FilterChip({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}): React.ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        minHeight: 32,
        padding: '4px 10px',
        fontSize: 'var(--step--2)',
        border: `1px solid ${active ? 'var(--accent)' : 'var(--rule-soft)'}`,
        background: active ? 'var(--paper-2)' : 'transparent',
        color: 'var(--ink)',
        cursor: 'pointer',
      }}
    >
      {label}
    </button>
  );
}

export function ProviderDetailPanel({
  provider,
  onBack,
  onSaved,
}: ProviderDetailPanelProps): React.ReactElement {
  const meta = PROVIDER_META[provider];
  const status = useAPIKeyStatus(provider);
  const { run: runIpcHealthCheck } = useLLMHealthCheck();

  const [key, setKey] = useState('');
  const [apiBase, setApiBase] = useState('http://localhost:11434');
  const [selectedId, setSelectedId] = useState('');
  const [customModelId, setCustomModelId] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [orFilter, setOrFilter] = useState<OpenRouterFilter>('free');

  const catalogQuery = useProviderModels(provider, {
    apiKey: key,
    apiBase: provider === 'ollama' ? apiBase : undefined,
    useStoredCredentials: Boolean(status.configured) || verified,
  });

  useEffect(() => {
    setKey('');
    setMessage(null);
    setSelectedId('');
    setCustomModelId('');
    setVerified(Boolean(status.configured));
    setOrFilter('free');
  }, [provider, status.configured]);

  useEffect(() => {
    if (status.apiBase && provider === 'ollama') {
      setApiBase(status.apiBase);
    }
  }, [status.apiBase, provider]);

  const catalogModels = useMemo(() => {
    if (provider === 'openrouter') {
      const base = catalogQuery.models.length > 0 ? catalogQuery.models : OPENROUTER_FALLBACK_MODELS;
      if (orFilter === 'all') return base;
      return base.filter(m => (orFilter === 'free' ? m.hint === 'free' : m.hint === 'paid'));
    }
    return catalogQuery.models;
  }, [provider, catalogQuery.models, orFilter]);

  const resolvedModelId = selectedId === CUSTOM_MODEL_ID
    ? customModelId.trim() || getDefaultModelId(provider)
    : selectedId || pickDefaultModel(provider, catalogModels);

  const needsKey = modelRequiresKey(provider, resolvedModelId, catalogModels);
  const modelsUnlocked = (() => {
    if (provider === 'ollama') return verified;
    if (provider === 'openrouter') {
      if (orFilter === 'free' && catalogModels.length > 0) return true;
      return verified || Boolean(status.configured);
    }
    return verified || Boolean(status.configured);
  })();

  useEffect(() => {
    if (status.model === null || catalogQuery.loading) return;
    const inCatalog = catalogModels.some(m => m.id === status.model);
    if (inCatalog) {
      setSelectedId(status.model);
      setCustomModelId('');
    } else if (status.model) {
      setSelectedId(CUSTOM_MODEL_ID);
      setCustomModelId(status.model);
    } else if (!selectedId && catalogModels.length > 0) {
      setSelectedId(pickDefaultModel(provider, catalogModels));
    }
  }, [status.model, catalogModels, catalogQuery.loading, provider, selectedId]);

  const handleVerify = async (): Promise<void> => {
    setMessage(null);
    setVerifying(true);
    const trimmedKey = key.trim();
    const model = resolveProviderModel(provider, resolvedModelId);

    try {
      if (provider === 'ollama') {
        const result = await checkProviderHealthInBrowser(provider, { apiBase, model });
        setVerified(result.ok);
        setMessage(result.ok ? `Connected · ${catalogModels.length} models` : result.error ?? 'Connection failed');
        if (result.ok) void catalogQuery.refresh();
        return;
      }

      if (needsKey && !trimmedKey && !status.configured) {
        setMessage('Enter an API key first');
        setVerified(false);
        return;
      }

      const health = trimmedKey
        ? await checkProviderHealthInBrowser(provider, { apiKey: trimmedKey, model })
        : await (async (): Promise<{ ok: boolean; model?: string; error?: string }> => {
            const ipc = await runIpcHealthCheck(provider);
            if (ipc.success && ipc.data.ok) return { ok: true, model: ipc.data.model };
            return { ok: false, error: ipc.success ? ipc.data.error : ipc.error };
          })();

      if (health.ok) {
        setVerified(true);
        setMessage(`Connected · ${catalogQuery.models.length || catalogModels.length} models`);
        void catalogQuery.refresh();
      } else {
        setVerified(false);
        setMessage(health.error ?? 'Verification failed');
      }
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setMessage(null);
    setSaving(true);
    const modelToSave = resolveProviderModel(provider, resolvedModelId);
    const trimmedKey = key.trim();

    try {
      if (needsKey && !trimmedKey && !status.configured) {
        setMessage('API key required for this model');
        return;
      }

      if (!modelsUnlocked && provider !== 'openrouter') {
        setMessage('Verify connection before saving');
        return;
      }

      const saveResult = await status.save({
        ...(trimmedKey ? { key: trimmedKey } : {}),
        model: modelToSave,
        ...(provider === 'ollama' ? { apiBase: apiBase.trim() } : {}),
      });

      if (!saveResult.success) {
        setMessage(saveResult.error ?? 'Save failed');
        return;
      }

      void persistLlmSetupProvider(provider);
      onSaved();
      setMessage('Set as summarize model');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '8px 16px 0' }}>
        <button
          type="button"
          onClick={onBack}
          className="u-mono"
          style={{
            all: 'unset',
            cursor: 'pointer',
            color: 'var(--accent)',
            fontSize: 'var(--step--2)',
            minHeight: 44,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ← All providers
        </button>
      </div>

      <div style={{ padding: '4px 16px 8px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-1)', letterSpacing: '-0.01em' }}>{meta.label}</div>
        <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: '4px 0 0' }}>
          {provider === 'openrouter'
            ? 'Free models need no key'
            : provider === 'ollama'
              ? 'Local models from your Ollama install'
              : 'API key required to list models'}
        </p>
      </div>

      <div className="list-scroll" style={{ flex: 1, padding: '0 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {provider === 'ollama' ? (
          <>
            <label className="u-kicker" htmlFor="ollama-endpoint">Endpoint</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="ollama-endpoint"
                type="text"
                value={apiBase}
                onChange={e => { setApiBase(e.target.value); setVerified(false); }}
                placeholder="http://localhost:11434"
                style={{ flex: 1 }}
              />
              <button type="button" disabled={verifying} onClick={() => { void handleVerify(); }} style={{ minHeight: 44 }}>
                {verifying ? '…' : 'Verify'}
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="u-kicker" htmlFor="provider-api-key">
              {provider === 'openrouter' ? 'API key (optional for free)' : 'API key'}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                id="provider-api-key"
                type="password"
                value={key}
                onChange={e => { setKey(e.target.value); setVerified(false); }}
                placeholder={status.configured ? 'Saved — leave blank to keep' : meta.keyPlaceholder}
                style={{ flex: 1 }}
              />
              <button type="button" disabled={verifying} onClick={() => { void handleVerify(); }} style={{ minHeight: 44 }}>
                {verifying ? '…' : 'Verify'}
              </button>
            </div>
          </>
        )}

        {verified ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <StatusDot connected />
            <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
              {provider === 'openrouter' && !needsKey && !status.configured && !key.trim()
                ? 'Free model — no API key needed'
                : `Connected · ${catalogModels.length} models`}
            </span>
          </div>
        ) : null}

        {meta.subscriptionNote ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: 0, lineHeight: 1.45, padding: '8px 10px', border: '1px solid var(--rule-soft)', background: 'var(--paper-2)' }}>
            {meta.subscriptionNote}
          </p>
        ) : null}

        {provider === 'openrouter' ? (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            <FilterChip active={orFilter === 'free'} label="Free" onClick={() => setOrFilter('free')} />
            <FilterChip active={orFilter === 'paid'} label="Paid" onClick={() => setOrFilter('paid')} />
            <FilterChip active={orFilter === 'all'} label="All" onClick={() => setOrFilter('all')} />
          </div>
        ) : null}

        {catalogQuery.error && catalogModels.length === 0 ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)', margin: 0 }}>
            {catalogQuery.error}
          </p>
        ) : null}

        {modelsUnlocked ? (
          <ModelPickerList
            models={catalogModels}
            selectedId={selectedId || pickDefaultModel(provider, catalogModels)}
            onSelect={setSelectedId}
            customModelId={customModelId}
            onCustomModelIdChange={setCustomModelId}
            customPlaceholder={getDefaultModelId(provider)}
            loading={catalogQuery.loading}
            emptyMessage={
              provider !== 'ollama' && !key.trim() && !status.configured && needsKey
                ? 'Verify your API key to load models'
                : 'No models match your search'
            }
          />
        ) : (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: '8px 0' }}>
            {provider === 'openrouter' && orFilter === 'free'
              ? 'Select a free model below after catalog loads, or verify a key for paid models'
              : 'Verify to load available models'}
          </p>
        )}

        {message ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: message.startsWith('Set as') ? 'var(--accent)' : 'var(--ink)', margin: 0 }}>
            {message}
          </p>
        ) : null}
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule-soft)' }}>
        <button
          type="button"
          disabled={saving || !modelsUnlocked}
          onClick={() => { void handleSave(); }}
          style={{ width: '100%', minHeight: 44 }}
        >
          {saving ? 'Saving…' : 'Set as summarize model'}
        </button>
      </div>
    </div>
  );
}
