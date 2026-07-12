import React, { useCallback, useEffect, useId, useState } from 'react';

import { MCP_BRIDGE_TOKEN_ENV } from '@/shared/constants/mcp-bridge';
import type { BridgeConnectionState } from '@/shared/mcp/bridge-protocol';

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

export interface McpBridgeSetupGuideProps {
  enabled: boolean;
  token: string;
  connectionState: BridgeConnectionState;
  isAuthenticated: boolean;
}

const BUILD_COMMAND = 'cd packages/mcp-server && npm install && npm run build';
const TOKEN_COMMAND = `export ${MCP_BRIDGE_TOKEN_ENV}="$(openssl rand -hex 24)" && echo $${MCP_BRIDGE_TOKEN_ENV}`;

const MCP_JSON_SNIPPET = `{
  "mcpServers": {
    "underscore": {
      "command": "node",
      "args": ["/path/to/_underscore/packages/mcp-server/dist/index.js", "--adapter=bridge"],
      "env": {
        "${MCP_BRIDGE_TOKEN_ENV}": "your-token-here"
      }
    }
  }
}`;

function Step({
  number,
  title,
  children,
}: {
  number: number;
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <li style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
      <span
        className="u-mono"
        aria-hidden="true"
        style={{
          flexShrink: 0,
          width: 20,
          height: 20,
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '1px solid var(--rule)',
          color: 'var(--ink-3)',
          fontSize: 'var(--step--2)',
        }}
      >
        {number}
      </span>
      <div style={{ minWidth: 0, flex: 1 }}>
        <div className="u-sans" style={{ fontSize: 'var(--step-0)', color: 'var(--ink)', fontWeight: 500 }}>
          {title}
        </div>
        <div style={{ marginTop: 6 }}>{children}</div>
      </div>
    </li>
  );
}

function CodeBlock({
  label,
  code,
}: {
  label: string;
  code: string;
}): React.ReactElement {
  const [copied, setCopied] = useState(false);
  const copyId = useId();

  const copy = useCallback((): void => {
    void navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [code]);

  return (
    <div style={{ marginTop: 6 }}>
      <div
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          color: 'var(--ink-3)',
          marginBottom: 4,
        }}
      >
        {label}
      </div>
      <div
        style={{
          position: 'relative',
          border: '1px solid var(--rule-soft)',
          background: 'var(--paper)',
        }}
      >
        <pre
          className="u-mono"
          style={{
            margin: 0,
            padding: '8px 10px',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-2)',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            overflowX: 'auto',
          }}
        >
          {code}
        </pre>
        <button
          type="button"
          className="u-caps"
          aria-describedby={copyId}
          onClick={copy}
          style={{
            position: 'absolute',
            top: 6,
            right: 6,
            padding: '4px 8px',
            fontSize: 'var(--step--2)',
            border: '1px solid var(--rule)',
            background: 'var(--paper-2)',
            color: 'var(--ink-2)',
            cursor: 'pointer',
            minHeight: 28,
          }}
        >
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <span id={copyId} style={srOnlyStyle} aria-live="polite">
        {copied ? `${label} copied to clipboard` : ''}
      </span>
    </div>
  );
}

function shouldAutoExpand(
  enabled: boolean,
  token: string,
  connectionState: BridgeConnectionState,
): boolean {
  if (!enabled) return false;
  if (connectionState === 'error') return true;
  if (!token.trim()) return true;
  return connectionState === 'disconnected';
}

