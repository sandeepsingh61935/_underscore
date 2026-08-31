import React, { useMemo } from 'react';

import { HostTipBody } from '@/features/settings/integrations/HostTipBody';
import {
  IntegrationsConnectChrome,
  INTEGRATIONS_ADVANCED_COPY,
} from '@/features/settings/integrations/IntegrationsConnectChrome';
import { useIntegrationsConnect } from '@/features/settings/integrations/use-integrations-connect';
import {
  getMcpAiApp,
  MCP_AI_APPS,
  type McpAiAppId,
} from '@/features/settings/mcp/mcp-ai-apps';
import { handoffPickerSub } from '@/features/settings/mcp/mcp-host-handoff';

export function IntegrationsWebList({
  isAuthenticated,
  isPaidActive,
  onOpenApp,
}: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  onOpenApp: (id: McpAiAppId) => void;
}): React.ReactElement {
  const {
    mcpAllowed,
    status,
    remoteUrl,
    urlCopied,
    copyUrl,
    connectedApps,
    isCatalogAppConnected,
    grantsError,
    reloadConnectionState,
  } = useIntegrationsConnect({ isAuthenticated, isPaidActive });

  return (
    <div
      className={`block${mcpAllowed ? '' : ' is-ai-muted'}`}
      data-od-id="settings-connect-ai"
      data-testid="mcp-connections-hub-web"
    >
      <p className="block-label">Integrations</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        Use your highlights in the agent you already use. OAuth happens in your agent —
        not in this app.
      </p>

      <IntegrationsConnectChrome
        mcpAllowed={mcpAllowed}
        status={status}
        grantTitles={connectedApps.map((app) => app.title)}
        lockedDetail="Account (Paid)"
      />

      {grantsError && mcpAllowed ? (
        <p
          className="type-sub"
          role="status"
          style={{ marginTop: 8 }}
          data-testid="mcp-grants-error"
        >
          {grantsError}
        </p>
      ) : null}

      {connectedApps.length > 0 ? (
        <div style={{ marginTop: 12 }} data-testid="mcp-active-grants">
          <p className="block-label">Active</p>
          {connectedApps.map((app) => (
            <div
              key={app.id}
              className="integration-app-row"
              style={{ cursor: 'default' }}
              data-testid={`mcp-active-grant-${app.id}`}
            >
              <span className="grow">
                <span className="title">{app.title}</span>
                <span className="sub">{app.sub}</span>
              </span>
              <span className="trail u-mono" style={{ color: 'var(--accent)' }}>
                Connected
              </span>
            </div>
          ))}
        </div>
      ) : mcpAllowed ? (
        <p className="type-sub" style={{ marginTop: 8 }}>
          Nothing connected yet. Choose an AI app below, then approve when the browser
          opens.
        </p>
      ) : null}

      {mcpAllowed ? (
        <button
          type="button"
          className="btn ghost sm"
          data-testid="mcp-refresh-connection"
          onClick={() => void reloadConnectionState()}
          style={{ marginTop: 8 }}
        >
          Refresh status
        </button>
      ) : null}

      <p className="block-label" style={{ marginTop: 16 }}>
        Add an AI app
      </p>
      <p className="type-sub" style={{ marginBottom: 8 }}>
        One-click install, one command, or paste URL — then OAuth in the host.
      </p>
      {MCP_AI_APPS.map((app) => {
        const connected = isCatalogAppConnected(app.id);
        return (
          <button
            key={app.id}
            type="button"
            className="integration-app-row"
            data-od-id={`mcp-app-${app.id}`}
            data-testid={`mcp-app-row-${app.id}`}
            data-connected={connected ? 'true' : 'false'}
            disabled={!mcpAllowed}
            onClick={() => onOpenApp(app.id)}
          >
            <span className="grow">
              <span className="title">{app.name}</span>
              <span className="sub">
                {connected ? 'Approved access' : handoffPickerSub(app.handoff)}
              </span>
            </span>
            <span
              className="trail u-mono"
              style={connected ? { color: 'var(--accent)' } : undefined}
            >
              {connected ? 'Connected' : 'Set up'}
            </span>
          </button>
        );
      })}

      {mcpAllowed ? (
        <details data-testid="mcp-server-details" style={{ marginTop: 16 }}>
          <summary
            className="u-mono"
            style={{ color: 'var(--accent)', cursor: 'pointer' }}
          >
            Server details
          </summary>
          <p className="type-sub" style={{ marginTop: 8 }}>
            Remote MCP URL
          </p>
          <div
            className="u-mono"
            data-testid="mcp-remote-url"
            style={{
              marginTop: 8,
              padding: 8,
              border: '1px solid var(--rule)',
              wordBreak: 'break-all',
              fontSize: 'var(--step--2)',
            }}
          >
            {remoteUrl}
          </div>
          <button
            type="button"
            className="btn sm"
            data-testid="mcp-copy-url"
            onClick={copyUrl}
            style={{ marginTop: 10 }}
          >
            {urlCopied ? 'Copied' : 'Copy URL'}
          </button>
          <p className="type-sub" style={{ marginTop: 12 }}>
            {INTEGRATIONS_ADVANCED_COPY}
          </p>
        </details>
      ) : null}
    </div>
  );
}

export function IntegrationsWebSetup({
  appId,
  mcpAllowed,
  remoteUrl,
  onBack,
}: {
  appId: McpAiAppId;
  mcpAllowed: boolean;
  remoteUrl: string;
  onBack: () => void;
}): React.ReactElement {
  const app = useMemo(() => getMcpAiApp(appId), [appId]);

  return (
    <div className="block" data-od-id="settings-mcp-setup">
      <button
        type="button"
        className="btn ghost sm"
        data-od-id="mcp-setup-back"
        onClick={onBack}
        style={{ marginBottom: 12 }}
      >
        Back to integrations
      </button>
      <p className="block-label">Connect {app.name}</p>
      {mcpAllowed ? (
        <HostTipBody app={app} remoteUrl={remoteUrl} />
      ) : (
        <p className="type-sub">
          Account access required to connect agents. Billing is upcoming.
        </p>
      )}
    </div>
  );
}
