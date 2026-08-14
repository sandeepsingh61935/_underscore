import React from 'react';

import {
  integrationsStatusDetail,
  integrationsStatusLabel,
  type IntegrationsStatus,
} from '@/shared/mcp/integrations-status';

export const INTEGRATIONS_ADVANCED_COPY =
  'Scripts may send Authorization: Bearer with a Supabase access token. Do not paste that token in this app.';

/** Status row only — host handoff lives on setup screens; URL under Server details. */
export function IntegrationsConnectChrome({
  mcpAllowed,
  status,
  grantTitles,
  lockedDetail,
}: {
  mcpAllowed: boolean;
  status: IntegrationsStatus;
  grantTitles: readonly string[];
  lockedDetail: string;
}): React.ReactElement {
  const detail = mcpAllowed
    ? integrationsStatusDetail({
        status,
        oauthGrantCount: grantTitles.length,
        grantTitles,
      })
    : lockedDetail;

  return (
    <div
      data-od-id="settings-mcp"
      data-testid="integrations-connect-chrome"
      style={{
        margin: '0 0 10px',
        padding: 12,
        border: '1px solid var(--rule)',
        opacity: mcpAllowed ? 1 : 0.65,
      }}
    >
      <div
        className="setting-row"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr auto',
          alignItems: 'center',
          gap: 12,
        }}
      >
        <div className="grow">
          <div
            className="title u-sans"
            style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)' }}
          >
            Status
          </div>
          <div
            className="sub u-mono"
            style={{ fontSize: 'var(--step--2)', color: 'var(--ink)', marginTop: 4 }}
          >
            {detail}
          </div>
        </div>
        <span
          className="status u-mono"
          data-od-id="settings-mcp-status"
          data-testid="mcp-integrations-status"
          style={{
            fontSize: 'var(--step--2)',
            color: mcpAllowed && status === 'connected' ? 'var(--accent)' : 'var(--ink)',
          }}
        >
          {integrationsStatusLabel(status)}
        </span>
      </div>
    </div>
  );
}
