import React from 'react';

import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { MCP_AI_APPS } from '@/features/settings/mcp/mcp-ai-apps';
import { handoffPickerSub } from '@/features/settings/mcp/mcp-host-handoff';
import { Row } from '@/ui-system/components/primitives/Row';

export interface McpAppPickerProps {
  mcpAllowed: boolean;
  onPick: (id: McpAiAppId) => void;
  onLockedInteract: () => void;
  /** Catalog app ids that already have an OAuth grant. */
  connectedAppIds?: ReadonlySet<McpAiAppId>;
}

export function McpAppPicker({
  mcpAllowed,
  onPick,
  onLockedInteract,
  connectedAppIds,
}: McpAppPickerProps): React.ReactElement {
  return (
    <div data-testid="mcp-app-picker">
      <div style={{ padding: '12px 16px 8px' }}>
        <div
          className="u-sans"
          style={{ fontSize: 'var(--step--1)', color: 'var(--ink)', lineHeight: 1.4 }}
        >
          Where should agents read your library?
        </div>
      </div>
      {MCP_AI_APPS.map((app) => {
        const connected = connectedAppIds?.has(app.id) ?? false;
        return (
          <Row
            key={app.id}
            title={app.name}
            sub={connected ? 'Approved access' : handoffPickerSub(app.handoff)}
            right={
              <span
                className="u-mono"
                style={{
                  fontSize: 'var(--step--2)',
                  color: connected ? 'var(--accent)' : 'var(--ink)',
                }}
              >
                {!mcpAllowed ? 'Locked ›' : connected ? 'Connected' : 'Set up ›'}
              </span>
            }
            onClick={() => (mcpAllowed ? onPick(app.id) : onLockedInteract())}
          />
        );
      })}
    </div>
  );
}
