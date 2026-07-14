import React, { useState } from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';
import { fillMcpConfigTemplate } from '@/features/settings/mcp/mcp-ai-apps';
import type { BridgeConnectionState } from '@/shared/mcp/bridge-protocol';
import { Row } from '@/ui-system/components/primitives/Row';

export type McpCheckResult = 'idle' | 'ok' | 'fail';

export interface McpClientSetupViewProps {
  app: McpAiAppDef;
  bridgeEnabled: boolean;
  token: string;
  connectionState: BridgeConnectionState;
  checkResult: McpCheckResult;
  onToggleBridge: () => void;
  onTokenChange: (token: string) => void;
  onTokenBlur: () => void;
  onCheckConnection: () => void;
}

const STEPS = [
  { id: 1, label: 'Turn on in _underscore', key: 'toggle' as const },
  { id: 2, label: 'Copy security code', key: 'token' as const },
  { id: 3, label: 'Add server to client config', key: 'config' as const },
  { id: 4, label: 'Restart / reload client', key: 'restart' as const },
  { id: 5, label: 'Check connection', key: 'check' as const },
];

export function McpClientSetupView({
  app,
  bridgeEnabled,
  token,
  connectionState: _connectionState,
  checkResult,
  onToggleBridge,
  onTokenChange,
  onTokenBlur,
  onCheckConnection,
}: McpClientSetupViewProps): React.ReactElement {
  const [expanded, setExpanded] = useState<number>(bridgeEnabled ? 2 : 1);
  const doneThrough = checkResult === 'ok' ? 5 : bridgeEnabled ? 2 : 0;
  const snippet = fillMcpConfigTemplate(app.configTemplate, token);

  return (
    <div data-testid="mcp-client-setup" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '12px 16px 6px' }}>
          <div className="u-serif" style={{ fontSize: 'var(--step-3)', fontStyle: 'italic', letterSpacing: '-0.02em' }}>
            Connect {app.name}
          </div>
          <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginTop: 6, lineHeight: 1.45 }}>
            Shared bridge checklist — only the config path and snippet change for this app.
          </div>
        </div>

        {STEPS.map((step) => {
          const complete = doneThrough >= step.id;
          const isOpen = expanded === step.id;
          return (
            <div key={step.id} style={{ borderBottom: '1px solid var(--rule-soft)' }}>
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setExpanded(isOpen ? 0 : step.id)}
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'flex',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '12px 16px',
                  alignItems: 'center',
                  gap: 10,
                  minHeight: 44,
                }}
              >
                <span
                  className="u-mono"
                  aria-hidden="true"
                  style={{
                    width: 20,
                    height: 20,
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '1px solid var(--rule)',
                    color: complete ? 'var(--accent)' : 'var(--ink-3)',
                    fontSize: 'var(--step--2)',
                    flexShrink: 0,
                  }}
                >
                  {complete ? '✓' : step.id}
                </span>
                <span className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}>
                  {step.label}
                </span>
              </button>

              {isOpen ? (
                <div style={{ padding: '0 16px 14px 46px' }}>
                  {step.key === 'toggle' ? (
                    <Row
                      title="Let AI apps read highlights"
                      sub={bridgeEnabled ? 'On' : 'Off'}
                      right={
                        <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: bridgeEnabled ? 'var(--accent)' : 'var(--ink-3)' }}>
                          {bridgeEnabled ? 'On' : 'Off'}
                        </span>
                      }
                      onClick={onToggleBridge}
                      role="switch"
                      aria-checked={bridgeEnabled}
                      compact
                    />
                  ) : null}

                  {step.key === 'token' ? (
                    <>
                      <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', lineHeight: 1.4 }}>
                        Paste the same security code in the client config.
                      </div>
                      <input
                        type="password"
                        value={token}
                        onChange={(e) => onTokenChange(e.target.value)}
                        onBlur={onTokenBlur}
                        placeholder="Security code"
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
                    </>
                  ) : null}

                  {step.key === 'config' ? (
                    <>
                      <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}>
                        {app.configHint}
                      </div>
                      <CodeSnippetBlock label={app.configLabel} code={snippet} />
                    </>
                  ) : null}

                  {step.key === 'restart' ? (
                    <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-2)', lineHeight: 1.45 }}>
                      {app.restartLabel}
                    </div>
                  ) : null}

                  {step.key === 'check' ? (
                    <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}>
                      A finished checklist is not enough — the hub marks this app Active only after the bridge handshake succeeds.
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          );
        })}

        {checkResult === 'ok' ? (
          <div style={{ padding: '12px 16px' }} role="status">
            <div style={{ padding: 12, border: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
              <div className="u-sans" style={{ fontWeight: 500, fontSize: 'var(--step-0)' }}>Connected</div>
              <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.45 }}>
                {app.name} can read highlights. It now appears under Active on the hub.
              </div>
            </div>
          </div>
        ) : null}

        {checkResult === 'fail' ? (
          <div style={{ padding: '12px 16px' }} role="alert">
            <div style={{ padding: 12, border: '1px solid var(--rule)', background: 'var(--paper-2)' }}>
              <div className="u-sans" style={{ fontWeight: 500, fontSize: 'var(--step-0)' }}>Not reachable</div>
              <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginTop: 4, lineHeight: 1.45 }}>
                {app.name} can&apos;t reach _underscore. Make sure the server is running and the security code matches.
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <div style={{ padding: '12px 16px 16px', borderTop: '1px solid var(--rule-soft)' }}>
        <button
          type="button"
          className="u-caps"
          onClick={onCheckConnection}
          disabled={!bridgeEnabled}
          aria-label="Run connection check"
          style={{
            width: '100%',
            minHeight: 44,
            border: '1px solid var(--accent)',
            background: bridgeEnabled ? 'var(--accent)' : 'var(--paper-2)',
            color: bridgeEnabled ? 'var(--paper)' : 'var(--ink-3)',
            cursor: bridgeEnabled ? 'pointer' : 'default',
            fontSize: 'var(--step--2)',
          }}
        >
          Check connection
        </button>
      </div>
    </div>
  );
}
