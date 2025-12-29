/**
 * @file test/setup.ts
 * @description Global test setup for Vitest
 */

// Add any global test setup here
// For example: custom matchers, global mocks, etc.

// Polyfill for crypto.randomUUID in test environment
if (typeof crypto === 'undefined' || !crypto.randomUUID) {
  global.crypto = {
    ...global.crypto,
    randomUUID: () => {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
    },
  } as Crypto;
}

// Mock console methods in tests to reduce noise
const originalConsole = { ...console };

global.console = {
  ...console,
  log: vi.fn(),
  debug: vi.fn(),
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
};

// Restore console for debugging when needed
export const restoreConsole = (): void => {
  global.console = originalConsole;
};
