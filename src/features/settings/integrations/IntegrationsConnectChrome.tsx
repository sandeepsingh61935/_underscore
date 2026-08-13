import React from 'react';

import {
  integrationsStatusDetail,
  integrationsStatusLabel,
  type IntegrationsStatus,
} from '@/shared/mcp/integrations-status';

export const INTEGRATIONS_ADVANCED_COPY =
  'Scripts may send Authorization: Bearer with a Supabase access token. Do not paste that token in this app.';

export function IntegrationsConnectChrome({
  mcpAllowed,
  status,
  remoteUrl,
  urlCopied,
  onConnect,
  grantTitles,
  lockedDetail,
}: {
  mcpAllowed: boolean;
  status: IntegrationsStatus;
  remoteUrl: string;
  urlCopied: boolean;
  onConnect: () => void;
  grantTitles: readonly string[];
  lockedDetail: string;
}): React.ReactElement {
  const detail = mcpAllowed
    ? integrationsStatusDetail({
        status,
        oauthGrantCount: grantTitles.length,
        grantTitles,
      })
    : lockedDetail;

  return (
    <div
      data-od-id="settings-mcp"
      data-testid="integrations-connect-chrome"
      style={{
        margin: '0 0 10px',
        padding: 12,
        border: '1px solid var(--rule)',
        opacity: mcpAllowed ? 1 : 0.65,
      }}
    >
      <div
        className="setting-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div className="grow">
          <div className="title u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}>
            Status
          </div>
          <div className="sub u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink)', marginTop: 4 }}>
            {detail}
          </div>
        </div>
        <span
          className="status u-mono"
          data-od-id="settings-mcp-status"
          data-testid="mcp-integrations-status"
          style={{
            fontSize: 'var(--step--2)',
            color: mcpAllowed && status === 'connected' ? 'var(--accent)' : 'var(--ink)',
          }}
        >
          {integrationsStatusLabel(status)}
        </span>
      </div>

      {mcpAllowed ? (
        <div
          className="setting-row"
          data-od-id="settings-mcp-url"
          style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--rule-soft)' }}
        >
          <div className="u-sans" style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}>
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
            data-testid="mcp-connect"
            onClick={onConnect}
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
            {urlCopied ? 'Copied' : 'Connect'}
          </button>
          <details data-testid="mcp-advanced" style={{ marginTop: 12 }}>
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
              Advanced
            </summary>
            <p
              className="u-sans type-sub"
              style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45, margin: '0 0 8px' }}
            >
              {INTEGRATIONS_ADVANCED_COPY}
            </p>
          </details>
        </div>
      ) : null}
    </div>
  );
}
