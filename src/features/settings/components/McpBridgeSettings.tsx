import React, { useCallback, useEffect, useState } from 'react';

import {
  MCP_BRIDGE_STORAGE_KEYS,
  MCP_BRIDGE_HOST,
  MCP_BRIDGE_PORT,
} from '@/shared/constants/mcp-bridge';
import type { BridgeConnectionState } from '@/shared/mcp/bridge-protocol';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { McpTierCallout, mcpTierLabel } from '@/features/settings/components/McpTierCallout';
import { Row } from '@/ui-system/components/primitives/Row';

export interface McpBridgeSettingsProps {
  isAuthenticated: boolean;
  currentMode: ModeType;
  onSignIn?: () => void;
}

async function readBridgeSettings(): Promise<{
  enabled: boolean;
  token: string;
  connectionState: BridgeConnectionState;
}> {
  const stored = await chrome.storage.local.get([
    MCP_BRIDGE_STORAGE_KEYS.enabled,
    MCP_BRIDGE_STORAGE_KEYS.token,
    MCP_BRIDGE_STORAGE_KEYS.connectionState,
  ]);
  const rawState = stored[MCP_BRIDGE_STORAGE_KEYS.connectionState];
  const connectionState =
    rawState === 'connected' || rawState === 'connecting' || rawState === 'error'
      ? rawState
      : 'disconnected';

  return {
    enabled: stored[MCP_BRIDGE_STORAGE_KEYS.enabled] === true,
    token: typeof stored[MCP_BRIDGE_STORAGE_KEYS.token] === 'string'
      ? (stored[MCP_BRIDGE_STORAGE_KEYS.token] as string)
      : '',
    connectionState,
  };
}

export function McpBridgeSettings({
  isAuthenticated,
  currentMode,
  onSignIn,
}: McpBridgeSettingsProps): React.ReactElement {
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [connectionState, setConnectionState] = useState<BridgeConnectionState>('disconnected');
  const [copied, setCopied] = useState(false);

  const tierLabel = mcpTierLabel(isAuthenticated, currentMode);
  const bridgeSub = isAuthenticated
    ? 'Cursor / Claude Desktop via extension bridge'
    : 'This device only — Cursor or Claude Desktop';

  useEffect(() => {
    void readBridgeSettings().then((s) => {
      setEnabled(s.enabled);
      setToken(s.token);
      setConnectionState(s.connectionState);
    });

    const onChanged = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ): void => {
      if (area !== 'local') return;
      if (changes[MCP_BRIDGE_STORAGE_KEYS.enabled]) {
        setEnabled(changes[MCP_BRIDGE_STORAGE_KEYS.enabled]?.newValue === true);
      }
      if (changes[MCP_BRIDGE_STORAGE_KEYS.token]) {
        const next = changes[MCP_BRIDGE_STORAGE_KEYS.token]?.newValue;
        setToken(typeof next === 'string' ? next : '');
      }
      if (changes[MCP_BRIDGE_STORAGE_KEYS.connectionState]) {
        const next = changes[MCP_BRIDGE_STORAGE_KEYS.connectionState]?.newValue;
        if (next === 'connected' || next === 'connecting' || next === 'error' || next === 'disconnected') {
          setConnectionState(next);
        }
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  const persist = useCallback(async (nextEnabled: boolean, nextToken: string): Promise<void> => {
    await chrome.storage.local.set({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: nextEnabled,
      [MCP_BRIDGE_STORAGE_KEYS.token]: nextToken.trim(),
    });
  }, []);

  const endpoint = `${MCP_BRIDGE_HOST}:${MCP_BRIDGE_PORT}`;

  return (
    <>
      <div
        className="u-caps"
        style={{
          padding: '10px 16px 4px',
          color: 'var(--ink-3)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span>MCP Bridge</span>
        <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
          {tierLabel}
        </span>
      </div>

      <McpTierCallout
        isAuthenticated={isAuthenticated}
        currentMode={currentMode}
        onSignIn={onSignIn}
      />

      <Row
        title="Allow MCP bridge"
        sub={bridgeSub}
        right={
          <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}>
            {enabled ? 'On' : 'Off'}
          </span>
        }
        onClick={() => {
          const next = !enabled;
          setEnabled(next);
          void persist(next, token);
        }}
      />
      <Row
        title="Endpoint"
        sub={endpoint}
        right={
          <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
            {enabled ? connectionState : 'disabled'}
          </span>
        }
      />
      {isAuthenticated && (
        <Row
          title="ChatGPT / cloud MCP"
          sub="Deploy the cloud worker (see packages/mcp-server README). Pro library only."
          right={
            <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
              Pro
            </span>
          }
        />
      )}
      <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--rule-soft)' }}>
        <label className="u-sans" style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--step-1)' }}>
          <span style={{ color: 'var(--ink-soft)' }}>Session token (UNDERSCORE_MCP_TOKEN in mcp.json)</span>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            onBlur={() => void persist(enabled, token)}
            placeholder="Paste token from MCP server startup"
            style={{
              padding: '8px',
              border: '1px solid var(--rule)',
              background: 'var(--paper)',
              color: 'var(--ink)',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--step-1)',
              width: '100%',
              boxSizing: 'border-box',
            }}
          />
        </label>
        <button
          type="button"
          className="u-caps"
          style={{ marginTop: '8px', fontSize: 'var(--step--2)' }}
          onClick={() => {
            if (!token) return;
            void navigator.clipboard.writeText(token).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          disabled={!token}
        >
          {copied ? 'Copied' : 'Copy token'}
        </button>
      </div>
    </>
  );
}
