import React from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import { resolveHostConnection } from '@/features/settings/mcp/host-connection';
import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';

export interface McpClientSetupViewProps {
  app: McpAiAppDef;
  remoteUrl: string;
}

export function McpClientSetupView({
  app,
  remoteUrl,
}: McpClientSetupViewProps): React.ReactElement {
  const tip = resolveHostConnection(app, remoteUrl);

  return (
    <div data-testid="mcp-client-setup" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ flex: 1, overflow: 'auto' }}>
        <div style={{ padding: '12px 16px 8px' }}>
          <div
            className="u-sans"
            style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45 }}
          >
            {tip.hint}
          </div>
        </div>

        <div style={{ padding: '0 16px 16px' }} data-od-id="mcp-config-snippet">
          <div className="u-sans" style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', marginBottom: 8, lineHeight: 1.45 }}>
            {tip.pasteTarget}. Then {tip.restart.toLowerCase()}.
          </div>
          <CodeSnippetBlock label={tip.pasteTarget} code={tip.snippet} />
        </div>
      </div>
    </div>
  );
}
