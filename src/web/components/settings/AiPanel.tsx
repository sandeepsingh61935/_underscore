/**
 * Web Settings → AI: Models & providers | Integrations.
 * Spec: docs/superpowers/specs/2026-08-12-ai-integrations-ia-standard.md
 *
 * Shell only for chrome; provider check + MCP catalog reuse shared modules.
 * Cloud MCP is the product path (ADR-029). Models stay on a separate tab.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  PROVIDER_META,
  providerStatusLabel,
} from '@/features/ai/constants/provider-setup';
import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import {
  fillMcpConfigTemplate,
  getMcpAiApp,
  MCP_AI_APPS,
  type McpAiAppId,
} from '@/features/settings/mcp/mcp-ai-apps';
import { mcpSetupStepLabels } from '@/features/settings/mcp/mcp-setup-steps';
import { useOAuthGrants } from '@/features/oauth/hooks/useOAuthGrants';
import { getMcpCloudUrl } from '@/shared/mcp/mcp-cloud-url';
import {
  integrationsStatusLabel,
  resolveIntegrationsStatus,
} from '@/shared/mcp/integrations-status';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { SettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { IN_APP_LLM_PROVIDER_ORDER } from '@/shared/llm/in-app-providers';
import { checkProviderHealthInBrowser } from '@/shared/llm/check-provider-health';
import { getDefaultModelId } from '@/shared/llm/provider-models';
import type { WebCaps } from '@/web/caps/resolveWebCaps';
import {
  pullWebAiPreferences,
  pushWebAiPreferences,
} from '@/web/lib/syncWebAiPreferences';
import {
  clearProviderConfig,
  formatDefaultModelLabel,
  isProviderConfigured,
  readWebLlmState,
  type WebLlmState,
  upsertProviderConfig,
} from '@/web/lib/webLlmKeys';

/** Single discriminant for tab + drill-in (no dual nullable modes). */
export type AiView =
  | { tab: 'models'; panel: 'list' }
  | { tab: 'models'; panel: 'provider'; id: ProviderName }
  | { tab: 'integrations'; panel: 'list' }
  | { tab: 'integrations'; panel: 'app'; id: McpAiAppId };

const INITIAL_VIEW: AiView = { tab: 'models', panel: 'list' };

