/**
 * @file bootstrap.test.ts
 * @description Tracer-bullet test for background service initialization.
 *
 * Regression: `defineBackground({ type: 'module' })` boots the SW as an ES module,
 * so `require` is undefined. DI registration factories must use static `import`,
 * not `require(...)`. This test exercises the actual SW init path through
 * `bootstrap.ts` (NOT the duplicate at `src/shared/di/`).
 */
import { describe, it, expect, vi } from 'vitest';
import { initializeBackground } from '@/background/bootstrap';
import { Container } from '@/background/di/container';
import { DualWriteRepository } from '@/background/repositories/dual-write-repository';
import { ScopedHighlightRepository } from '@/shared/repositories/scoped-highlight-repository';

vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');

describe('Background Bootstrap Initialization', () => {
  it('runs initializeBackground without "require is not defined"', async () => {
    // AuthManager.initialize() registers chrome.alarms listeners. Stub the
    // chrome APIs so the test environment mirrors the real SW context.
    (globalThis as any).chrome = {
      ...(globalThis as any).chrome,
      alarms: { create: vi.fn(), clear: vi.fn(), onAlarm: { addListener: vi.fn(), removeListener: vi.fn() } },
      identity: { getRedirectURL: vi.fn(() => 'https://mock.chromiumapp.org'), launchWebAuthFlow: vi.fn() },
      storage: { local: { get: vi.fn(), set: vi.fn(), remove: vi.fn() } },
      runtime: { lastError: undefined },
    };

    // If any DI factory in the SW init path still uses require(), this throws
    // ReferenceError: require is not defined. The fix: convert all such calls
    // to top-level static imports.
    const container = await initializeBackground();
    expect(container).toBeInstanceOf(Container);

    // Exercise the two factory paths that previously used require() in the
    // SW-init-scoped registration file.
    const localRepo = container.resolve<ScopedHighlightRepository>('localRepository' as never);
    expect(localRepo).toBeInstanceOf(ScopedHighlightRepository);

    const highlightRepo = container.resolve<DualWriteRepository>('highlightRepository');
    expect(highlightRepo).toBeInstanceOf(DualWriteRepository);

    // Auth storage path must leave a defined active scope (basic when logged out in tests)
    expect(localRepo.getActiveScope()).toMatch(/^(basic|pro)$/);
  });
});
