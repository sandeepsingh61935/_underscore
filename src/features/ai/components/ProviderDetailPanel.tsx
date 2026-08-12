import React, { useEffect, useMemo, useRef, useState } from 'react';

import { ModelPickerList } from './ModelPickerList';
import { ConnectionDateline } from './setup/ConnectionDateline';
import { SetupField } from './setup/SetupField';
import { SetupSection } from './setup/SetupSection';

import { useAPIKeyStatus } from '@/features/ai/hooks/useAPIKeyStatus';
import { useLLMHealthCheck } from '@/features/ai/hooks/useLLMHealthCheck';
import { useProviderModels } from '@/features/ai/hooks/useProviderModels';
import {
  CUSTOM_MODEL_ID,
  PROVIDER_META,
} from '@/features/ai/constants/provider-setup';
import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import { persistLlmSetupProvider } from '@/shared/constants/popup-navigation-storage';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';
import {
  OPENROUTER_FALLBACK_MODELS,
  OPENROUTER_KEY_HELP,
  openRouterModelRequiresKey,
} from '@/shared/llm/openrouter-models';
import {
  getDefaultModelId,
  resolveProviderModel,
  type ProviderModelOption,
} from '@/shared/llm/provider-models';
import { removeApiKeyCopy } from '@/shared/utils/confirm-dialog-copy';

export interface ProviderDetailPanelProps {
  provider: ProviderName;
  onBack: () => void;
  onSaved: () => void;
}

type OpenRouterFilter = 'all' | 'free' | 'paid';

