/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { useProviderModels } from '../useProviderModels';
import { getProviderModels } from '@/shared/llm/provider-models';

vi.mock('@/shared/hooks/useIpcAction', () => {
  const ipcUnavailable = vi.fn(async () => ({
    success: false as const,
    error: 'Chrome extension runtime is unavailable in this context.',
  }));
  return {
    hasChromeRuntime: () => false,
    useIpcAction: () => ipcUnavailable,
  };
});

describe('useProviderModels', () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it('surfaces the static catalog when no key and IPC is unavailable', async () => {
    const { result } = renderHook(() => useProviderModels('openai'));
    await waitFor(() => expect(result.current.loading).toBe(false));
    expect(result.current.models).toEqual(getProviderModels('openai'));
    expect(result.current.error).toBeNull();
  });
});
