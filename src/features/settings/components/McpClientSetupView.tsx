import React from 'react';

import { HostTipBody } from '@/features/settings/integrations/HostTipBody';
import type { McpAiAppDef } from '@/features/settings/mcp/mcp-ai-apps';

export interface McpClientSetupViewProps {
  app: McpAiAppDef;
  remoteUrl: string;
}

export function McpClientSetupView({
  app,
  remoteUrl,
}: McpClientSetupViewProps): React.ReactElement {
  return (
    <div
      data-testid="mcp-client-setup"
      style={{ display: 'flex', flexDirection: 'column', height: '100%' }}
    >
      <div
        className="list-scroll"
        style={{ flex: 1, overflow: 'auto', padding: '12px 16px 16px' }}
      >
        <HostTipBody app={app} remoteUrl={remoteUrl} />
      </div>
    </div>
  );
}
