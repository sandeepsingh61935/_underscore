/**
 * About / legal rows — prototype viewSettings() aboutBlock
 * Three rows: Privacy Policy / Terms of Service / Help — 44px min-height, trail ›
 */
import React from 'react';

import { openLegalDoc } from '@/shared/auth/web-legal-urls';

export function SettingsLegalFooter(): React.ReactElement {
  return (
    <div data-od-id="settings-section-about" data-testid="settings-legal-footer">
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        About
      </div>
      <button
        type="button"
        className="row"
        data-action="open-legal"
        data-doc="privacy"
        data-testid="settings-legal-privacy"
        data-od-id="settings-legal-privacy"
        onClick={() => openLegalDoc('/privacy')}
      >
        <div>
          <div className="title">Privacy Policy</div>
          <div className="sub">How we handle your data</div>
        </div>
        <span className="trail" aria-hidden="true">
          ›
        </span>
      </button>
      <button
        type="button"
        className="row"
        data-action="open-legal"
        data-doc="terms"
        data-testid="settings-legal-terms"
        data-od-id="settings-legal-terms"
        onClick={() => openLegalDoc('/terms')}
      >
        <div>
          <div className="title">Terms of Service</div>
          <div className="sub">Rules of use</div>
        </div>
        <span className="trail" aria-hidden="true">
          ›
        </span>
      </button>
      <button
        type="button"
        className="row"
        data-action="open-legal"
        data-doc="help"
        data-testid="settings-legal-help"
        data-od-id="settings-legal-help"
        onClick={() => {
          // Help is not a LegalDocPath — open via web origin directly
          const origin = (() => {
            try {
              const env = (import.meta as unknown as { env?: Record<string, string> }).env?.['VITE_WEB_APP_URL'];
              if (env) return new URL(env.includes('://') ? env : `https://${env}`).origin;
            } catch {}
            return null;
          })();
          const url = origin ? `${origin}/help` : '/help';
          if (typeof chrome !== 'undefined' && chrome.tabs?.create) void chrome.tabs.create({ url });
          else if (typeof window !== 'undefined') window.open(url, '_blank', 'noopener,noreferrer');
        }}
      >
        <div>
          <div className="title">Help</div>
          <div className="sub">FAQ and install guide</div>
        </div>
        <span className="trail" aria-hidden="true">
          ›
        </span>
      </button>
    </div>
  );
}
