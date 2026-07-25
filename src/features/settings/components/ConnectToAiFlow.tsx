import React, { useCallback, useEffect, useState } from 'react';

import { McpAppPicker } from '@/features/settings/components/McpAppPicker';
import { McpClientSetupView, type McpCheckResult } from '@/features/settings/components/McpClientSetupView';
import { McpConnectionsHub } from '@/features/settings/components/McpConnectionsHub';
import {
  connectToAiBackLabel,
  connectToAiPageTitle,
  popConnectScreen,
  pushConnectScreen,
  type ConnectToAiScreen,
} from '@/features/settings/mcp/connect-to-ai-nav';
import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';
import {
  markMcpAppActive,
  persistMcpBridgeEnabled,
  persistMcpBridgeToken,
  readMcpBridgeUiState,
} from '@/features/settings/mcp/mcp-bridge-ui-state';
import { MCP_BRIDGE_STORAGE_KEYS } from '@/shared/constants/mcp-bridge';
import type { BridgeConnectionState } from '@/shared/mcp/bridge-protocol';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { canUseMcp, getCapabilitiesForMode } from '@/shared/utils/mode-capabilities';

export interface ConnectToAiFlowProps {
  isAuthenticated: boolean;
  currentMode: ModeType;
  onSignIn?: () => void;
  /** Exit full-screen Connect flow back to Settings root. */
  onExit?: () => void;
  /** Fired when nav stack depth changes (1 = hub). */
  onStackDepthChange?: (depth: number) => void;
}

