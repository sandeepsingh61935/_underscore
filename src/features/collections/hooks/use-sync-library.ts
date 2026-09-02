/**
 * @file use-sync-library.ts
 * @description Hook for manual cloud → local library sync from Settings.
 * Reports progress percent (via LIBRARY_SYNC_PROGRESS) and last-sync timestamp.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

import type { CloudHydrationResult } from '@/background/services/interfaces/i-cloud-hydration-service';
import {
  LAST_SYNC_STORAGE_KEY,
  LIBRARY_DOWNLOAD_JOB_KEY,
  readLibraryTransferJob,
  type LibraryTransferJob,
} from '@/shared/constants/library-transfer-job';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import { LIBRARY_SYNC_PROGRESS, SYNC_LIBRARY } from '@/shared/schemas/message-schemas';

export type SyncLibraryStatus = 'idle' | 'syncing' | 'success' | 'error';



export interface UseSyncLibraryResult {
  sync: () => Promise<void>;
  status: SyncLibraryStatus;
  lastResult: CloudHydrationResult | null;
  error: string | null;
  isSyncing: boolean;
  /** 0–100 while syncing; null when idle. */
  progressPercent: number | null;
  /** ISO timestamp of last successful manual sync, or null. */
  lastSyncedAt: string | null;
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

/** Human-readable last-sync line for Settings subtitles. */
function formatLastSyncedAt(iso: string | null | undefined): string {
  if (!iso) return 'Never synced';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never synced';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Just now';
  if (diffMs < hour) {
    const m = Math.floor(diffMs / minute);
    return `${m}m ago`;
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour);
    return `${h}h ago`;
  }
  if (diffMs < 7 * day) {
    const d = Math.floor(diffMs / day);
    return `${d}d ago`;
  }

  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

async function readLastSyncedAt(): Promise<string | null> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return null;
    const stored = await chrome.storage.local.get(LAST_SYNC_STORAGE_KEY);
    const value = stored[LAST_SYNC_STORAGE_KEY];
    return typeof value === 'string' ? value : null;
  } catch {
    return null;
  }
}

function jobToHydrationResult(job: LibraryTransferJob): CloudHydrationResult {
  return {
    localCountBefore: 0,
    cloudCount: 0,
    backfilledCount: job.backfilledCount ?? 0,
    updatedCount: job.updatedCount ?? 0,
    deletedCount: job.deletedCount ?? 0,
    skippedCount: job.skippedCount ?? 0,
    failedCount: job.failedCount ?? 0,
    error: job.error,
  };
}

export function useSyncLibrary(): UseSyncLibraryResult {
  const syncAction = useIpcAction<Record<string, never>, { started?: boolean }>(
    SYNC_LIBRARY
  );
  const [status, setStatus] = useState<SyncLibraryStatus>('idle');
  const [lastResult, setLastResult] = useState<CloudHydrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);
  const statusRef = useRef<SyncLibraryStatus>('idle');
  statusRef.current = status;

  const applyDownloadJob = useCallback((job: LibraryTransferJob): void => {
    if (job.status === 'running') {
      if (statusRef.current === 'success') return;
      setStatus('syncing');
      setError(null);
      return;
    }
    if (job.status === 'success') {
      setLastResult(jobToHydrationResult(job));
      setStatus('success');
      setError(null);
      setProgressPercent(null);
      void readLastSyncedAt().then(setLastSyncedAt);
      return;
    }
    if (job.status === 'error') {
      setStatus('error');
      setError(job.error ?? 'Merge failed');
      setProgressPercent(null);
    }
  }, []);

  useEffect(() => {
    void readLastSyncedAt().then(setLastSyncedAt);
    void readLibraryTransferJob(LIBRARY_DOWNLOAD_JOB_KEY).then(applyDownloadJob);
  }, [applyDownloadJob]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const listener = (message: unknown): void => {
      if (!message || typeof message !== 'object') return;
      const msg = message as { type?: string; payload?: { percent?: number } };
      if (msg.type !== LIBRARY_SYNC_PROGRESS) return;
      const percent = msg.payload?.percent;
      if (typeof percent === 'number' && Number.isFinite(percent)) {
        const next = Math.min(100, Math.max(0, Math.round(percent)));
        if (statusRef.current === 'success' || statusRef.current === 'error') {
          return;
        }
        if (next >= 100) {
          return;
        }
        setProgressPercent(next);
        setStatus('syncing');
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ): void => {
      if (area !== 'local') return;
      if (changes[LAST_SYNC_STORAGE_KEY]?.newValue) {
        const value = changes[LAST_SYNC_STORAGE_KEY].newValue;
        if (typeof value === 'string') setLastSyncedAt(value);
      }
      const jobChange = changes[LIBRARY_DOWNLOAD_JOB_KEY];
      if (jobChange?.newValue) {
        applyDownloadJob(jobChange.newValue as LibraryTransferJob);
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [applyDownloadJob]);

  const sync = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    setProgressPercent(0);

    const result = await syncAction({});

    if (!result.success) {
      setStatus('error');
      setError(result.error);
      setProgressPercent(null);
    }
  }, [syncAction]);

  return {
    sync,
    status,
    lastResult,
    error,
    isSyncing: status === 'syncing',
    progressPercent,
    lastSyncedAt,
  };
}

export { formatSyncSubtitle, formatLastSyncedAt, LAST_SYNC_STORAGE_KEY };
