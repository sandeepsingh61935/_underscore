import React, { useMemo } from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import { useIntegrationsConnect } from '@/features/settings/integrations/use-integrations-connect';
import {
  fillMcpConfigTemplate,
  getMcpAiApp,
  MCP_AI_APPS,
  type McpAiAppId,
} from '@/features/settings/mcp/mcp-ai-apps';
import { mcpSetupStepLabels } from '@/features/settings/mcp/mcp-setup-steps';
import { integrationsStatusLabel } from '@/shared/mcp/integrations-status';

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

      <div className="setting-row" data-od-id="settings-mcp">
        <div className="grow">
          <div className="title">Cloud MCP</div>
          <div className="sub">
            {mcpAllowed
              ? 'OAuth for public hosts · Bearer JWT for scripts. Connected is an approved client, not a copied snippet.'
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
          <button
            type="button"
            className="btn sm"
            data-od-id="settings-mcp-copy-url"
            onClick={copyUrl}
          >
            {urlCopied ? 'Copied' : 'Copy'}
          </button>
        </div>
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
        Cloud config for the agent you already use.
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
  const snippet = useMemo(
    () => fillMcpConfigTemplate(app.configTemplate, { url: remoteUrl }),
    [app.configTemplate, remoteUrl],
  );
  const steps = useMemo(() => mcpSetupStepLabels(app, 'web'), [app]);

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
        {app.configHint}
      </p>
      <ol className="ai-setup-steps" data-od-id="mcp-setup-steps">
        {steps.map((label, i) => (
          <li key={label}>
            <span className="step-num u-mono">{i + 1}</span>
            <span className="step-label">{label}</span>
          </li>
        ))}
      </ol>
      {mcpAllowed ? (
        <div data-od-id="mcp-config-snippet">
          <CodeSnippetBlock label={app.configLabel} code={snippet} />
          <p className="type-sub" style={{ marginTop: 10 }}>
            Public hosts use OAuth. Power users can send{' '}
            <span className="u-mono">Authorization: Bearer</span> with a
            Supabase access token.
          </p>
        </div>
      ) : (
        <p className="type-sub">Upgrade to copy host config snippets.</p>
      )}
    </div>
  );
}
