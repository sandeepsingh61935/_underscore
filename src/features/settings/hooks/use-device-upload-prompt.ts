/**
 * @file use-device-upload-prompt.ts
 * @description Show the post-sign-in Upload modal when the background set the flag.
 */

import { useCallback, useEffect, useState } from 'react';

import { useUploadFromDevice } from '@/features/collections/hooks/use-upload-from-device';
import {
  DEVICE_UPLOAD_PROMPT_KEY,
  readDeviceUploadPromptPending,
  setDeviceUploadPromptPending,
} from '@/shared/constants/device-upload-prompt';
import {
  DEVICE_UPLOAD_JOB_KEY,
  readLibraryTransferJob,
} from '@/shared/constants/library-transfer-job';

export function useDeviceUploadPrompt(isAuthenticated: boolean): {
  open: boolean;
  email: string | null;
  pendingCount: number;
  isUploading: boolean;
  error: string | null;
  dismiss: () => void;
  confirm: () => Promise<void>;
} {
  const { preview, upload, isUploading, error } = useUploadFromDevice();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [pendingCount, setPendingCount] = useState(0);

  const tryOpen = useCallback(async (): Promise<void> => {
    if (!isAuthenticated) return;
    const job = await readLibraryTransferJob(DEVICE_UPLOAD_JOB_KEY);
    if (job.status === 'running') return;
    const flagged = await readDeviceUploadPromptPending();
    if (!flagged) return;
    const data = await preview();
    if (!data || data.pendingCount <= 0) {
      await setDeviceUploadPromptPending(false);
      return;
    }
    setEmail(data.email);
    setPendingCount(data.pendingCount);
    setOpen(true);
  }, [isAuthenticated, preview]);

  useEffect(() => {
    if (!isAuthenticated) {
      setOpen(false);
      return;
    }
    void tryOpen();
  }, [isAuthenticated, tryOpen]);

  useEffect(() => {
    if (typeof chrome === 'undefined' || !chrome.storage?.onChanged) return;
    const listener = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string
    ): void => {
      if (area !== 'local') return;
      if (!(DEVICE_UPLOAD_PROMPT_KEY in changes)) return;
      if (changes[DEVICE_UPLOAD_PROMPT_KEY]?.newValue === true) {
        void tryOpen();
      }
    };
    chrome.storage.onChanged.addListener(listener);
    return () => {
      chrome.storage.onChanged.removeListener(listener);
    };
  }, [tryOpen]);

  const dismiss = useCallback((): void => {
    setOpen(false);
    void setDeviceUploadPromptPending(false);
  }, []);

  const confirm = useCallback(async (): Promise<void> => {
    setOpen(false);
    void setDeviceUploadPromptPending(false);
    void upload();
  }, [upload]);

  return {
    open,
    email,
    pendingCount,
    isUploading,
    error,
    dismiss,
    confirm,
  };
}
