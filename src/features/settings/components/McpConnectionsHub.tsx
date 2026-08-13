import React from 'react';

import {
  integrationsStatusLabel,
  type IntegrationsStatus,
} from '@/shared/mcp/integrations-status';
import { Row } from '@/ui-system/components/primitives/Row';

export interface McpConnectionsHubProps {
  mcpAllowed: boolean;
  isAuthenticated: boolean;
  status: IntegrationsStatus;
  remoteUrl: string;
  urlCopied?: boolean;
  showLegacyNotice?: boolean;
  lockMessage?: string | null;
  grantsError?: string | null;
  onDismissLockMessage?: () => void;
  onLockedInteract: () => void;
  onCopyUrl: () => void;
  onAddApp: () => void;
  onOpenActive?: (id: string) => void;
  connectedApps: readonly { id: string; title: string; sub: string }[];
}

export function McpConnectionsHub({
  mcpAllowed,
  isAuthenticated,
  status,
  remoteUrl,
  urlCopied = false,
  showLegacyNotice = false,
  lockMessage,
  grantsError,
  onDismissLockMessage,
  onLockedInteract,
  onCopyUrl,
  onAddApp,
  onOpenActive,
  connectedApps,
}: McpConnectionsHubProps): React.ReactElement {
  const locked = !mcpAllowed;

  const tryInteract = (fn: () => void): void => {
    if (locked) {
      onLockedInteract();
      return;
    }
    fn();
  };

  return (
    <div data-testid="mcp-connections-hub">
      <div style={{ padding: '12px 16px 8px' }}>
        <div
          className="u-sans"
          style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}
        >
          Let agents read your synced cloud library. No extension required.
        </div>
      </div>

      {lockMessage ? (
        <div style={{ padding: '0 16px 8px' }} role="status">
          <div
            style={{
              padding: 12,
              border: '1px solid var(--rule)',
              background: 'var(--paper-2)',
            }}
          >
            <div className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}>
              Locked
            </div>
            <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.45 }}>
              {lockMessage}
            </div>
            {onDismissLockMessage ? (
              <button
                type="button"
                className="u-mono"
                onClick={onDismissLockMessage}
                style={{
                  marginTop: 8,
                  border: 'none',
                  background: 'transparent',
                  color: 'var(--accent)',
                  cursor: 'pointer',
                  fontSize: 'var(--step--2)',
                  padding: 0,
                  minHeight: 44,
                }}
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {locked ? (
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ padding: 14, border: '1px solid var(--rule-soft)', background: 'var(--paper-2)' }}>
            <div className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500 }}>
              Included with Account (Paid)
            </div>
            <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.45 }}>
              Integrations stay visible so you can see what Paid unlocks. Setup does not ask for model keys.
            </div>
            <button
              type="button"
              className="u-caps"
              onClick={onLockedInteract}
              style={{
                marginTop: 10,
                width: '100%',
                minHeight: 44,
                border: '1px solid var(--accent)',
                background: 'var(--accent)',
                color: 'var(--paper)',
                cursor: 'pointer',
                fontSize: 'var(--step--2)',
              }}
            >
              {isAuthenticated ? 'Upgrade in Settings' : 'Sign in to continue'}
            </button>
          </div>
        </div>
      ) : null}

      {grantsError && !locked ? (
        <div style={{ padding: '0 16px 10px' }} role="status" data-testid="mcp-grants-error">
          <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}>
            {grantsError}
          </div>
        </div>
      ) : null}

      {showLegacyNotice && !locked ? (
        <div style={{ padding: '0 16px 10px' }} data-testid="mcp-legacy-bridge-notice">
          <div style={{ padding: 12, border: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
            <div className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500 }}>
              Local bridge is no longer the product path
            </div>
            <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.45 }}>
              Move hosts to Cloud MCP (remote URL + OAuth or Bearer JWT). The local bridge may still run until it is removed.
            </div>
          </div>
        </div>
      ) : null}

      <div
        style={{
          margin: '0 16px 10px',
          padding: 12,
          border: '1px solid var(--rule)',
          opacity: locked ? 0.65 : 1,
        }}
      >
        <Row
          title="Status"
          sub={
            locked
              ? 'Off until Account (Paid)'
              : status === 'connected'
                ? 'At least one approved OAuth client'
                : 'Ready — copy the URL. Connected is not “I copied the snippet”.'
          }
          right={
            <span
              className="u-mono"
              data-testid="mcp-integrations-status"
              style={{
                fontSize: 'var(--step--2)',
                color: !locked && status === 'connected' ? 'var(--accent)' : 'var(--ink-3)',
              }}
            >
              {integrationsStatusLabel(status)}
            </span>
          }
          compact
        />

        {!locked ? (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}>
            <div className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}>
              Remote MCP URL
            </div>
            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.4 }}>
              OAuth for public hosts · Bearer JWT for scripts
            </div>
            <div
              className="u-mono"
              data-testid="mcp-remote-url"
              style={{
                marginTop: 8,
                padding: 8,
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontSize: 'var(--step--2)',
                wordBreak: 'break-all',
                minHeight: 44,
              }}
            >
              {remoteUrl}
            </div>
            <button
              type="button"
              className="u-mono"
              onClick={() => tryInteract(onCopyUrl)}
              style={{
                marginTop: 8,
                border: 'none',
                background: 'transparent',
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 'var(--step--2)',
                padding: 0,
                minHeight: 44,
              }}
            >
              {urlCopied ? 'Copied' : 'Copy URL'}
            </button>
          </div>
        ) : null}
      </div>

      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Connected
      </div>
      {connectedApps.length === 0 || locked ? (
        <div style={{ padding: '8px 16px 12px' }}>
          <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}>
            {locked
              ? 'Connections unlock with Account (Paid).'
              : 'No OAuth clients yet. Connected is not “I copied the snippet”.'}
          </div>
        </div>
      ) : (
        connectedApps.map((app) => (
          <Row
            key={app.id}
            title={app.title}
            sub={app.sub}
            right={
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}>
                Connected
              </span>
            }
            onClick={onOpenActive ? () => onOpenActive(app.id) : undefined}
          />
        ))
      )}

      <div style={{ padding: '8px 16px 16px' }}>
        <button
          type="button"
          className="u-caps"
          onClick={() => tryInteract(onAddApp)}
          style={{
            width: '100%',
            minHeight: 44,
            border: '1px solid var(--accent)',
            background: locked ? 'var(--paper-2)' : 'var(--accent)',
            color: locked ? 'var(--ink-3)' : 'var(--paper)',
            cursor: 'pointer',
            fontSize: 'var(--step--2)',
          }}
        >
          Host tips
        </button>
      </div>
    </div>
  );
}
