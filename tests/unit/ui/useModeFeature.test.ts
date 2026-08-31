import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import {
  useModeFeature,
  useConfigureAiProvidersGate,
} from '@/ui-system/hooks/useModeFeature';
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

  it('denies AI when signed in but not paid', () => {
    mockMode('pro');
    const { result } = renderHook(() => useModeFeature('ai', true, false));
    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('PAID_REQUIRED');
  });

  it('allows export in pro mode when signed in', () => {
    mockMode('pro');
    const { result } = renderHook(() => useModeFeature('export', true));
    expect(result.current.allowed).toBe(true);
  });

  it('denies retired AI even when signed in', () => {
    mockMode('pro_xai');
    const { result } = renderHook(() => useModeFeature('ai', true, true));
    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('PAID_REQUIRED');
  });

  it('denies retired provider setup even when paid', () => {
    mockMode('pro_xai');
    const { result } = renderHook(() => useConfigureAiProvidersGate(true, true));
    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('PAID_REQUIRED');
  });

  it('allows MCP when signed in', () => {
    mockMode('pro_xai');
    const { result } = renderHook(() => useModeFeature('mcp', true, true));
    expect(result.current.allowed).toBe(true);
  });
});
