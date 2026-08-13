/**
 * Web Settings → AI: Models & providers | Integrations.
 * Spec: docs/superpowers/specs/2026-08-12-ai-integrations-ia-standard.md
 *
 * Shell only for chrome; provider check + MCP catalog reuse shared modules.
 * Cloud MCP is the product path (ADR-029). Models stay on a separate tab.
 */

import React, { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  IntegrationsWebList,
  IntegrationsWebSetup,
} from '@/features/settings/integrations/IntegrationsWebPanel';
import { getMcpCloudUrl } from '@/shared/mcp/mcp-cloud-url';
import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import type { SettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import type { WebCaps } from '@/web/caps/resolveWebCaps';
import {
  pullWebAiPreferences,
  pushWebAiPreferences,
} from '@/web/lib/syncWebAiPreferences';
import { readWebLlmState, type WebLlmState } from '@/web/lib/webLlmKeys';
import { ModelsList } from './ModelsList';
import { ModelsProviderSetup } from './ModelsProviderSetup';

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
          <ModelsProviderSetup
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
        <IntegrationsWebSetup
          appId={view.id}
          mcpAllowed={mcpAllowed}
          remoteUrl={getMcpCloudUrl()}
          onBack={goIntegrationsList}
        />
      ) : (
        <IntegrationsWebList
          isAuthenticated={isAuthenticated}
          isPaidActive={caps.isPaidActive}
          onOpenApp={(id) => setView({ tab: 'integrations', panel: 'app', id })}
        />
      )}
    </div>
  );
}
