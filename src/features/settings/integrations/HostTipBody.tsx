import React, { useCallback, useState } from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import { INTEGRATIONS_ADVANCED_COPY } from '@/features/settings/integrations/IntegrationsConnectChrome';
import {
  fillMcpConfigTemplate,
  type McpAiAppDef,
} from '@/features/settings/mcp/mcp-ai-apps';
import { resolvePrimaryAction } from '@/features/settings/mcp/mcp-host-handoff';

const primaryBtnStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  border: '1px solid var(--accent)',
  background: 'var(--accent)',
  color: 'var(--paper)',
  cursor: 'pointer',
  fontSize: 'var(--step--2)',
};

const secondaryBtnStyle: React.CSSProperties = {
  width: '100%',
  minHeight: 44,
  marginTop: 8,
  border: '1px solid var(--rule)',
  background: 'var(--paper)',
  color: 'var(--ink)',
  cursor: 'pointer',
  fontSize: 'var(--step--2)',
};

export function HostTipBody({
  app,
  remoteUrl,
}: {
  app: McpAiAppDef;
  remoteUrl: string;
}): React.ReactElement {
  const action = resolvePrimaryAction(app, remoteUrl);
  const snippet = fillMcpConfigTemplate(app.configTemplate, remoteUrl);
  const [copied, setCopied] = useState(false);
  const [opening, setOpening] = useState(false);
  const [deepLinkError, setDeepLinkError] = useState<string | null>(null);

  const copyText = useCallback((text: string): void => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const onPrimary = useCallback((): void => {
    setDeepLinkError(null);
    if (action.kind === 'deep_link') {
      setOpening(true);
      setTimeout(() => setOpening(false), 2000);
      try {
        window.location.assign(action.href);
      } catch {
        setDeepLinkError(
          'Could not open Cursor. Copy the install link or use Manual below.'
        );
      }
      return;
    }
    copyText(action.text);
  }, [action, copyText]);

  const primaryLabel =
    copied && action.kind !== 'deep_link'
      ? 'Copied'
      : opening && action.kind === 'deep_link'
        ? 'Opening…'
        : action.label;

  return (
    <div data-od-id="mcp-config-snippet" data-testid="mcp-host-handoff">
      <div className="u-caps" style={{ color: 'var(--ink)', marginBottom: 8 }}>
        What you will do
      </div>
      <ol
        style={{
          margin: '0 0 16px',
          paddingLeft: 20,
          color: 'var(--ink)',
        }}
      >
        {app.steps.map((step) => (
          <li
            key={step}
            className="u-sans"
            style={{ fontSize: 'var(--step--1)', lineHeight: 1.45, marginBottom: 6 }}
          >
            {step}
          </li>
        ))}
      </ol>

      <button
        type="button"
        className="u-caps btn sm"
        data-testid="mcp-handoff-primary"
        onClick={onPrimary}
        style={primaryBtnStyle}
      >
        {primaryLabel}
      </button>

      {action.kind === 'deep_link' ? (
        <p
          className="u-sans type-sub"
          style={{
            fontSize: 'var(--step--2)',
            color: 'var(--ink)',
            lineHeight: 1.45,
            margin: '8px 0 0',
          }}
        >
          Opens Cursor with the Cloud MCP URL pre-filled. OAuth happens in Cursor, not in
          this app.
        </p>
      ) : null}

      {deepLinkError ? (
        <div
          role="status"
          data-testid="mcp-handoff-deep-link-error"
          style={{ marginTop: 10 }}
        >
          <p
            className="u-sans"
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--ink)',
              lineHeight: 1.45,
              margin: '0 0 8px',
            }}
          >
            {deepLinkError}
          </p>
          <button
            type="button"
            className="u-caps"
            data-testid="mcp-handoff-copy-deep-link"
            onClick={() =>
              copyText(action.kind === 'deep_link' ? action.href : remoteUrl)
            }
            style={secondaryBtnStyle}
          >
            {copied ? 'Copied' : 'Copy install link'}
          </button>
        </div>
      ) : null}

      <p
        className="u-sans type-sub"
        style={{
          fontSize: 'var(--step--1)',
          color: 'var(--ink)',
          lineHeight: 1.45,
          margin: '14px 0 0',
        }}
      >
        After you approve, come back here (or reopen Integrations). Status updates when
        the agent finishes — this app does not mark Connected on copy or open.
      </p>

      <details data-testid="mcp-setup-manual" style={{ marginTop: 16 }}>
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
          Manual / Advanced
        </summary>
        <p
          className="u-sans type-sub"
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--ink)',
            lineHeight: 1.45,
            margin: '0 0 8px',
          }}
        >
          {app.hint}
        </p>
        <p
          className="u-sans type-sub"
          style={{
            fontSize: 'var(--step--1)',
            color: 'var(--ink)',
            lineHeight: 1.45,
            margin: '0 0 8px',
          }}
        >
          {app.configLabel}. Then {app.restartLabel.toLowerCase()}.
        </p>
        <CodeSnippetBlock label={app.configLabel} code={snippet} />
        {action.kind === 'deep_link' ? (
          <button
            type="button"
            className="u-caps"
            data-testid="mcp-handoff-copy-deep-link-manual"
            onClick={() => copyText(action.href)}
            style={{ ...secondaryBtnStyle, marginTop: 10 }}
          >
            {copied ? 'Copied' : 'Copy install link'}
          </button>
        ) : null}
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
  );
}
