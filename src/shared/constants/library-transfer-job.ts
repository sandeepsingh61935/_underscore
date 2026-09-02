/** Persist upload/download so work survives popup close. */

export const DEVICE_UPLOAD_JOB_KEY = 'device_upload_job';
export const LIBRARY_DOWNLOAD_JOB_KEY = 'library_download_job';
export const LAST_SYNC_STORAGE_KEY = 'library_last_sync_at';

export type LibraryTransferJobStatus = 'idle' | 'running' | 'success' | 'error';

export interface LibraryTransferJob {
  status: LibraryTransferJobStatus;
  startedAt?: number;
  finishedAt?: number;
  error?: string;
  copiedCount?: number;
  skippedCount?: number;
  failedCount?: number;
  tagsCopiedCount?: number;
  backfilledCount?: number;
  updatedCount?: number;
  deletedCount?: number;
}

function localStorageArea(): chrome.storage.StorageArea | null {
  const g = globalThis as {
    chrome?: { storage?: { local?: chrome.storage.StorageArea } };
  };
  return g.chrome?.storage?.local ?? null;
}

export async function writeLibraryTransferJob(
  key: string,
  job: LibraryTransferJob
): Promise<void> {
  const area = localStorageArea();
  if (!area) return;
  await area.set({ [key]: job });
}

export async function readLibraryTransferJob(
  key: string
): Promise<LibraryTransferJob> {
  const area = localStorageArea();
  if (!area) return { status: 'idle' };
  const stored = await area.get(key);
  const value = stored[key] as LibraryTransferJob | undefined;
  if (!value || typeof value !== 'object' || typeof value.status !== 'string') {
    return { status: 'idle' };
  }
  return value;
}

export async function writeLastSyncedAt(iso: string): Promise<void> {
  const area = localStorageArea();
  if (!area) return;
  await area.set({ [LAST_SYNC_STORAGE_KEY]: iso });
}
