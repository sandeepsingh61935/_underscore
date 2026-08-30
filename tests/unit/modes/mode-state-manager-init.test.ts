import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModeStateManager } from '@/content/modes/mode-state-manager';
import { ModeManager } from '@/content/modes/mode-manager';
import { EventBus } from '@/shared/utils/event-bus';
import { MODE_STORAGE_KEY } from '@/shared/constants/mode-storage';
import type { ILogger } from '@/shared/utils/logger';

describe('ModeStateManager - Init', () => {
  it('should activate a mode on init', async () => {
    global.chrome = {
      storage: {
        local: { get: vi.fn().mockResolvedValue({}), set: vi.fn() },
        onChanged: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    } as any;

    const eventBus = new EventBus();
    const logger = { info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() };
    const modeManager = new ModeManager(eventBus, logger as any);
    modeManager.registerMode({
      name: 'basic',
      onActivate: vi.fn(),
      onDeactivate: vi.fn(),
      createHighlight: vi.fn(),
      createFromData: vi.fn(),
      removeHighlight: vi.fn(),
      clearAll: vi.fn(),
      getHighlight: vi.fn(),
      shouldRestore: vi.fn().mockReturnValue(true),
      onHighlightCreated: vi.fn(),
      onHighlightRemoved: vi.fn(),
    } as any);
    const modeStateManager = new ModeStateManager(eventBus, modeManager, logger as any);

    await modeStateManager.init();

    // This should not throw if a mode is activated
    expect(() => modeManager.getCurrentMode()).not.toThrow();
  });
});

describe('ModeStateManager - Storage persistence (no circuit breaker)', () => {
  let mockStorage: { get: ReturnType<typeof vi.fn>; set: ReturnType<typeof vi.fn> };

  beforeEach(() => {
    mockStorage = {
      get: vi.fn().mockResolvedValue({}),
      set: vi.fn().mockResolvedValue(undefined),
    };
    global.chrome = {
      storage: { local: mockStorage, onChanged: { addListener: vi.fn(), removeListener: vi.fn() } },
      runtime: { id: 'test-id', sendMessage: vi.fn().mockResolvedValue(undefined) },
    } as any;
  });

  it('should call chrome.storage.local.set directly on setMode (no circuit breaker wrapping)', async () => {
    const eventBus = { emit: vi.fn(), on: vi.fn() };
    const logger: ILogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;
    const modeManager = {
      activateMode: vi.fn().mockResolvedValue(undefined),
    } as any;

    const manager = new ModeStateManager(eventBus as any, modeManager, logger);
    await manager.setMode('pro', { isAuthenticated: true });

    // Direct call — one storage.set per setMode, no circuit-breaker gating
    expect(mockStorage.set).toHaveBeenCalledTimes(1);
    expect(mockStorage.set).toHaveBeenCalledWith({ [MODE_STORAGE_KEY]: 'pro' });
  });

  it('should still call storage.set even after a prior failure (no circuit-breaker open state)', async () => {
    const eventBus = { emit: vi.fn(), on: vi.fn() };
    const logger: ILogger = {
      info: vi.fn(),
      debug: vi.fn(),
      error: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as any;
    const modeManager = {
      activateMode: vi.fn().mockResolvedValue(undefined),
    } as any;

    const manager = new ModeStateManager(eventBus as any, modeManager, logger);

    // First call fails
    mockStorage.set.mockRejectedValueOnce(new Error('QuotaExceededError'));
    await manager.setMode('pro', { isAuthenticated: true });

    // Second call should still hit storage (no circuit-breaker short-circuit)
    await manager.setMode('pro_xai', { isAuthenticated: true, isPaidActive: true });

    expect(mockStorage.set).toHaveBeenCalledTimes(2);
  });
});