import React from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';
import { fillMcpConfigTemplate } from '@/features/settings/mcp/mcp-ai-apps';
import { mcpSetupStepLabels } from '@/features/settings/mcp/mcp-setup-steps';

export interface McpClientSetupViewProps {
  app: McpAiAppDef;
  remoteUrl: string;
}

export function McpClientSetupView({
  app,
  remoteUrl,
}: McpClientSetupViewProps): React.ReactElement {
  const snippet = fillMcpConfigTemplate(app.configTemplate, { url: remoteUrl });
  const steps = mcpSetupStepLabels(app, 'extension');

  return (
    <div data-testid="mcp-client-setup" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '12px 16px 8px' }}>
          <div
            className="u-sans"
            style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.45 }}
          >
            Cloud MCP for {app.name}. Agents see your synced library only.
          </div>
        </div>

        <ol
          className="ai-setup-steps"
          data-od-id="mcp-setup-steps"
          style={{ margin: '0 16px 12px', paddingLeft: 18 }}
        >
          {steps.map((label, i) => (
            <li key={label} style={{ marginBottom: 8 }}>
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                {i + 1}.
              </span>{' '}
              <span className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}>
                {label}
              </span>
            </li>
          ))}
        </ol>

        <div style={{ padding: '0 16px 16px' }} data-od-id="mcp-config-snippet">
          <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', marginBottom: 8, lineHeight: 1.45 }}>
            {app.configHint}
          </div>
          <CodeSnippetBlock label={app.configLabel} code={snippet} />
        </div>
      </div>
    </div>
  );
}