export function ConnectToAiFlow({
  isAuthenticated,
  currentMode,
  onSignIn,
  onExit,
  onStackDepthChange,
}: ConnectToAiFlowProps): React.ReactElement {
  const [stack, setStack] = useState<ConnectToAiScreen[]>([{ kind: 'hub' }]);
  const [enabled, setEnabled] = useState(false);
  const [token, setToken] = useState('');
  const [connectionState, setConnectionState] = useState<BridgeConnectionState>('disconnected');
  const [activeApps, setActiveApps] = useState<McpAiAppId[]>([]);
  const [checkResult, setCheckResult] = useState<McpCheckResult>('idle');
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [tokenCopied, setTokenCopied] = useState(false);

  const mcpAllowed = canUseMcp({
    mode: currentMode,
    capabilities: getCapabilitiesForMode(currentMode),
    isAuthenticated,
    storageScope: isAuthenticated ? 'pro' : 'basic',
  }).allowed;

  const screen = stack[stack.length - 1] ?? { kind: 'hub' as const };

  useEffect(() => {
    onStackDepthChange?.(stack.length);
  }, [onStackDepthChange, stack.length]);

  useEffect(() => {
    void readMcpBridgeUiState().then((s) => {
      setEnabled(s.enabled);
      setToken(s.token);
      setConnectionState(s.connectionState);
      setActiveApps(s.activeApps);
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
      if (changes[MCP_BRIDGE_STORAGE_KEYS.activeApps]) {
        void readMcpBridgeUiState().then((s) => setActiveApps(s.activeApps));
      }
    };
    chrome.storage.onChanged.addListener(onChanged);
    return () => chrome.storage.onChanged.removeListener(onChanged);
  }, []);

  useEffect(() => {
    if (!mcpAllowed && enabled) {
      void persistMcpBridgeEnabled(false, token).then(() => setEnabled(false));
    }
  }, [mcpAllowed, enabled, token]);

  const lockedCta = useCallback((): void => {
    setLockMessage(
      isAuthenticated
        ? 'Upgrade to Account (Paid) — Coming soon. Until billing ships, switch mode to Account (Paid).'
        : 'Sign in to continue — then use ModeSelector for Account (Paid) until billing ships.',
    );
    if (!isAuthenticated) {
      onSignIn?.();
    }
  }, [isAuthenticated, onSignIn]);

  const toggleBridge = useCallback((): void => {
    if (!mcpAllowed) {
      lockedCta();
      return;
    }
    const next = !enabled;
    setEnabled(next);
    void persistMcpBridgeEnabled(next, token);
  }, [enabled, lockedCta, mcpAllowed, token]);

  const persistToken = useCallback((): void => {
    void persistMcpBridgeToken(token, enabled);
  }, [enabled, token]);

  const copyToken = useCallback((): void => {
    if (!token) return;
    void navigator.clipboard.writeText(token).then(() => {
      setTokenCopied(true);
      setTimeout(() => setTokenCopied(false), 2000);
    });
  }, [token]);

  const push = useCallback((next: ConnectToAiScreen): void => {
    setLockMessage(null);
    setStack((s) => pushConnectScreen(s, next));
  }, []);

  const pop = useCallback((): void => {
    setLockMessage(null);
    setCheckResult('idle');
    if (stack.length <= 1) {
      onExit?.();
      return;
    }
    setStack((s) => popConnectScreen(s));
  }, [onExit, stack.length]);

  const onCheckConnection = useCallback(async (): Promise<void> => {
    if (!enabled || screen.kind !== 'setup') return;
    const latest = await readMcpBridgeUiState();
    if (latest.connectionState === 'connected') {
      const next = await markMcpAppActive(screen.appId);
      setActiveApps(next);
      setCheckResult('ok');
      return;
    }
    setCheckResult('fail');
  }, [enabled, screen]);

  const body =
    screen.kind === 'hub' ? (
      <McpConnectionsHub
        mcpAllowed={mcpAllowed}
        isAuthenticated={isAuthenticated}
        bridgeEnabled={enabled}
        token={token}
        activeAppIds={activeApps}
        lockMessage={lockMessage}
        onDismissLockMessage={() => setLockMessage(null)}
        onLockedInteract={lockedCta}
        onToggleBridge={toggleBridge}
        onTokenChange={setToken}
        onTokenBlur={persistToken}
        onCopyToken={copyToken}
        tokenCopied={tokenCopied}
        onAddApp={() => push({ kind: 'picker' })}
        onOpenActive={(id) => {
          setCheckResult('idle');
          push({ kind: 'setup', appId: id });
        }}
      />
    ) : screen.kind === 'picker' ? (
      <McpAppPicker
        mcpAllowed={mcpAllowed}
        onPick={(id) => {
          setCheckResult('idle');
          push({ kind: 'setup', appId: id });
        }}
        onLockedInteract={lockedCta}
      />
    ) : (
      <McpClientSetupView
        app={getMcpAiApp(screen.appId)}
        bridgeEnabled={enabled}
        token={token}
        connectionState={connectionState}
        checkResult={checkResult}
        onToggleBridge={toggleBridge}
        onTokenChange={setToken}
        onTokenBlur={persistToken}
        onCheckConnection={() => {
          void onCheckConnection();
        }}
      />
    );

  return (
    <div
      data-testid="connect-to-ai-flow"
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
      }}
    >
      <div
        style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--rule-soft)',
          display: 'grid',
          gridTemplateColumns: '1fr auto 1fr',
          alignItems: 'center',
          flexShrink: 0,
          minHeight: 44,
          gap: 8,
        }}
      >
        <button
          type="button"
          className="u-mono"
          onClick={pop}
          style={{
            justifySelf: 'start',
            border: 'none',
            background: 'transparent',
            color: 'var(--accent)',
            cursor: 'pointer',
            fontSize: 'var(--step--2)',
            padding: 0,
            textAlign: 'left',
            minHeight: 44,
          }}
        >
          {connectToAiBackLabel(stack)}
        </button>
        <div
          className="u-sans"
          style={{
            justifySelf: 'center',
            fontSize: 'var(--step-0)',
            fontWeight: 500,
            textAlign: 'center',
            maxWidth: 160,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {connectToAiPageTitle(screen)}
        </div>
        <div style={{ justifySelf: 'end' }} />
      </div>
      <div className="list-scroll" style={{ flex: 1, minHeight: 0 }}>
        {body}
      </div>
    </div>
  );
}