export function McpBridgeSetupGuide({
  enabled,
  token,
  connectionState,
  isAuthenticated,
}: McpBridgeSetupGuideProps): React.ReactElement {
  const panelId = useId();
  const [expanded, setExpanded] = useState(() => shouldAutoExpand(enabled, token, connectionState));

  useEffect(() => {
    if (shouldAutoExpand(enabled, token, connectionState)) {
      setExpanded(true);
    }
  }, [enabled, token, connectionState]);

  const showTroubleshooting = enabled && (connectionState === 'error' || !token.trim());

  return (
    <div style={{ borderBottom: '1px solid var(--rule-soft)' }}>
      <button
        type="button"
        className="u-sans"
        aria-expanded={expanded}
        aria-controls={panelId}
        onClick={() => setExpanded((open) => !open)}
        style={{
          all: 'unset',
          cursor: 'pointer',
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 12,
          padding: '14px 16px',
          minHeight: 44,
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        <div style={{ minWidth: 0, textAlign: 'left' }}>
          <div style={{ fontSize: 14, color: 'var(--ink)', fontWeight: 500 }}>
            How to connect Cursor
          </div>
          <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2 }}>
            Build server, add mcp.json, paste token below
          </div>
        </div>
        <span
          className="u-mono"
          aria-hidden="true"
          style={{
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
            transform: expanded ? 'rotate(90deg)' : 'none',
            transition: 'transform 120ms ease',
          }}
        >
          ›
        </span>
      </button>

      {expanded ? (
        <div
          id={panelId}
          style={{
            padding: '0 16px 14px',
            borderTop: '1px solid var(--rule-soft)',
            background: 'var(--paper-2)',
          }}
        >
          {showTroubleshooting ? (
            <div
              role="alert"
              className="u-sans"
              style={{
                margin: '12px 0',
                padding: '10px 12px',
                border: '1px solid var(--rule)',
                fontSize: 'var(--step--1)',
                color: 'var(--ink-2)',
              }}
            >
              {connectionState === 'error'
                ? 'Bridge could not connect. Check that the MCP server is running and the token matches mcp.json.'
                : 'Paste the same token from mcp.json into the field below, then restart Cursor MCP.'}
            </div>
          ) : null}

          <ol
            style={{
              margin: '12px 0 0',
              padding: 0,
              listStyle: 'none',
              display: 'flex',
              flexDirection: 'column',
              gap: 14,
            }}
          >
            <Step number={1} title="Build the MCP server">
              <CodeBlock label="Terminal" code={BUILD_COMMAND} />
            </Step>
            <Step number={2} title="Generate a session token">
              <CodeBlock label="Terminal" code={TOKEN_COMMAND} />
              <p
                className="u-mono"
                style={{
                  margin: '6px 0 0',
                  fontSize: 'var(--step--2)',
                  color: 'var(--ink-3)',
                }}
              >
                Or copy the token printed when the server starts.
              </p>
            </Step>
            <Step number={3} title="Add to Cursor mcp.json">
              <CodeBlock label="mcp.json" code={MCP_JSON_SNIPPET} />
              <p
                className="u-mono"
                style={{
                  margin: '6px 0 0',
                  fontSize: 'var(--step--2)',
                  color: 'var(--ink-3)',
                }}
              >
                Use the absolute path to packages/mcp-server/dist/index.js on your machine.
              </p>
            </Step>
            <Step number={4} title="Enable bridge in _underscore">
              <p
                className="u-sans"
                style={{ margin: 0, fontSize: 'var(--step--1)', color: 'var(--ink-2)' }}
              >
                Turn on Allow MCP bridge above and paste the same token into Session token.
              </p>
            </Step>
            <Step number={5} title="Restart Cursor MCP">
              <p
                className="u-sans"
                style={{ margin: 0, fontSize: 'var(--step--1)', color: 'var(--ink-2)' }}
              >
                Restart MCP in Cursor or open a new chat. Call get_session first to verify the connection.
              </p>
            </Step>
          </ol>

          {isAuthenticated ? (
            <p
              className="u-sans"
              style={{
                margin: '14px 0 0',
                paddingTop: 12,
                borderTop: '1px solid var(--rule-soft)',
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
              }}
            >
              For ChatGPT cloud MCP, deploy the worker and approve access under Connected apps.
              See packages/mcp-server/README.md in the repo.
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
