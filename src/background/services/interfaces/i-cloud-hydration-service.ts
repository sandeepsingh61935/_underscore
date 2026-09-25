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

/** 0–100 progress while hydrate runs. */
export type CloudHydrationProgress = (percent: number, phase?: string) => void;

export interface ICloudHydrationService {
  hydrate(onProgress?: CloudHydrationProgress): Promise<CloudHydrationResult>;
  /** True while a hydrate is in-flight. */
  isHydrating(): boolean;
  /** Resolves when current hydrate finishes (no-op if idle). */
  awaitHydration(): Promise<void>;
}