const SAVE_CONFIRMATION_DELAY_MS = 1200;

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
  const [saved, setSaved] = useState(false);
  const [connectMessage, setConnectMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [orFilter, setOrFilter] = useState<OpenRouterFilter>('free');
  const [removeKeyOpen, setRemoveKeyOpen] = useState(false);
  const [isRemovingKey, setIsRemovingKey] = useState(false);
  /** Last status.model we applied into selectedId — blocks catalog/filter churn from clobbering picks. */
  const hydratedStatusModelRef = useRef<string | null>(null);

  // The connection is only meaningful once verified — a typed-but-unverified
  // key must not unlock paid/gated models (see plan bug #1).
  const connectionVerified = verified || Boolean(status.configured);

  const catalogQuery = useProviderModels(provider, {
    // Only fetch with a typed key once it's been verified, so we don't hit
    // provider APIs with an unverified key on every keystroke.
    apiKey: connectionVerified ? key : undefined,
    apiBase: provider === 'ollama' ? apiBase : undefined,
    useStoredCredentials: Boolean(status.configured) || verified,
  });

  useEffect(() => {
    setKey('');
    setConnectMessage(null);
    setSaveMessage(null);
    setSelectedId('');
    setCustomModelId('');
    setVerified(Boolean(status.configured));
    setOrFilter('free');
    hydratedStatusModelRef.current = null;
  }, [provider, status.configured]);

  useEffect(() => {
    if (provider === 'openrouter') {
      void catalogQuery.refresh();
    }
  }, [provider, catalogQuery.refresh]);

  const catalogModels = useMemo(() => {
    if (provider === 'openrouter') {
      const base = catalogQuery.models.length > 0 ? catalogQuery.models : OPENROUTER_FALLBACK_MODELS;
      if (orFilter === 'all') return base;
      return base.filter(m => (orFilter === 'free' ? m.hint === 'free' : m.hint === 'paid'));
    }
    return catalogQuery.models;
  }, [provider, catalogQuery.models, orFilter]);

  const resolvedModelId = selectedId === CUSTOM_MODEL_ID
    ? customModelId.trim()
    : selectedId || pickDefaultModel(provider, catalogModels);

  const needsKey = modelRequiresKey(
    provider,
    resolvedModelId || getDefaultModelId(provider),
    catalogQuery.models.length > 0 ? catalogQuery.models : catalogModels,
  );

  const canShowModelPicker = provider === 'openrouter'
    || provider === 'ollama'
    || provider === 'xai'
    || connectionVerified;

  const isCatalogModelSelectable = (model: ProviderModelOption): boolean => {
    // OpenRouter free = $0 credits; selection still requires a verified API key.
    void model;
    return connectionVerified;
  };

  const selectedModelSelectable = selectedId === CUSTOM_MODEL_ID
    ? connectionVerified
    : catalogModels.some(m => m.id === resolvedModelId)
      ? isCatalogModelSelectable(
          catalogModels.find(m => m.id === resolvedModelId) ?? { id: resolvedModelId, label: resolvedModelId },
        )
      : connectionVerified;

  const canSaveModel = Boolean(resolvedModelId)
    && selectedModelSelectable
    && (!needsKey || connectionVerified)
    && (provider !== 'ollama' || connectionVerified);

  // Reconcile OpenRouter selection when the free/paid filter changes and the
  // current pick falls outside the new subset (plan bug: stale selectedId).
  useEffect(() => {
    if (provider !== 'openrouter' || selectedId === CUSTOM_MODEL_ID) return;
    if (catalogModels.length === 0) return;
    if (catalogModels.some(m => m.id === selectedId)) return;
    const firstSelectable = catalogModels.find(() => connectionVerified) ?? catalogModels[0];
    setSelectedId(firstSelectable?.id ?? '');
  }, [provider, orFilter, catalogModels, selectedId, connectionVerified]);

  // Hydrate from saved status once per status.model value. Do not depend on
  // selectedId, and do not re-apply when only the filter/catalog subset changes.
  useEffect(() => {
    if (status.model === null || catalogQuery.loading) return;

    const alreadyHydrated = hydratedStatusModelRef.current === status.model;
    if (alreadyHydrated) {
      // Catalog may arrive after status — fill an empty selection only.
      setSelectedId(prev => prev || (catalogModels.length > 0 ? pickDefaultModel(provider, catalogModels) : prev));
      return;
    }

    const inCatalog = catalogModels.some(m => m.id === status.model);
    if (inCatalog) {
      hydratedStatusModelRef.current = status.model;
      setSelectedId(status.model);
      setCustomModelId('');
      return;
    }

    if (status.model) {
      // Wait for catalog before treating an unknown id as custom, so a default
      // model is not forced into CUSTOM_MODEL_ID while models are still empty.
      if (catalogModels.length === 0 && provider !== 'openrouter') return;
      hydratedStatusModelRef.current = status.model;
      if (catalogModels.length === 0) {
        setSelectedId(status.model);
        setCustomModelId('');
      } else {
        setSelectedId(CUSTOM_MODEL_ID);
        setCustomModelId(status.model);
      }
      return;
    }

    hydratedStatusModelRef.current = status.model;
    setSelectedId(prev => prev || (catalogModels.length > 0 ? pickDefaultModel(provider, catalogModels) : prev));
  }, [status.model, catalogModels, catalogQuery.loading, provider]);

  const handleCustomModelIdChange = (value: string): void => {
    setCustomModelId(value);
    // A freeform model ID hasn't been tested against the provider yet.
    setVerified(false);
  };

  const handleFilterChange = (filter: OpenRouterFilter): void => {
    setOrFilter(filter);
  };

  const handleVerify = async (): Promise<void> => {
    setConnectMessage(null);
    setVerifying(true);
    const trimmedKey = key.trim();
    const model = resolveProviderModel(provider, resolvedModelId);

    try {
      // Extension may call cloud APIs directly (host_permissions); not the web proxy path.
      const direct = { allowDirectCloud: true as const };

      if (provider === 'ollama') {
        const result = await checkProviderHealthInBrowser(provider, { apiBase, model, ...direct });
        setVerified(result.ok);
        setConnectMessage(result.ok ? null : result.error ?? 'Connection failed');
        if (result.ok) void catalogQuery.refresh();
        return;
      }

      if (needsKey && !trimmedKey && !status.configured) {
        setConnectMessage('Enter an API key first');
        setVerified(false);
        return;
      }

      const health = trimmedKey
        ? await checkProviderHealthInBrowser(provider, { apiKey: trimmedKey, model, ...direct })
        : await (async (): Promise<{ ok: boolean; model?: string; error?: string }> => {
            const ipc = await runIpcHealthCheck(provider, { model });
            if (ipc.success && ipc.data.ok) return { ok: true, model: ipc.data.model };
            return { ok: false, error: ipc.success ? ipc.data.error : ipc.error };
          })();

      setVerified(health.ok);
      setConnectMessage(health.ok ? null : health.error ?? 'Verification failed');
      if (health.ok) void catalogQuery.refresh();
    } finally {
      setVerifying(false);
    }
  };

  const handleSave = async (): Promise<void> => {
    setSaveMessage(null);

    if (selectedId === CUSTOM_MODEL_ID && !customModelId.trim()) {
      setSaveMessage('Enter a custom model ID');
      return;
    }
    if (!canSaveModel) return;

    setSaving(true);
    try {
      const trimmedKey = key.trim();
      const modelToSave = resolvedModelId || getDefaultModelId(provider);

      const saveResult = await status.save({
        ...(trimmedKey ? { key: trimmedKey } : {}),
        model: modelToSave,
        ...(provider === 'ollama' ? { apiBase: apiBase.trim() } : {}),
      });

      if (!saveResult.success) {
        setSaveMessage(saveResult.error ?? 'Save failed');
        return;
      }

      void persistLlmSetupProvider(provider);
      setSaveMessage('Active model updated');
      setSaved(true);
      // Let the confirmation render before handing control back to the hub.
      setTimeout(onSaved, SAVE_CONFIRMATION_DELAY_MS);
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveKey = async (): Promise<void> => {
    if (isRemovingKey) return;
    setIsRemovingKey(true);
    try {
      const result = await status.clearKey();
      if (!result.success) {
        setConnectMessage(result.error ?? 'Could not remove key');
        return;
      }
      setKey('');
      setVerified(false);
      setRemoveKeyOpen(false);
      setConnectMessage(null);
      setSaveMessage(null);
    } finally {
      setIsRemovingKey(false);
    }
  };

  const saveHint = canSaveModel || saved
    ? null
    : provider === 'ollama' && !connectionVerified
      ? 'Connect first'
      : !resolvedModelId || (selectedId === CUSTOM_MODEL_ID && !customModelId.trim())
        ? 'Select a model'
        : 'Verify key first';

  const datelineState: 'connected' | 'offline' | 'checking' = verifying
    ? 'checking'
    : connectionVerified
      ? 'connected'
      : 'offline';

  const datelineDetail = connectionVerified
    ? (catalogModels.length > 0 ? `${catalogModels.length} models` : 'ready')
    : connectMessage ?? (provider === 'ollama' ? 'unreachable' : 'not verified');

  const showDateline = verifying || connectionVerified || Boolean(connectMessage);
  const headerBlurb = provider === 'openrouter' ? OPENROUTER_KEY_HELP : meta.blurb;

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
            color: 'var(--ink-3)',
            fontSize: 10,
            letterSpacing: '0.14em',
            textTransform: 'uppercase',
            minHeight: 24,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          ← Providers
        </button>
      </div>

      <div style={{ padding: '4px 16px 10px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-1)', letterSpacing: '-0.01em' }}>{meta.label}</div>
        {headerBlurb ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: '4px 0 0' }}>
            {headerBlurb}
          </p>
        ) : null}
      </div>

      <div className="list-scroll" style={{ flex: 1, minHeight: 0, padding: '0 16px 12px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        <SetupSection index={1} label={provider === 'ollama' ? 'Endpoint' : 'Key'}>
          {provider === 'ollama' ? (
            <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
              <SetupField
                id="ollama-endpoint"
                label="URL"
                value={apiBase}
                onChange={value => { setApiBase(value); setVerified(false); }}
                placeholder="http://localhost:11434"
              />
              <button type="button" className="btn ghost" disabled={verifying} onClick={() => { void handleVerify(); }}>
                {verifying ? '…' : 'Connect'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <SetupField
                  id="provider-api-key"
                  label="API key"
                  type="password"
                  value={key}
                  onChange={value => { setKey(value); setVerified(false); }}
                  placeholder={status.configured ? '••••••••  leave blank to keep' : meta.keyPlaceholder}
                  autoComplete="off"
                />
                <button type="button" className="btn ghost" disabled={verifying} onClick={() => { void handleVerify(); }}>
                  {verifying ? '…' : 'Verify'}
                </button>
              </div>
              {status.configured ? (
                <button
                  type="button"
                  className="u-mono"
                  data-testid="provider-remove-key"
                  onClick={() => setRemoveKeyOpen(true)}
                  style={{
                    all: 'unset',
                    cursor: 'pointer',
                    alignSelf: 'flex-start',
                    fontSize: 'var(--step--2)',
                    letterSpacing: '0.06em',
                    textTransform: 'uppercase',
                    color: 'var(--ink-3)',
                    minHeight: 32,
                    padding: '4px 0',
                  }}
                >
                  Remove key
                </button>
              ) : null}
            </div>
          )}

          {showDateline ? <ConnectionDateline state={datelineState} detail={datelineDetail} /> : null}
        </SetupSection>

        <SetupSection index={2} label="Model">
          {provider === 'openrouter' ? (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <FilterChip active={orFilter === 'free'} label="Free" onClick={() => handleFilterChange('free')} />
              <FilterChip active={orFilter === 'paid'} label="Paid" onClick={() => handleFilterChange('paid')} />
              <FilterChip active={orFilter === 'all'} label="All" onClick={() => handleFilterChange('all')} />
            </div>
          ) : null}

          {catalogQuery.error && catalogModels.length === 0 ? (
            <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)', margin: 0 }}>
              {catalogQuery.error}
            </p>
          ) : null}

          {canShowModelPicker ? (
            <ModelPickerList
              models={catalogModels}
              selectedId={selectedId || pickDefaultModel(provider, catalogModels)}
              onSelect={setSelectedId}
              customModelId={customModelId}
              onCustomModelIdChange={handleCustomModelIdChange}
              customPlaceholder={getDefaultModelId(provider)}
              searchPlaceholder="Search…"
              loading={catalogQuery.loading}
              isModelDisabled={m => !isCatalogModelSelectable(m)}
              customDisabled={!connectionVerified}
              emptyMessage={
                !connectionVerified && provider !== 'openrouter' && provider !== 'ollama'
                  ? 'Verify key to load models'
                  : !connectionVerified && provider === 'openrouter'
                    ? 'Verify key to unlock models'
                    : 'No matches'
              }
            />
          ) : (
            <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: 0 }}>
              Verify key to load models
            </p>
          )}
        </SetupSection>
      </div>

      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--rule-soft)', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {saveMessage ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: saved ? 'var(--accent)' : 'var(--ink)', margin: 0 }}>
            {saveMessage}
          </p>
        ) : saveHint ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: 0 }}>
            {saveHint}
          </p>
        ) : null}
        <button
          type="button"
          className="btn accent"
          disabled={saving || saved || !canSaveModel}
          onClick={() => { void handleSave(); }}
          style={{ width: '100%' }}
        >
          {saving ? 'Saving…' : saved ? 'Saved' : 'Use this model'}
        </button>
      </div>

      {(() => {
        const copy = removeApiKeyCopy(meta.label);
        return (
          <DeleteConfirmDialog
            open={removeKeyOpen}
            onClose={() => setRemoveKeyOpen(false)}
            severity={copy.severity}
            title={copy.title}
            message={copy.message}
            note={copy.note}
            strongNames={copy.strongNames}
            confirmLabel={copy.confirmLabel}
            cancelLabel={copy.cancelLabel}
            onConfirm={() => { void handleRemoveKey(); }}
            isConfirming={isRemovingKey}
          />
        );
      })()}
    </div>
  );
}
