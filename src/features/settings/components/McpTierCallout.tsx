import React from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getModeBranding } from '@/shared/constants/mode-branding';
import { Card, CardDescription, CardFooter, CardTitle } from '@/ui-system/components/primitives/Card';

export interface McpTierCalloutProps {
  isAuthenticated: boolean;
  currentMode: ModeType;
  onSignIn?: () => void;
}

/**
 * Upsell callout for guest Basic users — standard "unlock with sign-in" pattern
 * (Notion/Linear-style bordered card with primary CTA).
 */
export function McpTierCallout({
  isAuthenticated,
  currentMode,
  onSignIn,
}: McpTierCalloutProps): React.ReactElement | null {
  if (isAuthenticated) {
    if (currentMode === 'pro_xai') {
      return (
        <div style={{ padding: '0 16px 8px' }}>
          <Card elevated>
            <CardTitle>10x-Pro MCP</CardTitle>
            <CardDescription>
              AI tools (ask_scope, summarize, synthesize) are available via the extension bridge when
              you enable orchestrator mode. Cloud MCP serves your synced library.
            </CardDescription>
          </Card>
        </div>
      );
    }
    return null;
  }

  return (
    <div style={{ padding: '0 16px 8px' }}>
      <Card elevated>
        <CardTitle>Sign in for full MCP</CardTitle>
        <CardDescription>
          You can connect Cursor on this device to local Basic highlights. Sign in to Pro to sync
          your library, use ChatGPT with cloud MCP, and access highlights from any device.
        </CardDescription>
        <CardFooter>
          <button
            type="button"
            className="u-caps"
            onClick={onSignIn}
            style={{
              padding: '8px 14px',
              border: '1px solid var(--accent)',
              background: 'var(--accent)',
              color: 'var(--paper)',
              cursor: 'pointer',
              fontSize: 'var(--step--1)',
            }}
          >
            Sign in to Pro
          </button>
          <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
            Local bridge still works below
          </span>
        </CardFooter>
      </Card>
    </div>
  );
}

export function mcpTierLabel(isAuthenticated: boolean, currentMode: ModeType): string {
  if (!isAuthenticated) {
    return 'Basic · Local only';
  }
  return `${getModeBranding(currentMode).displayName} · Synced`;
}
