import React, { useMemo } from 'react';

import { HostTipBody } from '@/features/settings/integrations/HostTipBody';
import { IntegrationsConnectChrome } from '@/features/settings/integrations/IntegrationsConnectChrome';
import { useIntegrationsConnect } from '@/features/settings/integrations/use-integrations-connect';
import {
  getMcpAiApp,
  MCP_AI_APPS,
  type McpAiAppId,
} from '@/features/settings/mcp/mcp-ai-apps';

export function IntegrationsWebList({
  isAuthenticated,
  isPaidActive,
  onOpenApp,
}: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
  onOpenApp: (id: McpAiAppId) => void;
}): React.ReactElement {
  const { mcpAllowed, status, remoteUrl, urlCopied, copyUrl, connectedApps } =
    useIntegrationsConnect({ isAuthenticated, isPaidActive });

  return (
    <div
      className={`block${mcpAllowed ? '' : ' is-ai-muted'}`}
      data-od-id="settings-connect-ai"
    >
      <p className="block-label">Integrations</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        Let agents read your synced cloud library. No extension required.
      </p>

      <IntegrationsConnectChrome
        mcpAllowed={mcpAllowed}
        status={status}
        remoteUrl={remoteUrl}
        urlCopied={urlCopied}
        onConnect={copyUrl}
        grantTitles={connectedApps.map((app) => app.title)}
        lockedDetail="Account (Paid)"
      />

      {connectedApps.length > 0 ? (
        <p className="type-sub" style={{ marginTop: 8 }}>
          {connectedApps.map((app) => app.title).join(', ')}
        </p>
      ) : null}

      <p className="block-label" style={{ marginTop: 16 }}>
        Host tips
      </p>
      <p className="type-sub" style={{ marginBottom: 8 }}>
        Where to add the URL in the agent you already use.
      </p>
      {MCP_AI_APPS.map((app) => (
        <button
          key={app.id}
          type="button"
          className="integration-app-row"
          data-od-id={`mcp-app-${app.id}`}
          disabled={!mcpAllowed}
          onClick={() => onOpenApp(app.id)}
        >
          <span className="grow">
            <span className="title">{app.name}</span>
            <span className="sub">{app.sub}</span>
          </span>
          <span className="trail u-mono">Set up</span>
        </button>
      ))}
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
        <p className="type-sub">Upgrade to copy host config snippets.</p>
      )}
    </div>
  );
}
