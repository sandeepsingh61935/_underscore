import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useModeFeature, useConfigureAiProvidersGate } from '@/ui-system/hooks/useModeFeature';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(),
}));

vi.mock('@/features/billing/BillingProvider', () => ({
  useBillingContextOptional: vi.fn(() => null),
}));

function mockMode(mode: 'basic' | 'pro' | 'pro_xai'): void {
  vi.mocked(usePersistedMode).mockReturnValue({
    currentMode: mode,
    modeReady: true,
    persistMode: vi.fn(),
  });
}

function mockPaid(isPaidActive: boolean): void {
  vi.mocked(useBillingContextOptional).mockReturnValue(
    isPaidActive
      ? ({ snapshot: { isPaidActive: true, loadState: 'ready' } } as never)
      : null,
  );
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
    mockPaid(false);

    const { result } = renderHook(() => useModeFeature('ai', true));

    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('PAID_REQUIRED');
  });

  it('allows export in pro mode when signed in', () => {
    mockMode('pro');

    const { result } = renderHook(() => useModeFeature('export', true));

    expect(result.current.allowed).toBe(true);
  });

  it('allows AI when signed in and paid', () => {
    mockMode('pro_xai');
    mockPaid(true);

    const { result } = renderHook(() => useModeFeature('ai', true));

    expect(result.current.allowed).toBe(true);
  });

  it('allows provider setup when paid', () => {
    mockMode('pro_xai');
    mockPaid(true);

    const { result } = renderHook(() => useConfigureAiProvidersGate(true));

    expect(result.current.allowed).toBe(true);
  });
});
