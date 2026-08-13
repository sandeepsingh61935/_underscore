import React, { useMemo } from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import { useIntegrationsConnect } from '@/features/settings/integrations/use-integrations-connect';
import { resolveHostConnection } from '@/features/settings/mcp/host-connection';
import {
  getMcpAiApp,
  MCP_AI_APPS,
  type McpAiAppId,
} from '@/features/settings/mcp/mcp-ai-apps';
import { resolveConnectAction } from '@/shared/mcp/connect-next-action';
import {
  integrationsStatusDetail,
  integrationsStatusLabel,
} from '@/shared/mcp/integrations-status';

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
  const connectAction = resolveConnectAction({ mcpAllowed, urlCopied });
  const statusDetail = integrationsStatusDetail({
    status,
    oauthGrantCount: connectedApps.length,
    grantTitles: connectedApps.map((app) => app.title),
  });

  return (
    <div
      className={`block${mcpAllowed ? '' : ' is-ai-muted'}`}
      data-od-id="settings-connect-ai"
    >
      <p className="block-label">Integrations</p>
      <p className="type-sub" style={{ marginBottom: 12 }}>
        Let agents read your synced cloud library. No extension required.
      </p>

      <div className="setting-row" data-od-id="settings-mcp">
        <div className="grow">
          <div className="title">Cloud MCP</div>
          <div className="sub">
            {mcpAllowed
              ? statusDetail
              : 'Account (Paid)'}
          </div>
        </div>
        <span className="status" data-od-id="settings-mcp-status">
          {integrationsStatusLabel(status)}
        </span>
      </div>

      {mcpAllowed ? (
        <div className="setting-row" data-od-id="settings-mcp-url">
          <div className="grow">
            <div className="title">Remote MCP URL</div>
            <div className="sub u-mono">{remoteUrl}</div>
          </div>
          {connectAction.kind !== 'locked' ? (
            <button
              type="button"
              className="btn sm"
              data-od-id="settings-mcp-copy-url"
              data-testid="mcp-connect"
              onClick={copyUrl}
            >
              {connectAction.kind === 'copied' ? 'Copied' : 'Connect'}
            </button>
          ) : null}
        </div>
      ) : null}

      {mcpAllowed ? (
        <details data-testid="mcp-advanced" style={{ marginTop: 8 }}>
          <summary className="type-sub" style={{ cursor: 'pointer', minHeight: 44 }}>
            Advanced
          </summary>
          <p className="type-sub" style={{ marginTop: 8 }}>
            Scripts may send <span className="u-mono">Authorization: Bearer</span> with a
            Supabase access token. Do not paste that token in this app.
          </p>
        </details>
      ) : null}

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
  const tip = useMemo(
    () => resolveHostConnection(app, remoteUrl),
    [app, remoteUrl],
  );

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
      <p className="type-sub" style={{ marginBottom: 12 }}>
        {tip.hint}
      </p>
      <ol className="ai-setup-steps" data-od-id="mcp-setup-steps">
        <li>
          <span className="step-num u-mono">1</span>
          <span className="step-label">Add the server to {tip.pasteTarget}</span>
        </li>
        <li>
          <span className="step-num u-mono">2</span>
          <span className="step-label">{tip.restart}</span>
        </li>
      </ol>
      {mcpAllowed ? (
        <div data-od-id="mcp-config-snippet">
          <CodeSnippetBlock label={tip.pasteTarget} code={tip.snippet} />
        </div>
      ) : (
        <p className="type-sub">Upgrade to copy host config snippets.</p>
      )}
    </div>
  );
}
