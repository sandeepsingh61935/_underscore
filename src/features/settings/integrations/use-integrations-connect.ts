import { useCallback, useEffect, useMemo, useState } from 'react';

import { useOAuthGrants } from '@/features/oauth/hooks/useOAuthGrants';
import { useMessageBus } from '@/shared/contexts/MessageBusContext';
import { canUseMcp } from '@/shared/entitlement/commercial';
import { getMcpCloudUrl } from '@/shared/mcp/mcp-cloud-url';
import { resolveIntegrationsStatus } from '@/shared/mcp/integrations-status';
import { fetchLastMcpSuccessAtMs } from '@/shared/mcp/mcp-session-client';

export function useIntegrationsConnect(opts: {
  isAuthenticated: boolean;
  isPaidActive: boolean;
}) {
  const mcpAllowed = canUseMcp(opts).allowed;
  const grantsState = useOAuthGrants(opts.isAuthenticated && mcpAllowed);
  const remoteUrl = getMcpCloudUrl();
  const [urlCopied, setUrlCopied] = useState(false);
  const [lastMcpSuccessAtMs, setLastMcpSuccessAtMs] = useState<number | null>(null);
  const messageBus = useMessageBus();

  useEffect(() => {
    if (!opts.isAuthenticated || !mcpAllowed) {
      setLastMcpSuccessAtMs(null);
      return;
    }
    let cancelled = false;
    const loadSession = (): void => {
      void fetchLastMcpSuccessAtMs(messageBus).then((ms) => {
        if (!cancelled) setLastMcpSuccessAtMs(ms);
      });
    };
    loadSession();
    const onFocus = (): void => {
      void grantsState.reload();
      loadSession();
    };
    window.addEventListener('focus', onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener('focus', onFocus);
    };
  }, [opts.isAuthenticated, mcpAllowed, messageBus, grantsState.reload]);

  const status = resolveIntegrationsStatus({
    mcpAllowed,
    oauthGrantCount: grantsState.grants.length,
    lastMcpSuccessAtMs,
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
