import React from 'react';

import { StatusDot } from './StatusDot';

import {
  PROVIDER_META,
  SETUP_PROVIDERS,
  formatModelDisplayName,
  providerStatusLabel,
  type ProviderMeta,
} from '@/features/ai/constants/provider-setup';
import type { ProviderStatusSnapshot } from '@/features/ai/hooks/useAllProviderStatuses';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';

export interface ModelsHubPanelProps {
  activeProvider: ProviderName | null;
  activeModelId: string | null;
  statuses: Partial<Record<ProviderName, ProviderStatusSnapshot>>;
  onOpenProvider: (provider: ProviderName) => void;
  onChangeActiveModel: () => void;
}

function providerSubtitle(provider: ProviderName, snapshot: ProviderStatusSnapshot | undefined): string {
  const meta: ProviderMeta = PROVIDER_META[provider];
  if (provider === 'ollama') return snapshot?.configured ? 'Local' : 'Not connected';
  if (snapshot?.configured && snapshot.model) {
    return formatModelDisplayName(snapshot.model);
  }
  return meta.shortLabel;
}

export function ModelsHubPanel({
  activeProvider,
  activeModelId,
  statuses,
  onOpenProvider,
  onChangeActiveModel,
}: ModelsHubPanelProps): React.ReactElement {
  const hasActive = Boolean(activeProvider && activeModelId);
  const activeLabel = activeModelId ? formatModelDisplayName(activeModelId) : 'None selected';
  const activeProviderLabel = activeProvider ? PROVIDER_META[activeProvider].label : null;

  return (
    <div
      data-testid="models-hub"
      style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}
    >
      <div style={{ padding: '12px 16px 10px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-2)', letterSpacing: '-0.02em' }}>
          Models &amp; providers
        </div>
        <p
          className="u-mono"
          style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: '6px 0 0' }}
        >
          Keys stay on this device. Used for Ask on this browser.
        </p>
      </div>

      <button
        type="button"
        onClick={onChangeActiveModel}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'block',
          margin: '0 12px 12px',
          padding: '12px 14px',
          border: '1px solid var(--rule-soft)',
          background: 'var(--paper-2)',
          boxSizing: 'border-box',
          width: 'calc(100% - 24px)',
        }}
      >
        <div className="u-kicker" style={{ fontSize: 'var(--step--2)' }}>Active</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
          <StatusDot connected={hasActive} />
          <div style={{ minWidth: 0, flex: 1, textAlign: 'left' }}>
            <div
              style={{
                fontSize: 'var(--step-0)',
                color: 'var(--ink)',
                fontWeight: 600,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {activeLabel}
            </div>
            {activeProviderLabel ? (
              <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 2 }}>
                {activeProviderLabel}
              </div>
            ) : null}
          </div>
          <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)', flexShrink: 0 }}>
            Change
          </span>
        </div>
      </button>

      <div className="u-kicker" style={{ padding: '0 16px 6px' }}>
        Providers
      </div>

      <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
        {SETUP_PROVIDERS.map(provider => {
          const snapshot = statuses[provider];
          const configured = snapshot?.configured ?? null;
          const isActive = activeProvider === provider;
          return (
            <button
              key={provider}
              type="button"
              onClick={() => onOpenProvider(provider)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'grid',
                gridTemplateColumns: 'auto 1fr auto',
                gap: 10,
                alignItems: 'center',
                width: '100%',
                boxSizing: 'border-box',
                padding: '12px 16px',
                minHeight: 44,
                borderBottom: '1px solid var(--rule-soft)',
                background: isActive ? 'var(--paper-2)' : 'transparent',
              }}
            >
              <StatusDot connected={Boolean(configured)} pending={configured === null} />
              <div style={{ minWidth: 0, textAlign: 'left' }}>
                <div style={{ fontSize: 'var(--step-0)', color: 'var(--ink)', fontWeight: 500 }}>
                  {PROVIDER_META[provider].label}
                </div>
                <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 2 }}>
                  {providerSubtitle(provider, snapshot)}
                </div>
              </div>
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                {providerStatusLabel(provider, configured)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
