import React, { useCallback, useEffect, useState } from 'react';

import { McpAppPicker } from '@/features/settings/components/McpAppPicker';
import { McpClientSetupView } from '@/features/settings/components/McpClientSetupView';
import { McpConnectionsHub } from '@/features/settings/components/McpConnectionsHub';
import { useIntegrationsConnect } from '@/features/settings/integrations/use-integrations-connect';
import {
  connectToAiBackLabel,
  connectToAiPageTitle,
  popConnectScreen,
  pushConnectScreen,
  type ConnectToAiScreen,
} from '@/features/settings/mcp/connect-to-ai-nav';
import { getMcpAiApp } from '@/features/settings/mcp/mcp-ai-apps';
import { readMcpBridgeEnabled } from '@/features/settings/mcp/mcp-bridge-ui-state';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

export interface ConnectToAiFlowProps {
  isAuthenticated: boolean;
  currentMode: ModeType;
  isPaidActive: boolean;
  onSignIn?: () => void;
  /** Exit full-screen Connect flow back to Settings root. */
  onExit?: () => void;
  /** Fired when nav stack depth changes (1 = hub). */
  onStackDepthChange?: (depth: number) => void;
}

export function ConnectToAiFlow({
  isAuthenticated,
  currentMode: _currentMode,
  isPaidActive,
  onSignIn,
  onExit,
  onStackDepthChange,
}: ConnectToAiFlowProps): React.ReactElement {
  const [stack, setStack] = useState<ConnectToAiScreen[]>([{ kind: 'hub' }]);
  const [lockMessage, setLockMessage] = useState<string | null>(null);
  const [legacyBridgeOn, setLegacyBridgeOn] = useState(false);
  const {
    mcpAllowed,
    status,
    remoteUrl,
    urlCopied,
    copyUrl,
    connectedApps,
    grantsError,
  } = useIntegrationsConnect({ isAuthenticated, isPaidActive });

  const screen = stack[stack.length - 1] ?? { kind: 'hub' as const };

  useEffect(() => {
    onStackDepthChange?.(stack.length);
  }, [onStackDepthChange, stack.length]);

  useEffect(() => {
    void readMcpBridgeEnabled().then((enabled) => {
      setLegacyBridgeOn(enabled);
    });
  }, []);

  const lockedCta = useCallback((): void => {
    setLockMessage(
      isAuthenticated
        ? 'Upgrade to Account (Paid) to unlock Integrations — use Upgrade in Settings.'
        : 'Sign in, then upgrade to Account (Paid) to unlock Integrations.',
    );
    if (!isAuthenticated) {
      onSignIn?.();
    }
  }, [isAuthenticated, onSignIn]);

  const push = useCallback((next: ConnectToAiScreen): void => {
    setLockMessage(null);
    setStack((s) => pushConnectScreen(s, next));
  }, []);

  const pop = useCallback((): void => {
    setLockMessage(null);
    if (stack.length <= 1) {
      onExit?.();
      return;
    }
    setStack((s) => popConnectScreen(s));
  }, [onExit, stack.length]);

  const body =
    screen.kind === 'hub' ? (
      <McpConnectionsHub
        mcpAllowed={mcpAllowed}
        isAuthenticated={isAuthenticated}
        status={status}
        remoteUrl={remoteUrl}
        urlCopied={urlCopied}
        showLegacyNotice={legacyBridgeOn}
        lockMessage={lockMessage}
        grantsError={grantsError}
        onDismissLockMessage={() => setLockMessage(null)}
        onLockedInteract={lockedCta}
        onCopyUrl={copyUrl}
        onAddApp={() => push({ kind: 'picker' })}
        connectedApps={connectedApps}
      />
    ) : screen.kind === 'picker' ? (
      <McpAppPicker
        mcpAllowed={mcpAllowed}
        onPick={(id) => {
          push({ kind: 'setup', appId: id });
        }}
        onLockedInteract={lockedCta}
      />
    ) : (
      <McpClientSetupView
        app={getMcpAiApp(screen.appId)}
        remoteUrl={remoteUrl}
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
