import { describe, it, expect, vi } from 'vitest';

vi.stubEnv('VITE_SUPABASE_URL', 'https://mock.supabase.co');
vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'mock-anon-key');

(globalThis as any).defineBackground = (def: any) => def;

import backgroundDef from '@/entrypoints/background';
import { restoreConsole } from '../../setup';

describe('Background Full Lifecycle', () => {
  it('runs complete background startup sequence without throwing', async () => {
    restoreConsole();
    (globalThis as any).chrome = {
      ...(globalThis as any).chrome,
      alarms: {
        create: vi.fn(),
        clear: vi.fn(),
        onAlarm: { addListener: vi.fn(), removeListener: vi.fn() },
      },
      identity: {
        getRedirectURL: vi.fn(() => 'https://mock.chromiumapp.org'),
        launchWebAuthFlow: vi.fn(),
      },
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
          remove: vi.fn().mockResolvedValue(undefined),
        },
        onChanged: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
      },
      runtime: {
        lastError: undefined,
        id: 'test-id',
        getManifest: () => ({ version: '1.0.0' }),
        onMessage: {
          addListener: vi.fn(),
          removeListener: vi.fn(),
        },
        onMessageExternal: {
          addListener: vi.fn(),
        },
        onConnect: {
          addListener: vi.fn(),
        },
      },
      tabGroups: undefined,
      tabs: {
        query: vi.fn().mockResolvedValue([]),
        onUpdated: { addListener: vi.fn() },
        onRemoved: { addListener: vi.fn() },
        onAttached: { addListener: vi.fn() },
        onDetached: { addListener: vi.fn() },
      },
      permissions: {
        contains: vi.fn().mockResolvedValue(false),
        request: vi.fn().mockResolvedValue(false),
        onRemoved: { addListener: vi.fn(), removeListener: vi.fn() },
      },
    };

    (globalThis as any).browser = (globalThis as any).chrome;

    await (backgroundDef as any).main();

    // Check message listeners
    const onMessageCalls = (globalThis as any).chrome.runtime.onMessage.addListener.mock.calls;
    console.log('onMessageCalls count:', onMessageCalls.length);

    const mainListener = onMessageCalls[0][0];
    const sendResponse = vi.fn();

    const handled = mainListener(
      {
        type: 'GROUP_OPEN_IN_BROWSER',
        payload: { groupId: '123e4567-e89b-12d3-a456-426614174000' },
        timestamp: Date.now(),
      },
      { id: 'test-id' },
      sendResponse
    );
    expect(handled).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sendResponse).toHaveBeenCalled();
    const call = sendResponse.mock.calls[0];
    expect(call).toBeDefined();
    const res = call![0];
    expect(res).toBeDefined();
    // Since tabGroups API is not granted/available in this test run, it safely returns error rather than crashing
    expect(res.success).toBe(false);
    expect(res.error).toMatch(/permissions|available/i);
  });

  it('boots gracefully into basic mode without throwing when VITE_SUPABASE_URL is unconfigured', async () => {
    restoreConsole();
    vi.stubEnv('VITE_SUPABASE_URL', '');
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', '');

    (globalThis as any).chrome.runtime.onMessage.addListener.mockClear();

    await (backgroundDef as any).main();

    const onMessageCalls = (globalThis as any).chrome.runtime.onMessage.addListener.mock.calls;
    expect(onMessageCalls.length).toBeGreaterThan(0);

    const mainListener = onMessageCalls[0][0];
    const sendResponse = vi.fn();

    const handled = mainListener(
      {
        type: 'EXTENSION_GET_BROWSER_TAB_GROUPS',
        payload: {},
        timestamp: Date.now(),
      },
      { id: 'test-id' },
      sendResponse
    );
    expect(handled).toBe(true);

    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(sendResponse).toHaveBeenCalled();
    const res = sendResponse.mock.calls[0]![0];
    expect(res.code).not.toBe('INIT_FAILED');
    expect(res.error).not.toMatch(/Background initialization failed/i);
  });
});
