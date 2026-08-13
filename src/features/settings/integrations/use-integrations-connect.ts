import { useCallback, useMemo, useState } from 'react';

import { useOAuthGrants } from '@/features/oauth/hooks/useOAuthGrants';
import { canUseMcp } from '@/shared/entitlement/commercial';
import { getMcpCloudUrl } from '@/shared/mcp/mcp-cloud-url';
import { resolveIntegrationsStatus } from '@/shared/mcp/integrations-status';

export function useIntegrationsConnect(opts: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
}) {
  const mcpAllowed = canUseMcp(opts).allowed;
  const grantsState = useOAuthGrants(opts.isAuthenticated && mcpAllowed);
  const remoteUrl = getMcpCloudUrl();
  const [urlCopied, setUrlCopied] = useState(false);

  const status = resolveIntegrationsStatus({
    mcpAllowed,
    oauthGrantCount: grantsState.grants.length,
  });

  const connectedApps = useMemo(
    () =>
      grantsState.grants.map((grant) => ({
        id: grant.clientId,
        title: grant.clientName,
        sub: grant.scopes.length > 0 ? grant.scopes.join(', ') : 'Approved MCP access',
      })),
    [grantsState.grants],
  );

  const copyUrl = useCallback((): void => {
    void navigator.clipboard.writeText(remoteUrl).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 2000);
    });
  }, [remoteUrl]);

  return {
    mcpAllowed,
    status,
    remoteUrl,
    urlCopied,
    copyUrl,
    connectedApps,
    grantsError: grantsState.error,
    revoke: grantsState.revoke,
    isRevoking: grantsState.isRevoking,
    isLoadingGrants: grantsState.isLoading,
  };
}
