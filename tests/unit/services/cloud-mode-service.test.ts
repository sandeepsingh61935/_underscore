/**
 * @file cloud-mode-service.test.ts
 * @description Verifies that the CloudModeService module is safe to import under
 * ES module semantics (no `require()` at module load or in callable code).
 *
 * Regression: getCloudModeService() used `require('@/...')` to dodge a
 * (perceived) circular import. In an MV3 SW (`defineBackground({type:'module'})`)
 * and in vitest's ESM transform, `require` is undefined, so any caller would
 * crash. The function is `@deprecated` ("Use DI container for better
 * testability and cloud sync support") and has no live importers — the
 * correct fix is to remove it entirely.
 */
import { describe, it, expect } from 'vitest';

describe('CloudModeService module', () => {
  it('imports cleanly under ES module semantics (no require() at load)', async () => {
    // If any top-level statement in cloud-mode-service.ts uses require(),
    // this import throws ReferenceError before the test body runs.
    const mod = await import('@/services/cloud-mode-service');
    expect(mod.CloudModeService).toBeTypeOf('function');
  });

  it('does not export a deprecated getCloudModeService that uses require()', async () => {
    // After cleanup, the deprecated factory must be gone so it cannot be
    // called by a future contributor and crash the host context.
    const mod = await import('@/services/cloud-mode-service');
    expect((mod as Record<string, unknown>).getCloudModeService).toBeUndefined();
  });
});
