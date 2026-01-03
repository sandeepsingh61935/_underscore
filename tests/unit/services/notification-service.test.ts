/**
 * @file notification-service.test.ts
 * @description Unit tests for ChromeNotificationService
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { ChromeNotificationService } from '@/shared/services/notification-service';
import type { ILogger } from '@/shared/utils/logger';

describe('ChromeNotificationService (6 tests)', () => {
  let service: ChromeNotificationService;
  let mockLogger: ILogger;

  beforeEach(() => {
    // Mock Logger
    mockLogger = {
      error: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      warn: vi.fn(),
      setLevel: vi.fn(),
      getLevel: vi.fn(),
    } as unknown as ILogger;

    service = new ChromeNotificationService(mockLogger);

    // Reset Chrome API mocks (provided by setup.ts)
    vi.clearAllMocks();
  });

  it('1. notify() calls chrome.notifications.create', async () => {
    const id = await service.notify('Test Message');

    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'basic',
        message: 'Test Message',
        title: 'Underscore',
      }),
      expect.any(Function)
    );
    expect(id).toBeDefined();
  });

  it('2. maps "error" type to high priority', async () => {
    await service.notify('Fail', 'error');

    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 2,
      }),
      expect.any(Function)
    );
  });

  it('3. maps "info" type to default priority', async () => {
    await service.notify('Info', 'info');

    expect(chrome.notifications.create).toHaveBeenCalledWith(
      expect.objectContaining({
        priority: 0,
      }),
      expect.any(Function)
    );
  });

  it('4. clear() calls chrome.notifications.clear', async () => {
    await service.clear('id-123');

    expect(chrome.notifications.clear).toHaveBeenCalledWith(
      'id-123',
      expect.any(Function)
    );
  });

  it('5. handles chrome runtime errors gracefully', async () => {
    // Simulate runtime error
    // @ts-ignore - simulating chrome behavior
    chrome.runtime.lastError = { message: 'Mock error' };

    // Mock create to trigger callback immediately
    // @ts-ignore
    chrome.notifications.create.mockImplementation((opts, cb) => cb(''));

    const id = await service.notify('Test');

    expect(id).toBe('');
    expect(mockLogger.error).toHaveBeenCalled();

    // Reset
    // @ts-ignore
    delete chrome.runtime.lastError;
  });

  it('6. logs debug info on success', async () => {
    await service.notify('Success');
    expect(mockLogger.debug).toHaveBeenCalledWith(
      'Notification created',
      expect.any(Object)
    );
  });
});
