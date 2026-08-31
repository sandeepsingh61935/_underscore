import React from 'react';

import {
  IntegrationsConnectChrome,
  INTEGRATIONS_ADVANCED_COPY,
} from '@/features/settings/integrations/IntegrationsConnectChrome';
import { type IntegrationsStatus } from '@/shared/mcp/integrations-status';
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
          style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45 }}
        >
          Use your highlights in the agent you already use. OAuth happens in your agent —
          not in this app.
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
            <div
              className="u-sans"
              style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}
            >
              Locked
            </div>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink)',
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
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
          <div
            style={{
              padding: 14,
              border: '1px solid var(--rule-soft)',
              background: 'var(--paper-2)',
            }}
          >
            <div
              className="u-sans"
              style={{ fontSize: 'var(--step-0)', fontWeight: 500 }}
            >
              Included with Account (Paid)
            </div>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink)',
                marginTop: 6,
                lineHeight: 1.45,
              }}
            >
              Integrations stay visible so you can see what Paid unlocks. Setup does not
              ask for model keys.
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
        <div
          style={{ padding: '0 16px 10px' }}
          role="status"
          data-testid="mcp-grants-error"
        >
          <div
            className="u-sans"
            style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45 }}
          >
            {grantsError}
          </div>
        </div>
      ) : null}

      {showLegacyNotice && !locked ? (
        <div style={{ padding: '0 16px 10px' }} data-testid="mcp-legacy-bridge-notice">
          <div
            style={{
              padding: 12,
              border: '1px solid var(--rule)',
              background: 'var(--paper-2)',
            }}
          >
            <div
              className="u-sans"
              style={{ fontSize: 'var(--step-0)', fontWeight: 500 }}
            >
              Local bridge is no longer the product path
            </div>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink)',
                marginTop: 4,
                lineHeight: 1.45,
              }}
            >
              Move hosts to Cloud MCP (remote URL + OAuth or Bearer JWT). The local bridge
              may still run until it is removed.
            </div>
          </div>
        </div>
      ) : null}

      <div style={{ padding: '0 16px' }}>
        <IntegrationsConnectChrome
          mcpAllowed={mcpAllowed}
          status={status}
          grantTitles={connectedApps.map((app) => app.title)}
          lockedDetail="Off until Account (Paid)"
        />
      </div>

      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink)' }}>
        Active
      </div>
      {connectedApps.length === 0 || locked ? (
        <div style={{ padding: '8px 16px 12px' }}>
          <div
            className="u-sans"
            style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45 }}
          >
            {locked
              ? 'Connections unlock with Account (Paid).'
              : 'Nothing connected yet. Add an AI app, then approve when the browser opens.'}
          </div>
        </div>
      ) : (
        connectedApps.map((app) => (
          <Row
            key={app.id}
            title={app.title}
            sub={app.sub}
            right={
              <span
                className="u-mono"
                style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}
              >
                Connected
              </span>
            }
            onClick={onOpenActive ? () => onOpenActive(app.id) : undefined}
          />
        ))
      )}

      <div style={{ padding: '8px 16px 12px' }}>
        <button
          type="button"
          className="u-caps"
          data-testid="mcp-add-ai-app"
          onClick={() => tryInteract(onAddApp)}
          style={{
            width: '100%',
            minHeight: 44,
            border: '1px solid var(--accent)',
            background: locked ? 'var(--paper-2)' : 'var(--accent)',
            color: locked ? 'var(--ink)' : 'var(--paper)',
            cursor: 'pointer',
            fontSize: 'var(--step--2)',
          }}
        >
          Add an AI app
        </button>
      </div>

      {!locked ? (
        <div style={{ padding: '0 16px 16px' }}>
          <details data-testid="mcp-server-details">
            <summary
              className="u-mono"
              style={{
                color: 'var(--accent)',
                cursor: 'pointer',
                fontSize: 'var(--step--2)',
                minHeight: 44,
                display: 'flex',
                alignItems: 'center',
              }}
            >
              Server details
            </summary>
            <div
              className="u-sans"
              style={{
                fontSize: 'var(--step-0)',
                fontWeight: 500,
                color: 'var(--ink)',
                marginTop: 4,
              }}
            >
              Remote MCP URL
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
              className="u-caps btn sm"
              data-od-id="settings-mcp-copy-url"
              data-testid="mcp-copy-url"
              onClick={() => tryInteract(onCopyUrl)}
              style={{
                marginTop: 10,
                width: '100%',
                minHeight: 44,
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                cursor: 'pointer',
                fontSize: 'var(--step--2)',
              }}
            >
              {urlCopied ? 'Copied' : 'Copy URL'}
            </button>
            <p
              className="u-sans type-sub"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink)',
                lineHeight: 1.45,
                margin: '12px 0 0',
              }}
            >
              {INTEGRATIONS_ADVANCED_COPY}
            </p>
          </details>
        </div>
      ) : null}
    </div>
  );
}
