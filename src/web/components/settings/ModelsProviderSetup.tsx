import React, { useCallback, useEffect, useState } from 'react';

import { CUSTOM_MODEL_ID, PROVIDER_META } from '@/features/ai/constants/provider-setup';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { loadInAppCatalog } from '@/shared/llm/catalog-load';
import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';
import { fetchProviderModels } from '@/shared/llm/model-discovery';
import { getDefaultModelId, getProviderModels } from '@/shared/llm/provider-models';
import {
  clearProviderConfig,
  isProviderConfigured,
  type WebLlmState,
  upsertProviderConfig,
} from '@/web/lib/webLlmKeys';

export function ModelsProviderSetup({
  provider,
  canConfigure,
  llmState,
  onBack,
  onStateChange,
}: {
  provider: ProviderName;
  canConfigure: boolean;
  llmState: WebLlmState;
  onBack: () => void;
  onStateChange: (s: WebLlmState) => void;
}): React.ReactElement {
  const meta = PROVIDER_META[provider];
  const existing = llmState.providers[provider];
  const configured = isProviderConfigured(llmState, provider);
  const [catalog, setCatalog] = useState(() => getProviderModels(provider));
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [apiBase, setApiBase] = useState(
    existing?.apiBase ?? (provider === 'ollama' ? 'http://localhost:11434' : '')
  );
  const [model, setModel] = useState(existing?.model ?? getDefaultModelId(provider));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

  const custom = !catalog.some((m) => m.id === model);

  useEffect(() => {
    let cancelled = false;
    void loadInAppCatalog(
      {
        provider,
        apiKey: configured ? existing?.apiKey : undefined,
        apiBase: provider === 'ollama' ? apiBase : undefined,
      },
      { fetchLive: fetchProviderModels }
    ).then((presented) => {
      if (!cancelled && presented.models.length > 0) setCatalog(presented.models);
    });
    return () => {
      cancelled = true;
    };
  }, [provider, configured, existing?.apiKey, apiBase]);

  const saveAndCheck = useCallback(async () => {
    if (!canConfigure) return;
    setBusy(true);
    setMessage(null);
    setOk(null);
    try {
      let accessToken: string | null = null;
      if (provider !== 'ollama') {
        try {
          const { data } = await getWebSupabaseClient().auth.getSession();
          accessToken = data.session?.access_token ?? null;
        } catch {
          accessToken = null;
        }
      }
      const result = await checkProviderHealthInBrowser(provider, {
        apiKey: apiKey.trim() || undefined,
        apiBase: apiBase.trim() || undefined,
        model: model.trim() || undefined,
        accessToken,
      });
      if (result.ok) {
        const next = upsertProviderConfig(provider, {
          apiKey: apiKey.trim() || undefined,
          apiBase:
            provider === 'ollama'
              ? apiBase.trim() || 'http://localhost:11434'
              : apiBase.trim() || undefined,
          model: model.trim() || getDefaultModelId(provider),
          checkedAt: Date.now(),
        });
        onStateChange(next);
        setOk(true);
        setMessage('Connection ok · ready on this device');
      } else {
        setOk(false);
        setMessage(result.error ?? 'Check failed');
      }
    } catch (e) {
      setOk(false);
      setMessage(e instanceof Error ? e.message : 'Check failed');
    } finally {
      setBusy(false);
    }
  }, [apiBase, apiKey, canConfigure, model, onStateChange, provider]);

  const clear = useCallback(() => {
    if (!canConfigure) return;
    onStateChange(clearProviderConfig(provider));
    setApiKey('');
    setMessage(null);
    setOk(null);
    onBack();
  }, [canConfigure, onBack, onStateChange, provider]);

  return (
    <div className="block" data-od-id="settings-provider-setup">
      <button
        type="button"
        className="btn ghost sm"
        data-od-id="provider-setup-back"
        onClick={onBack}
        style={{ marginBottom: 12 }}
      >
        Back to models
      </button>
      <p className="block-label">{meta.label}</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        {meta.blurb ?? 'API key for this device'}
      </p>
      {provider !== 'ollama' ? (
        <label className="ai-field">
          <span className="u-mono">API key</span>
          <input
            className="field"
            type="password"
            autoComplete="off"
            placeholder={meta.keyPlaceholder ?? 'sk-…'}
            value={apiKey}
            disabled={!canConfigure || busy}
            onChange={(e) => setApiKey(e.target.value)}
            data-od-id="provider-api-key"
          />
        </label>
      ) : (
        <label className="ai-field">
          <span className="u-mono">Base URL</span>
          <input
            className="field"
            type="url"
            value={apiBase}
            disabled={!canConfigure || busy}
            onChange={(e) => setApiBase(e.target.value)}
            data-od-id="provider-api-base"
          />
        </label>
      )}
      <label className="ai-field" style={{ marginTop: 10 }}>
        <span className="u-mono">Model</span>
        <select
          className="field"
          value={custom ? CUSTOM_MODEL_ID : model}
          disabled={!canConfigure || busy}
          onChange={(e) => {
            const next = e.target.value;
            setModel(next === CUSTOM_MODEL_ID ? '' : next);
          }}
          data-od-id="provider-model"
        >
          {catalog.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
          <option value={CUSTOM_MODEL_ID}>Custom…</option>
        </select>
      </label>
      {custom ? (
        <label className="ai-field" style={{ marginTop: 10 }}>
          <span className="u-mono">Custom model id</span>
          <input
            className="field"
            type="text"
            value={model}
            disabled={!canConfigure || busy}
            onChange={(e) => setModel(e.target.value)}
            data-od-id="provider-model-custom"
          />
        </label>
      ) : null}
      <div className="ai-setup-actions">
        <button
          type="button"
          className="btn primary sm"
          disabled={!canConfigure || busy}
          data-od-id="provider-save-check"
          onClick={() => {
            void saveAndCheck();
          }}
        >
          {busy ? 'Checking…' : 'Save & check'}
        </button>
        {configured ? (
          <button
            type="button"
            className="btn sm"
            disabled={!canConfigure || busy}
            data-od-id="provider-clear"
            onClick={clear}
          >
            Clear
          </button>
        ) : null}
      </div>
      {message ? (
        <div
          className={`check-result${ok ? ' done' : ' fail'}`}
          data-od-id="provider-check-result"
          role="status"
        >
          {message}
        </div>
      ) : null}
    </div>
  );
}
