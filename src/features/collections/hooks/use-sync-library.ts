/**
 * @file use-sync-library.ts
 * @description Hook for manual cloud → local library sync from Settings.
 */

import { useCallback, useState } from 'react';

import type { CloudHydrationResult } from '@/background/services/interfaces/i-cloud-hydration-service';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { SYNC_LIBRARY } from '@/shared/schemas/message-schemas';

export type SyncLibraryStatus = 'idle' | 'syncing' | 'success' | 'error';

export interface UseSyncLibraryResult {
  sync: () => Promise<void>;
  status: SyncLibraryStatus;
  lastResult: CloudHydrationResult | null;
  error: string | null;
  isSyncing: boolean;
}

function formatSyncSubtitle(result: CloudHydrationResult): string {
  const parts: string[] = [];
  if (result.backfilledCount > 0) {
    parts.push(`${result.backfilledCount} added`);
  }
  if (result.updatedCount > 0) {
    parts.push(`${result.updatedCount} updated`);
  }
  if (result.deletedCount > 0) {
    parts.push(`${result.deletedCount} removed`);
  }
  if (result.skippedCount > 0) {
    parts.push(`${result.skippedCount} up to date`);
  }
  if (result.failedCount > 0) {
    parts.push(`${result.failedCount} failed`);
  }
  if (parts.length === 0) {
    return 'Library matches cloud';
  }
  return parts.join(' · ');
}

export function useSyncLibrary(): UseSyncLibraryResult {
  const syncAction = useIpcAction<Record<string, never>, CloudHydrationResult>(SYNC_LIBRARY);
  const [status, setStatus] = useState<SyncLibraryStatus>('idle');
  const [lastResult, setLastResult] = useState<CloudHydrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const sync = useCallback(async () => {
    setStatus('syncing');
    setError(null);

    const result = await syncAction({});

    if (!result.success) {
      setStatus('error');
      setError(result.error);
      return;
    }

    setLastResult(result.data);
    setStatus('success');
  }, [syncAction]);

  return {
    sync,
    status,
    lastResult,
    error,
    isSyncing: status === 'syncing',
  };
}

export { formatSyncSubtitle };
