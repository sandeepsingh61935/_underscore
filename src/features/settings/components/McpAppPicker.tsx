import React from 'react';

import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { MCP_AI_APPS } from '@/features/settings/mcp/mcp-ai-apps';
import { Row } from '@/ui-system/components/primitives/Row';

export interface McpAppPickerProps {
  mcpAllowed: boolean;
  onPick: (id: McpAiAppId) => void;
  onLockedInteract: () => void;
}

export function McpAppPicker({
  mcpAllowed,
  onPick,
  onLockedInteract,
}: McpAppPickerProps): React.ReactElement {
  return (
    <div data-testid="mcp-app-picker">
      <div style={{ padding: '12px 16px 8px' }}>
        <div
          className="u-sans"
          style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)', lineHeight: 1.4 }}
        >
          Where do you want to use your highlights?
        </div>
      </div>
      {MCP_AI_APPS.map((app) => (
        <Row
          key={app.id}
          title={app.name}
          sub={app.sub}
          right={
            <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
              {mcpAllowed ? 'Set up ›' : 'Locked ›'}
            </span>
          }
          onClick={() => (mcpAllowed ? onPick(app.id) : onLockedInteract())}
        />
      ))}
    </div>
  );
}
