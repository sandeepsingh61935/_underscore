import React, { useCallback, useEffect, useId, useMemo, useState } from 'react';

import {
  MCP_BRIDGE_STORAGE_KEYS,
  MCP_BRIDGE_HOST,
  MCP_BRIDGE_PORT,
} from '@/shared/constants/mcp-bridge';
import type { BridgeConnectionState } from '@/shared/mcp/bridge-protocol';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { featureGateSubtitle } from '@/shared/utils/feature-gate-copy';
import { canUseMcp, getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';
import { McpBridgeSetupGuide } from '@/features/settings/components/McpBridgeSetupGuide';
import { McpTierCallout, mcpTierLabel } from '@/features/settings/components/McpTierCallout';
import { Row } from '@/ui-system/components/primitives/Row';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

const srOnlyStyle: React.CSSProperties = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
};

export interface McpBridgeSettingsProps {
  isAuthenticated: boolean;
  currentMode: ModeType;
  isPaidActive?: boolean;
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

function connectionLabel(state: BridgeConnectionState, enabled: boolean): string {
  if (!enabled) return 'disabled';
  switch (state) {
    case 'connected':
      return 'connected';
    case 'connecting':
      return 'connecting';
    case 'error':
      return 'error';
    default:
      return 'disconnected';
  }
}

function connectionColor(state: BridgeConnectionState, enabled: boolean): string {
  if (!enabled) return 'var(--ink-3)';
  if (state === 'connected') return 'var(--accent)';
  if (state === 'error') return 'var(--ink)';
  return 'var(--ink-3)';
}

export function McpBridgeSettings({
  isAuthenticated,
  currentMode,
  isPaidActive = false,
  onSignIn,
}: McpBridgeSettingsProps): React.ReactElement {
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [connectionState, setConnectionState] = useState<BridgeConnectionState>('disconnected');
  const [copied, setCopied] = useState(false);

  const mcpGate = useMemo(
    () =>
      canUseMcp({
        mode: currentMode,
        capabilities: getCapabilitiesForMode(currentMode),
        isAuthenticated,
        storageScope: isAuthenticated ? 'pro' : 'basic',
        isPaidActive,
      }),
    [currentMode, isAuthenticated, isPaidActive],
  );
  const mcpAllowed = mcpGate.allowed;

  const tierLabel = mcpTierLabel(isAuthenticated, currentMode);
  const bridgeSub = mcpAllowed
    ? isAuthenticated
      ? 'Cursor or Claude Desktop via extension bridge'
      : 'This device only — Cursor or Claude Desktop'
    : featureGateSubtitle(mcpGate.reason);
  const tokenFieldId = useId();
  const tokenHelpId = useId();
  const statusLiveId = useId();
  const endpoint = `${MCP_BRIDGE_HOST}:${MCP_BRIDGE_PORT}`;
  const statusText = connectionLabel(connectionState, enabled);

  useEffect(() => {
    void readBridgeSettings().then(async (s) => {
      setToken(s.token);
      setConnectionState(s.connectionState);

      if (!mcpAllowed && s.enabled) {
        await chrome.storage.local.set({ [MCP_BRIDGE_STORAGE_KEYS.enabled]: false });
        setEnabled(false);
        return;
      }

      setEnabled(s.enabled);
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
  }, [mcpAllowed]);

  const persist = useCallback(async (nextEnabled: boolean, nextToken: string): Promise<void> => {
    await chrome.storage.local.set({
      [MCP_BRIDGE_STORAGE_KEYS.enabled]: nextEnabled,
      [MCP_BRIDGE_STORAGE_KEYS.token]: nextToken.trim(),
    });
  }, []);

  const toggleBridge = useCallback((): void => {
    if (!mcpAllowed) {
      if (!isAuthenticated) {
        onSignIn?.();
      }
      return;
    }
    const next = !enabled;
    setEnabled(next);
    void persist(next, token);
  }, [enabled, isAuthenticated, mcpAllowed, onSignIn, persist, token]);

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
        <span id="mcp-bridge-heading">MCP Bridge</span>
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
          <span
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: mcpAllowed && enabled ? 'var(--accent)' : 'var(--ink-3)',
            }}
            aria-hidden="true"
          >
            {mcpAllowed ? (enabled ? 'On' : 'Off') : '—'}
          </span>
        }
        onClick={toggleBridge}
        aria-checked={mcpAllowed ? enabled : false}
        aria-disabled={!mcpAllowed}
        role="switch"
      />

      <Row
        title="Endpoint"
        sub={endpoint}
        right={
          enabled && connectionState === 'connecting' ? (
            <Spinner size="sm" />
          ) : (
            <span
              className="u-mono"
              style={{ fontSize: 'var(--step--2)', color: connectionColor(connectionState, enabled) }}
              aria-hidden="true"
            >
              {statusText}
            </span>
          )
        }
      />

      <span id={statusLiveId} style={srOnlyStyle} aria-live="polite">
        {enabled ? `Bridge ${statusText}` : 'Bridge disabled'}
      </span>

      {mcpAllowed ? (
        <McpBridgeSetupGuide
          enabled={enabled}
          token={token}
          connectionState={connectionState}
          isAuthenticated={isAuthenticated}
        />
      ) : null}

      {mcpAllowed && isAuthenticated ? (
        <Row
          title="ChatGPT / cloud MCP"
          sub="Deploy the cloud worker, then approve access under Connected apps"
          right={
            <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
              Paid
            </span>
          }
        />
      ) : null}

      {mcpAllowed ? (
        <div style={{ padding: '8px 16px 12px', borderBottom: '1px solid var(--rule-soft)' }}>
          <label
            htmlFor={tokenFieldId}
            className="u-sans"
            style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: 'var(--step-1)' }}
          >
            <span style={{ color: 'var(--ink-soft)' }}>Session token</span>
            <span id={tokenHelpId} className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
              Same value as UNDERSCORE_MCP_TOKEN in mcp.json
            </span>
            <input
              id={tokenFieldId}
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              onBlur={() => void persist(enabled, token)}
              placeholder="Paste token from MCP server startup"
              autoComplete="off"
              aria-describedby={tokenHelpId}
              style={{
                padding: '8px',
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
          </label>
          <button
            type="button"
            className="u-caps"
            style={{ marginTop: '8px', fontSize: 'var(--step--2)', minHeight: 44 }}
            onClick={() => {
              if (!token) return;
              void navigator.clipboard.writeText(token).then(() => {
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              });
            }}
            disabled={!token}
            aria-live="polite"
          >
            {copied ? 'Copied' : 'Copy token'}
          </button>
        </div>
      ) : null}
    </>
  );
}
