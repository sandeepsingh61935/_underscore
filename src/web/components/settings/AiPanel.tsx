/**
 * Web Settings → Integrations (MCP only).
 * Models & Ask product retired — PRD free-window-integrations-only.
 */

import React, { useCallback, useState } from 'react';
import { Link } from 'react-router-dom';

import {
  IntegrationsWebList,
  IntegrationsWebSetup,
} from '@/features/settings/integrations/IntegrationsWebPanel';
import { getMcpCloudUrl } from '@/shared/mcp/mcp-cloud-url';
import type { McpAiAppId } from '@/features/settings/mcp/mcp-ai-apps';
import { billingUpcomingCopy } from '@/shared/billing/billing-upcoming-copy';
import type { SettingsBillingCta } from '@/shared/utils/settings-billing-cta';
import type { WebCaps } from '@/web/caps/resolveWebCaps';

export type AiView =
  | { panel: 'list' }
  | { panel: 'app'; id: McpAiAppId };

const INITIAL_VIEW: AiView = { panel: 'list' };

export function AiPanel({
  caps,
  isAuthenticated,
  billingCta,
  onBillingAction,
}: {
  caps: WebCaps;
  isAuthenticated: boolean;
  userId?: string | null;
  billingCta?: SettingsBillingCta | null;
  onBillingAction?: () => void;
}): React.ReactElement {
  const mcpAllowed = caps.flags.mcp;
  const freeWindow = caps.freeWindow;
  const upcoming = billingUpcomingCopy();
  // billingCta / onBillingAction kept for call-site compat; Polar UI not exposed.
  void billingCta;
  void onBillingAction;
  const [view, setView] = useState<AiView>(INITIAL_VIEW);

  const goList = useCallback(() => {
    setView({ panel: 'list' });
  }, []);

  return (
    <div className="settings-panel is-tab-enter" data-od-id="settings-ai">
      <h2>Integrations</h2>
      <p className="lead">
        Connect agents that read your synced library (MCP). No in-app chat or API keys.
      </p>

      {freeWindow && isAuthenticated && mcpAllowed ? (
        <div className="banner" data-od-id="ai-early-access-banner" role="status">
          <div className="grow">
            <strong>Early access</strong>
            <div className="sub" style={{ marginTop: 4 }}>
              Integrations are free for early users. Paid packaging comes later.
            </div>
          </div>
        </div>
      ) : null}

      {!mcpAllowed ? (
        <div className="banner" data-od-id="ai-lock-banner">
          <div className="grow">
            <strong>{isAuthenticated ? 'Integrations locked' : 'Sign in required'}</strong>
            <div className="sub" style={{ marginTop: 4 }}>
              {isAuthenticated
                ? `${upcoming.title}: ${upcoming.sub}`
                : 'Sign in so agents can read your cloud library.'}
            </div>
          </div>
          {!isAuthenticated ? (
            <Link
              to="/sign-in"
              className="btn accent sm"
              data-od-id="settings-ai-see-plan"
            >
              Sign in
            </Link>
          ) : null}
        </div>
      ) : null}

      {view.panel === 'app' ? (
        <IntegrationsWebSetup
          appId={view.id}
          mcpAllowed={mcpAllowed}
          remoteUrl={getMcpCloudUrl()}
          onBack={goList}
        />
      ) : (
        <IntegrationsWebList
          isAuthenticated={isAuthenticated}
          isPaidActive={caps.isPaidActive || (freeWindow && isAuthenticated)}
          onOpenApp={(id) => setView({ panel: 'app', id })}
        />
      )}
    </div>
  );
}
