/**
 * @file use-upload-from-device.ts
 * @description Settings / prompt hook: Guest library → account.
 */

import { useCallback, useEffect, useState } from 'react';

import type {
  DeviceLibraryUploadPreview,
  DeviceLibraryUploadResult,
} from '@/background/services/interfaces/i-device-library-upload';
import {
  DEVICE_UPLOAD_JOB_KEY,
  readLibraryTransferJob,
  type LibraryTransferJob,
} from '@/shared/constants/library-transfer-job';
import { useIpcAction } from '@/shared/hooks/useIpcAction';
import {
  DEVICE_UPLOAD_PREVIEW,
  UPLOAD_FROM_DEVICE,
} from '@/shared/schemas/message-schemas';

export type UploadFromDeviceStatus = 'idle' | 'uploading' | 'success' | 'error';

export function formatUploadSubtitle(result: DeviceLibraryUploadResult): string {
  const parts: string[] = [];
  if (result.copiedCount > 0) {
    parts.push(`${result.copiedCount} uploaded`);
  }
  if (result.skippedCount > 0) {
    parts.push(`${result.skippedCount} already in account`);
  }
  if (result.tagsCopiedCount > 0) {
    parts.push(`${result.tagsCopiedCount} tagged`);
  }
  if (result.failedCount > 0) {
    parts.push(`${result.failedCount} failed`);
  }
  if (parts.length === 0) {
    return 'Nothing new on this device';
  }
  return parts.join(' · ');
}

function jobToResult(job: LibraryTransferJob): DeviceLibraryUploadResult {
  return {
    copiedCount: job.copiedCount ?? 0,
    skippedCount: job.skippedCount ?? 0,
    failedCount: job.failedCount ?? 0,
    tagsCopiedCount: job.tagsCopiedCount ?? 0,
    queueFlushed: true,
    error: job.error,
  };
}

export function useUploadFromDevice(): {
  upload: () => Promise<DeviceLibraryUploadResult | null>;
  preview: () => Promise<DeviceLibraryUploadPreview | null>;
  status: UploadFromDeviceStatus;
  lastResult: DeviceLibraryUploadResult | null;
  error: string | null;
  isUploading: boolean;
} {
  const uploadAction = useIpcAction<Record<string, never>, { started?: boolean }>(
    UPLOAD_FROM_DEVICE
  );
  const previewAction = useIpcAction<Record<string, never>, DeviceLibraryUploadPreview>(
    DEVICE_UPLOAD_PREVIEW
  );
  const [status, setStatus] = useState<UploadFromDeviceStatus>('idle');
  const [lastResult, setLastResult] = useState<DeviceLibraryUploadResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyJob = useCallback((job: LibraryTransferJob): void => {
    if (job.status === 'running') {
      setStatus('uploading');
      setError(null);
      return;
    }
    if (job.status === 'success') {
      setLastResult(jobToResult(job));
      setStatus('success');
      setError(null);
      return;
    }
    if (job.status === 'error') {
      setStatus('error');
      setError(job.error ?? 'Upload failed');
    }
  }, []);

  useEffect(() => {
    void readLibraryTransferJob(DEVICE_UPLOAD_JOB_KEY).then(applyJob);
  }, [applyJob]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ): void => {
      if (area !== 'local') return;
      const change = changes[DEVICE_UPLOAD_JOB_KEY];
      if (!change?.newValue) return;
      applyJob(change.newValue as LibraryTransferJob);
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [applyJob]);

  const preview = useCallback(async (): Promise<DeviceLibraryUploadPreview | null> => {
    const result = await previewAction({});
    if (!result.success) return null;
    return result.data;
  }, [previewAction]);

  const upload = useCallback(async (): Promise<DeviceLibraryUploadResult | null> => {
    setStatus('uploading');
    setError(null);
    const result = await uploadAction({});
    if (!result.success) {
      setStatus('error');
      setError(result.error);
      return null;
    }
    return null;
  }, [uploadAction]);

  return {
    upload,
    preview,
    status,
    lastResult,
    error,
    isUploading: status === 'uploading',
  };
}
