import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { useAPIKeyStatus } from '../useAPIKeyStatus';

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: <TPayload, TResponse>(type: string) => {
    return vi.fn(async (payload: TPayload): Promise<{ success: true; data: TResponse } | { success: false; error: string }> => {
      if (type === 'IPC_AI_GET_API_KEY_STATUS') {
        const { provider } = payload as { provider: string };
        return {
          success: true,
          data: {
            configured: provider === 'anthropic',
            model: provider === 'openrouter' ? 'openrouter/free' : 'claude-sonnet-4-6',
          } as TResponse,
        };
      }
      return { success: false, error: 'unknown' };
    });
  },
}));

describe('useAPIKeyStatus', () => {
  it('returns configured=true for anthropic', async () => {
    const { result } = renderHook(() => useAPIKeyStatus('anthropic'));
    await waitFor(() => expect(result.current.configured).toBe(true));
    await waitFor(() => expect(result.current.model).toBe('claude-sonnet-4-6'));
  });

  it('returns configured=false for ollama', async () => {
    const { result } = renderHook(() => useAPIKeyStatus('ollama'));
    await waitFor(() => expect(result.current.configured).toBe(false));
  });
});