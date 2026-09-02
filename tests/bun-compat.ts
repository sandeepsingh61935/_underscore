/**
 * @file tests/bun-compat.ts
 * @description Compatibility layer for running tests directly with native `bun test`.
 * Provides Vitest API shims (vi.mocked, vi.stubGlobal) and initializes extension mocks.
 */

import { vi } from 'vitest';
import './setup.ts';

// Provide vi.mocked shim for Bun runtime if not present
if (typeof vi.mocked !== 'function') {
  (vi as any).mocked = (item: any) => item;
}

// Provide vi.stubGlobal shim
const stubbedGlobals = new Map<string, any>();
if (typeof vi.stubGlobal !== 'function') {
  (vi as any).stubGlobal = (key: string, value: any) => {
    if (!stubbedGlobals.has(key)) {
      stubbedGlobals.set(key, (globalThis as any)[key]);
    }
    (globalThis as any)[key] = value;
  };
}

// Provide vi.unstubAllGlobals shim
if (typeof vi.unstubAllGlobals !== 'function') {
  (vi as any).unstubAllGlobals = () => {
    for (const [key, origVal] of stubbedGlobals.entries()) {
      if (origVal === undefined) {
        delete (globalThis as any)[key];
      } else {
        (globalThis as any)[key] = origVal;
      }
    }
    stubbedGlobals.clear();
  };
}
