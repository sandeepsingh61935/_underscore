import React from 'react';

import { useOAuthGrants } from '@/features/oauth/hooks/useOAuthGrants';
import { Row } from '@/ui-system/components/primitives/Row';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

export interface ConnectedAppsSettingsProps {
  isAuthenticated: boolean;
}

export function ConnectedAppsSettings({
  isAuthenticated,
}: ConnectedAppsSettingsProps): React.ReactElement | null {
  const { grants, isLoading, error, revoke, isRevoking } = useOAuthGrants(isAuthenticated);

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>
        Connected apps
      </div>
      {isLoading ? (
        <Row title="Loading connected apps" sub="MCP and OAuth clients" right={<Spinner size="sm" />} />
      ) : null}
      {!isLoading && error ? (
        <Row title="Connected apps" sub={error} />
      ) : null}
      {!isLoading && !error && grants.length === 0 ? (
        <Row
          title="No connected apps"
          sub="ChatGPT and other MCP clients appear here after you approve access"
        />
      ) : null}
      {!isLoading && !error
        ? grants.map((grant) => (
          <Row
            key={grant.clientId}
            title={grant.clientName}
            sub={grant.scopes.length > 0 ? grant.scopes.join(', ') : 'Approved MCP access'}
            right={
              isRevoking ? (
                <Spinner size="sm" />
              ) : (
                <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--accent)' }}>
                  Revoke
                </span>
              )
            }
            onClick={isRevoking ? undefined : () => { void revoke(grant.clientId); }}
          />
        ))
        : null}
    </>
  );
}
