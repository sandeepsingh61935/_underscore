import { useCallback, useEffect, useState } from 'react';

import { GET_VAULT_LOCK_STATUS } from '@/shared/schemas/message-schemas';
import { useIpcAction } from '@/shared/hooks/useIpcAction';

interface VaultLockStatus {
  vaultLocked: boolean;
}

/** True when a signed-in user's vault is locked and deletes must be blocked. */
export function useVaultLocked(isAuthenticated: boolean): boolean {
  const fetchStatus = useIpcAction<Record<string, never>, VaultLockStatus>(GET_VAULT_LOCK_STATUS);
  const [vaultLocked, setVaultLocked] = useState(false);

  const refresh = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) {
      setVaultLocked(false);
      return;
    }
    const result = await fetchStatus({});
    if (result.success) {
      setVaultLocked(result.data.vaultLocked);
    }
  }, [fetchStatus, isAuthenticated]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return vaultLocked;
}
