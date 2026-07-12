import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useModeFeature, useConfigureAiProvidersGate } from '@/ui-system/hooks/useModeFeature';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(),
}));

function mockMode(mode: 'basic' | 'pro' | 'pro_xai'): void {
  vi.mocked(usePersistedMode).mockReturnValue({
    currentMode: mode,
    modeReady: true,
    persistMode: vi.fn(),
  });
}

describe('useModeFeature', () => {
  beforeEach(() => {
    mockMode('basic');
  });

  it('denies export in basic mode for a guest', () => {
    const { result } = renderHook(() => useModeFeature('export', false));

    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('CAPABILITY_DENIED');
  });

  it('denies sync in pro mode when signed out', () => {
    mockMode('pro');

    const { result } = renderHook(() => useModeFeature('sync', false));

    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('AUTH_REQUIRED');
  });

  it('denies AI in pro mode when signed in', () => {
    mockMode('pro');

    const { result } = renderHook(() => useModeFeature('ai', true));

    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('WRONG_MODE');
  });

  it('allows export in pro mode when signed in', () => {
    mockMode('pro');

    const { result } = renderHook(() => useModeFeature('export', true));

    expect(result.current.allowed).toBe(true);
  });

  it('allows AI in pro_xai when signed in', () => {
    mockMode('pro_xai');

    const { result } = renderHook(() => useModeFeature('ai', true));

    expect(result.current.allowed).toBe(true);
  });

  it('allows provider setup in pro_xai', () => {
    mockMode('pro_xai');

    const { result } = renderHook(() => useConfigureAiProvidersGate(true));

    expect(result.current.allowed).toBe(true);
  });
});
