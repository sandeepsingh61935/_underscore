/**
 * @vitest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('@/shared/llm/openrouter-models', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/llm/openrouter-models')>();
  return { ...actual, getOpenRouterModels: vi.fn() };
});

import { getOpenRouterModels } from '@/shared/llm/openrouter-models';
import { useProviderModels } from '@/features/ai/hooks/useProviderModels';

describe('debug useProviderModels', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('chrome', {
      runtime: { id: 'test-extension', sendMessage: vi.fn() },
      storage: {
        local: { get: vi.fn(async () => ({})), set: vi.fn(async () => undefined) },
      },
    });
  });

  it('uses the mocked catalog', async () => {
    vi.mocked(getOpenRouterModels).mockResolvedValue([
      { id: 'free-a', label: 'Free A', hint: 'free', requiresKey: false },
    ]);
    const { result } = renderHook(() => useProviderModels('openrouter'));
    await waitFor(() => expect(result.current.models.length).toBeGreaterThan(0));
    expect(result.current.models).toEqual([
      { id: 'free-a', label: 'Free A', hint: 'free', requiresKey: false },
    ]);
  });
});
