import React from 'react';

import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { getModeBranding } from '@/shared/constants/mode-branding';
import { Row } from '@/ui-system/components/primitives/Row';

export interface McpTierCalloutProps {
  isAuthenticated: boolean;
  currentMode: ModeType;
  onSignIn?: () => void;
}

/**
 * Compact tier hints — one settings row instead of a large callout card
 * (Apple Settings / VS Code pattern: inline row with optional CTA).
 */
export function McpTierCallout({
  isAuthenticated,
  currentMode,
  onSignIn,
}: McpTierCalloutProps): React.ReactElement | null {
  if (!isAuthenticated) {
    return (
      <Row
        title="Account sync and Connect to AI"
        sub="Sign in to sync your library; Connect to AI needs Account (Paid)"
        right={
          <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}>
            Sign in
          </span>
        }
        onClick={onSignIn}
        compact
      />
    );
  }

  if (currentMode === 'pro_xai') {
    return (
      <Row
        title="AI tools via bridge"
        sub="ask_scope, summarize, and synthesize when orchestrator mode is on"
        compact
      />
    );
  }

  return (
    <Row
      title="Connect to AI"
      sub="Available with Account (Paid) — upgrade in Settings"
      compact
    />
  );
}

export function mcpTierLabel(isAuthenticated: boolean, currentMode: ModeType): string {
  if (!isAuthenticated) {
    return 'Guest · Local only';
  }
  const branding = getModeBranding(currentMode);
  return `${branding.displayName} · ${branding.tagline}`;
}