export function AiPanel({
  caps,
  isAuthenticated,
  userId,
  billingCta,
  onBillingAction,
}: {
  caps: WebCaps;
  isAuthenticated: boolean;
  /** Account id for prefs LWW sync; omit when guest. */
  userId?: string | null;
  billingCta?: SettingsBillingCta | null;
  onBillingAction?: () => void;
}): React.ReactElement {
  const allowed = caps.flags.ai;
  const mcpAllowed = caps.flags.mcp;
  const lockLabel = billingCta?.ctaLabel ?? 'Upgrade';
  const lockKind = billingCta?.kind ?? 'upgrade';
  const [view, setView] = useState<AiView>(INITIAL_VIEW);
  const [llmState, setLlmState] = useState<WebLlmState>(() => readWebLlmState());
  const [prefsSyncNote, setPrefsSyncNote] = useState<string | null>(null);

  const canConfigureModels = allowed && isAuthenticated;

  // Pull account prefs when signed-in user opens AI settings (LWW with device).
  useEffect(() => {
    if (!isAuthenticated || !userId) return;
    let cancelled = false;
    void (async () => {
      try {
        const supabase = getWebSupabaseClient();
        const result = await pullWebAiPreferences(supabase, userId);
        if (cancelled) return;
        setLlmState(result.state);
        if (result.source === 'remote') {
          setPrefsSyncNote('Synced models preference from your account');
        }
      } catch {
        // Offline / table not migrated yet — stay on device store.
        if (!cancelled) {
          setPrefsSyncNote(null);
          // eslint-disable-next-line no-console -- ops signal for RLS/migration misses
          console.warn('[ai_prefs_sync_failed] web pull');
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, userId]);

  const persistLlmState = useCallback(
    async (next: WebLlmState) => {
      setLlmState(next);
      if (!isAuthenticated || !userId) return;
      try {
        const supabase = getWebSupabaseClient();
        // `next` already has a single LWW clock from commit/reduce — push does not re-touch.
        const result = await pushWebAiPreferences(supabase, userId, next);
        setLlmState(result.state);
      } catch {
        // Local write already applied via commit inside push or caller.
        // eslint-disable-next-line no-console -- ops signal for RLS/migration misses
        console.warn('[ai_prefs_sync_failed] web push');
      }
    },
    [isAuthenticated, userId],
  );

  const goModelsList = useCallback(() => {
    setView({ tab: 'models', panel: 'list' });
  }, []);

  const goIntegrationsList = useCallback(() => {
    setView({ tab: 'integrations', panel: 'list' });
  }, []);

  return (
    <div className="settings-panel is-tab-enter" data-od-id="settings-ai">
      <h2>AI</h2>
      <p className="lead">
        Models for Ask. Integrations for agents that read your library.
      </p>
      {!allowed ? (
        <div className="banner" data-od-id="ai-lock-banner">
          <div className="grow">
            <strong>Account (Paid)</strong>
            <div className="sub" style={{ marginTop: 4 }}>
              Models &amp; Integrations
            </div>
          </div>
          {isAuthenticated ? (
            <button
              type="button"
              className="btn accent sm"
              data-od-id="settings-ai-upgrade"
              data-billing-kind={lockKind}
              data-testid="settings-ai-billing-cta"
              onClick={onBillingAction}
            >
              {lockLabel}
            </button>
          ) : (
            <Link
              to="/settings?tab=plan"
              className="btn accent sm"
              data-od-id="settings-ai-see-plan"
            >
              See plan
            </Link>
          )}
        </div>
      ) : null}

      <div
        className="seg ai-section-seg"
        role="tablist"
        aria-label="AI sections"
        data-od-id="ai-section-seg"
        style={{ marginBottom: 16 }}
      >
        <button
          type="button"
          role="tab"
          aria-selected={view.tab === 'models'}
          className={view.tab === 'models' ? 'active' : ''}
          data-od-id="ai-seg-models"
          onClick={goModelsList}
        >
          Models
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={view.tab === 'integrations'}
          className={view.tab === 'integrations' ? 'active' : ''}
          data-od-id="ai-seg-integrations"
          onClick={goIntegrationsList}
        >
          Integrations
        </button>
      </div>

      {prefsSyncNote ? (
        <p className="type-sub" data-od-id="ai-prefs-sync-note" role="status" style={{ marginBottom: 12 }}>
          {prefsSyncNote}
        </p>
      ) : null}

      {view.tab === 'models' ? (
        view.panel === 'provider' ? (
          <ProviderSetup
            provider={view.id}
            canConfigure={canConfigureModels}
            llmState={llmState}
            onBack={goModelsList}
            onStateChange={(s) => {
              void persistLlmState(s);
            }}
          />
        ) : (
          <ModelsList
            allowed={allowed}
            canConfigure={canConfigureModels}
            isAuthenticated={isAuthenticated}
            llmState={llmState}
            onOpenSetup={(id) => setView({ tab: 'models', panel: 'provider', id })}
          />
        )
      ) : view.panel === 'app' ? (
        <IntegrationSetup
          appId={view.id}
          mcpAllowed={mcpAllowed}
          onBack={goIntegrationsList}
        />
      ) : (
        <IntegrationsList
          mcpAllowed={mcpAllowed}
          onOpenApp={(id) => setView({ tab: 'integrations', panel: 'app', id })}
        />
      )}
    </div>
  );
}

function ModelsList({
  allowed,
  canConfigure,
  isAuthenticated,
  llmState,
  onOpenSetup,
}: {
  allowed: boolean;
  canConfigure: boolean;
  isAuthenticated: boolean;
  llmState: WebLlmState;
  onOpenSetup: (p: ProviderName) => void;
}): React.ReactElement {
  const defaultLabel = formatDefaultModelLabel(llmState);

  return (
    <div
      className={`block${allowed ? '' : ' is-ai-muted'}`}
      data-od-id="settings-configure-ai"
    >
      <p className="block-label">Models &amp; providers</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        Keys stay on this device (not synced). Used for web Chat on this browser;
        the extension has its own device keys.
      </p>
      {!isAuthenticated ? (
        <div className="banner" data-od-id="models-signin-banner" style={{ marginBottom: 12 }}>
          <div className="grow">
            <strong>Sign in</strong>
            <div className="sub" style={{ marginTop: 4 }}>
              Model setup requires a signed-in session.
            </div>
          </div>
          <Link to="/sign-in" className="btn accent sm" data-od-id="models-signin-cta">
            Sign in
          </Link>
        </div>
      ) : null}
      {IN_APP_LLM_PROVIDER_ORDER.map((id) => {
        const configured = isProviderConfigured(llmState, id);
        return (
          <div className="provider-row" key={id} data-od-id={`provider-${id}`}>
            <div className="grow">
              <div className="name">{PROVIDER_META[id].label}</div>
              {PROVIDER_META[id].blurb ? (
                <div className="sub">{PROVIDER_META[id].blurb}</div>
              ) : null}
            </div>
            <span className={`status${configured ? ' on' : ''}`}>
              {providerStatusLabel(id, configured)}
            </span>
            <button
              type="button"
              className="btn sm"
              disabled={!canConfigure}
              data-od-id={`provider-${id}-action`}
              onClick={() => onOpenSetup(id)}
            >
              {configured ? 'Configure' : 'Connect'}
            </button>
          </div>
        );
      })}
      <div className="setting-row" style={{ marginTop: 8 }} data-od-id="settings-default-model">
        <div className="grow">
          <div className="title">Default for Ask</div>
          <div className="sub">{defaultLabel}</div>
        </div>
      </div>
    </div>
  );
}

function ProviderSetup({
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
  const [apiKey, setApiKey] = useState(existing?.apiKey ?? '');
  const [apiBase, setApiBase] = useState(
    existing?.apiBase ?? (provider === 'ollama' ? 'http://localhost:11434' : ''),
  );
  const [model, setModel] = useState(existing?.model ?? getDefaultModelId(provider));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [ok, setOk] = useState<boolean | null>(null);

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
        // default allowDirectCloud=false: web cloud uses proxy only
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
        setMessage('Connection ok · ready for Chat on this device');
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
        <input
          className="field"
          type="text"
          value={model}
          disabled={!canConfigure || busy}
          onChange={(e) => setModel(e.target.value)}
          data-od-id="provider-model"
        />
      </label>
      <div className="ai-setup-actions">
        <button
          type="button"
          className="btn accent sm"
          disabled={!canConfigure || busy}
          data-od-id="provider-save-check"
          onClick={() => void saveAndCheck()}
        >
          {busy ? 'Checking…' : 'Save & check'}
        </button>
        {isProviderConfigured(llmState, provider) ? (
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

function IntegrationsList({
  mcpAllowed,
  onOpenApp,
}: {
  mcpAllowed: boolean;
  onOpenApp: (id: McpAiAppId) => void;
}): React.ReactElement {
  const { grants } = useOAuthGrants(mcpAllowed);
  const status = resolveIntegrationsStatus({
    mcpAllowed,
    oauthGrantCount: grants.length,
    hasRecentSession: false,
  });
  const remoteUrl = getMcpCloudUrl();
  const [urlCopied, setUrlCopied] = useState(false);

  return (
    <div
      className={`block${mcpAllowed ? '' : ' is-ai-muted'}`}
      data-od-id="settings-connect-ai"
    >
      <p className="block-label">Integrations</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        Let agents read your synced cloud library. No extension required.
      </p>

      <div className="setting-row" data-od-id="settings-mcp">
        <div className="grow">
          <div className="title">Cloud MCP</div>
          <div className="sub">
            {mcpAllowed
              ? 'OAuth for public hosts · Bearer JWT for scripts. Connected is an approved client, not a copied snippet.'
              : 'Account (Paid)'}
          </div>
        </div>
        <span className="status" data-od-id="settings-mcp-status">
          {integrationsStatusLabel(status)}
        </span>
      </div>

      {mcpAllowed ? (
        <div className="setting-row" data-od-id="settings-mcp-url">
          <div className="grow">
            <div className="title">Remote MCP URL</div>
            <div className="sub u-mono">{remoteUrl}</div>
          </div>
          <button
            type="button"
            className="btn sm"
            data-od-id="settings-mcp-copy-url"
            onClick={() => {
              void navigator.clipboard.writeText(remoteUrl).then(() => {
                setUrlCopied(true);
                setTimeout(() => setUrlCopied(false), 2000);
              });
            }}
          >
            {urlCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
      ) : null}

      <p className="block-label" style={{ marginTop: 16 }}>
        Host tips
      </p>
      <p className="type-sub" style={{ marginBottom: 8 }}>
        Cloud config for the agent you already use.
      </p>
      {MCP_AI_APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          className="integration-app-row"
          data-od-id={`mcp-app-${app.id}`}
          disabled={!mcpAllowed}
          onClick={() => onOpenApp(app.id)}
        >
          <span className="grow">
            <span className="title">{app.name}</span>
            <span className="sub">{app.sub}</span>
          </span>
          <span className="trail u-mono">Set up</span>
        </button>
      ))}
    </div>
  );
}

function IntegrationSetup({
  appId,
  mcpAllowed,
  onBack,
}: {
  appId: McpAiAppId;
  mcpAllowed: boolean;
  onBack: () => void;
}): React.ReactElement {
  const app = useMemo(() => getMcpAiApp(appId), [appId]);
  const snippet = useMemo(
    () => fillMcpConfigTemplate(app.configTemplate, { url: getMcpCloudUrl() }),
    [app.configTemplate],
  );
  const steps = useMemo(() => mcpSetupStepLabels(app, 'web'), [app]);

  return (
    <div className="block" data-od-id="settings-mcp-setup">
      <button
        type="button"
        className="btn ghost sm"
        data-od-id="mcp-setup-back"
        onClick={onBack}
        style={{ marginBottom: 12 }}
      >
        Back to integrations
      </button>
      <p className="block-label">Connect {app.name}</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        {app.configHint}
      </p>
      <ol className="ai-setup-steps" data-od-id="mcp-setup-steps">
        {steps.map((label, i) => (
          <li key={label}>
            <span className="step-num u-mono">{i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ol>
      {mcpAllowed ? (
        <div data-od-id="mcp-config-snippet">
          <CodeSnippetBlock label={app.configLabel} code={snippet} />
          <p className="type-sub" style={{ marginTop: 10 }}>
            Public hosts use OAuth. Power users can send{' '}
            <span className="u-mono">Authorization: Bearer</span> with a
            Supabase access token.
          </p>
        </div>
      ) : (
        <p className="type-sub">Upgrade to copy host config snippets.</p>
      )}
    </div>
  );
}
