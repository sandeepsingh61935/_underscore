import React from 'react';

import { CodeSnippetBlock } from '@/features/settings/components/CodeSnippetBlock';
import {
  fillMcpConfigTemplate,
  type McpAiAppDef,
} from '@/features/settings/mcp/mcp-ai-apps';

export function HostTipBody({
  app,
  remoteUrl,
}: {
  app: McpAiAppDef;
  remoteUrl: string;
}): React.ReactElement {
  const snippet = fillMcpConfigTemplate(app.configTemplate, remoteUrl);

  return (
    <div data-od-id="mcp-config-snippet">
      <p
        className="u-sans type-sub"
        style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45, margin: '0 0 8px' }}
      >
        {app.hint}
      </p>
      <p
        className="u-sans type-sub"
        style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.45, margin: '0 0 8px' }}
      >
        {app.configLabel}. Then {app.restartLabel.toLowerCase()}.
      </p>
      <CodeSnippetBlock label={app.configLabel} code={snippet} />
    </div>
  );
}
