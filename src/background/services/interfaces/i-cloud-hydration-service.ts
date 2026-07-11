/**
 * @file i-cloud-hydration-service.ts
 * @description Contract for pulling cloud highlights into local IndexedDB on auth.
 */

export interface CloudHydrationResult {
  localCountBefore: number;
  cloudCount: number;
  backfilledCount: number;
  updatedCount: number;
  deletedCount: number;
  skippedCount: number;
  failedCount: number;
  error?: string;
}

export interface ICloudHydrationService {
  hydrate(): Promise<CloudHydrationResult>;
}
