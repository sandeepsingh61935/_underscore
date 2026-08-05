/**
 * @file use-sync-library.ts
 * @description Hook for manual cloud → local library sync from Settings.
 * Reports progress percent (via LIBRARY_SYNC_PROGRESS) and last-sync timestamp.
 */

import { useCallback, useEffect, useState } from 'react';

import type { CloudHydrationResult } from '@/background/services/interfaces/i-cloud-hydration-service';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import {
  LIBRARY_SYNC_PROGRESS,
  SYNC_LIBRARY,
} from '@/shared/schemas/message-schemas';

export type SyncLibraryStatus = 'idle' | 'syncing' | 'success' | 'error';

const LAST_SYNC_STORAGE_KEY = 'library_last_sync_at';

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
  if (!iso) return 'Never synced on this device';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return 'Never synced on this device';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;

  if (diffMs < minute) return 'Last sync just now';
  if (diffMs < hour) {
    const m = Math.floor(diffMs / minute);
    return `Last sync ${m}m ago`;
  }
  if (diffMs < day) {
    const h = Math.floor(diffMs / hour);
    return `Last sync ${h}h ago`;
  }
  if (diffMs < 7 * day) {
    const d = Math.floor(diffMs / day);
    return `Last sync ${d}d ago`;
  }

  return `Last sync ${date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })}`;
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

async function writeLastSyncedAt(iso: string): Promise<void> {
  try {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
    await chrome.storage.local.set({ [LAST_SYNC_STORAGE_KEY]: iso });
  } catch {
    // Storage unavailable (tests / non-extension).
  }
}

export function useSyncLibrary(): UseSyncLibraryResult {
  const syncAction = useIpcAction<Record<string, never>, CloudHydrationResult>(SYNC_LIBRARY);
  const [status, setStatus] = useState<SyncLibraryStatus>('idle');
  const [lastResult, setLastResult] = useState<CloudHydrationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [progressPercent, setProgressPercent] = useState<number | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<string | null>(null);

  useEffect(() => {
    void readLastSyncedAt().then(setLastSyncedAt);
  }, []);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.runtime?.onMessage) return;

    const listener = (message: unknown): void => {
      if (!message || typeof message !== 'object') return;
      const msg = message as { type?: string; payload?: { percent?: number } };
      if (msg.type !== LIBRARY_SYNC_PROGRESS) return;
      const percent = msg.payload?.percent;
      if (typeof percent === 'number' && Number.isFinite(percent)) {
        setProgressPercent(Math.min(100, Math.max(0, Math.round(percent))));
      }
    };

    chrome.runtime.onMessage.addListener(listener);
    return () => {
      chrome.runtime.onMessage.removeListener(listener);
    };
  }, []);

  const sync = useCallback(async () => {
    setStatus('syncing');
    setError(null);
    setProgressPercent(0);

    const result = await syncAction({});

    if (!result.success) {
      setStatus('error');
      setError(result.error);
      setProgressPercent(null);
      return;
    }

    const iso = new Date().toISOString();
    setLastResult(result.data);
    setLastSyncedAt(iso);
    void writeLastSyncedAt(iso);
    setProgressPercent(100);
    setStatus('success');
    // Clear percent after a short beat so the UI can show 100% briefly.
    window.setTimeout(() => {
      setProgressPercent(null);
    }, 600);
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
