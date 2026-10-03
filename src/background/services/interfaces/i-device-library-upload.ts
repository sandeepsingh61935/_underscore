export interface DeviceLibraryUploadPreview {
  pendingCount: number;
  /** Guest groups (matched by name + color) not yet in the account. */
  pendingGroupCount: number;
  /** Live items inside pending guest groups whose item key is not yet in the account. */
  pendingGroupItemCount: number;
  email: string | null;
}

export interface DeviceLibraryUploadResult {
  copiedCount: number;
  skippedCount: number;
  failedCount: number;
  tagsCopiedCount: number;
  /** Guest groups copied into the account (new ids, Basic copies kept). */
  groupsCopiedCount: number;
  /** Group items copied under the new group ids. */
  groupItemsCopiedCount: number;
  queueFlushed: boolean;
  error?: string;
}

export interface IDeviceLibraryUpload {
  preview(): Promise<DeviceLibraryUploadPreview>;
  upload(): Promise<DeviceLibraryUploadResult>;
}

/** True when the preview carries anything worth prompting for. */
export function previewHasPending(preview: DeviceLibraryUploadPreview): boolean {
  return (
    preview.pendingCount > 0 ||
    preview.pendingGroupCount > 0 ||
    preview.pendingGroupItemCount > 0
  );
}
