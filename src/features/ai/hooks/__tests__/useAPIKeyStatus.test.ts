import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

import { useAPIKeyStatus } from '../useAPIKeyStatus';

vi.mock('@/shared/hooks/useIpcAction', () => ({
  useIpcAction: <TPayload, TResponse>(type: string) => {
    return vi.fn(async (payload: TPayload): Promise<{ success: true; data: TResponse } | { success: false; error: string }> => {
      if (type === 'IPC_AI_GET_API_KEY_STATUS') {
        const { provider } = payload as { provider: string };
        return { success: true, data: { configured: provider === 'anthropic' } as TResponse };
      }
      return { success: false, error: 'unknown' };
    });
  },
}));

describe('useAPIKeyStatus', () => {
  it('returns configured=true for anthropic', async () => {
    const { result } = renderHook(() => useAPIKeyStatus('anthropic'));
    await waitFor(() => expect(result.current.configured).toBe(true));
  });

  it('returns configured=false for ollama', async () => {
    const { result } = renderHook(() => useAPIKeyStatus('ollama'));
    await waitFor(() => expect(result.current.configured).toBe(false));
  });
});