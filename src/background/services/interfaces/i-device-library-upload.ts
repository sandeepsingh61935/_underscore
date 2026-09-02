export interface DeviceLibraryUploadPreview {
  pendingCount: number;
  email: string | null;
}

export interface DeviceLibraryUploadResult {
  copiedCount: number;
  skippedCount: number;
  failedCount: number;
  tagsCopiedCount: number;
  queueFlushed: boolean;
  error?: string;
}

export interface IDeviceLibraryUpload {
  preview(): Promise<DeviceLibraryUploadPreview>;
  upload(): Promise<DeviceLibraryUploadResult>;
}
