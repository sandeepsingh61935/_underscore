import React from 'react';

import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';
import { Row } from '@/ui-system/components/primitives/Row';

export interface McpConnectionsHubProps {
  mcpAllowed: boolean;
  isAuthenticated: boolean;
  bridgeEnabled: boolean;
  token: string;
  activeAppIds: readonly McpAiAppId[];
  lockMessage?: string | null;
  onDismissLockMessage?: () => void;
  onLockedInteract: () => void;
  onToggleBridge: () => void;
  onTokenChange: (token: string) => void;
  onTokenBlur: () => void;
  onCopyToken: () => void;
  tokenCopied?: boolean;
  onAddApp: () => void;
  onOpenActive: (id: McpAiAppId) => void;
}

export function McpConnectionsHub({
  mcpAllowed,
  isAuthenticated,
  bridgeEnabled,
  token,
  activeAppIds,
  lockMessage,
  onDismissLockMessage,
  onLockedInteract,
  onToggleBridge,
  onTokenChange,
  onTokenBlur,
  onCopyToken,
  tokenCopied = false,
  onAddApp,
  onOpenActive,
}: McpConnectionsHubProps): React.ReactElement {
  const locked = !mcpAllowed;
  const activeApps = activeAppIds.map((id) => getMcpAiApp(id));

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
          Use your highlights in the agent you already use
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
              You connect your own AI — no token cost from _underscore. Toggle and apps stay visible so you know what you get.
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
              {isAuthenticated ? 'Upgrade · Coming soon' : 'Sign in to continue'}
            </button>
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
          title="Let AI apps read highlights"
          sub={
            locked
              ? 'Locked'
              : bridgeEnabled
                ? 'On · bridge listening'
                : 'Off · nothing can reach this library'
          }
          right={
            <span
              className="u-mono"
              style={{
                fontSize: 'var(--step--2)',
                color: !locked && bridgeEnabled ? 'var(--accent)' : 'var(--ink-3)',
              }}
              aria-hidden="true"
            >
              {!locked && bridgeEnabled ? 'On' : 'Off'}
            </span>
          }
          onClick={() => tryInteract(onToggleBridge)}
          role="switch"
          aria-checked={!locked && bridgeEnabled}
          aria-disabled={locked}
          compact
        />

        {bridgeEnabled && !locked ? (
          <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}>
            <div className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}>
              Security code
            </div>
            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.4 }}>
              Same value in every client config (UNDERSCORE_MCP_TOKEN)
            </div>
            <input
              type="password"
              value={token}
              onChange={(e) => onTokenChange(e.target.value)}
              onBlur={onTokenBlur}
              placeholder="Paste or generate a code"
              autoComplete="off"
              aria-label="Security code"
              style={{
                marginTop: 8,
                padding: 8,
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                color: 'var(--ink)',
                fontFamily: 'var(--mono)',
                fontSize: 'var(--step-1)',
                width: '100%',
                boxSizing: 'border-box',
                minHeight: 44,
              }}
            />
            <button
              type="button"
              className="u-mono"
              onClick={onCopyToken}
              disabled={!token}
              style={{
                marginTop: 8,
                border: 'none',
                background: 'transparent',
                color: token ? 'var(--accent)' : 'var(--ink-3)',
                cursor: token ? 'pointer' : 'default',
                fontSize: 'var(--step--2)',
                padding: 0,
                minHeight: 44,
              }}
            >
              {tokenCopied ? 'Copied' : 'Copy code'}
            </button>
          </div>
        ) : null}
      </div>

      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Active
      </div>
      {activeApps.length === 0 || locked ? (
        <div style={{ padding: '8px 16px 12px' }}>
          <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}>
            {locked
              ? 'Connections unlock with Account (Paid).'
              : 'No connections yet. Add an AI app, finish setup, then Check connection.'}
          </div>
        </div>
      ) : (
        activeApps.map((app) => (
          <Row
            key={app.id}
            title={app.name}
            sub={app.sub}
            right={
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}>
                Connected
              </span>
            }
            onClick={() => onOpenActive(app.id)}
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
          Add an AI app
        </button>
      </div>
    </div>
  );
}
