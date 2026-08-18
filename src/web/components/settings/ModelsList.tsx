import React from 'react';
import { Link } from 'react-router-dom';

import {
  PROVIDER_META,
  providerStatusLabel,
} from '@/features/ai/constants/provider-setup';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { IN_APP_LLM_PROVIDER_ORDER } from '@/shared/llm/in-app-providers';
import {
  formatDefaultModelLabel,
  isProviderConfigured,
  type WebLlmState,
} from '@/web/lib/webLlmKeys';

export function ModelsList({
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
        Keys stay on this device (not synced). Used for AI features on this browser;
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
            {isAuthenticated ? (
              <button
                type="button"
                className="btn sm"
                disabled={!canConfigure}
                data-od-id={`provider-${id}-action`}
                onClick={() => onOpenSetup(id)}
              >
                {configured ? 'Configure' : 'Connect'}
              </button>
            ) : null}
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
