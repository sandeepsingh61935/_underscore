import { describe, expect, it, vi, beforeEach } from 'vitest';
import { renderHook } from '@testing-library/react';

import { useModeFeature } from '@/ui-system/hooks/useModeFeature';
import { usePersistedMode } from '@/ui-system/hooks/usePersistedMode';
import { useVaultLocked } from '@/features/collections/hooks/use-vault-locked';

vi.mock('@/ui-system/hooks/usePersistedMode', () => ({
  usePersistedMode: vi.fn(),
}));

vi.mock('@/features/collections/hooks/use-vault-locked', () => ({
  useVaultLocked: vi.fn(() => false),
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
    vi.mocked(useVaultLocked).mockReturnValue(false);
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

  it('denies export when vault is locked', () => {
    mockMode('pro');
    vi.mocked(useVaultLocked).mockReturnValue(true);

    const { result } = renderHook(() => useModeFeature('export', true));

    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('VAULT_LOCKED');
  });

  it('denies AI in pro mode when signed in', () => {
    mockMode('pro');

    const { result } = renderHook(() => useModeFeature('ai', true));

    expect(result.current.allowed).toBe(false);
    expect(result.current.reason).toBe('CAPABILITY_DENIED');
  });

  it('allows export in pro mode when signed in and vault unlocked', () => {
    mockMode('pro');

    const { result } = renderHook(() => useModeFeature('export', true));

    expect(result.current.allowed).toBe(true);
  });

  it('allows AI in pro_xai when signed in and vault unlocked', () => {
    mockMode('pro_xai');

    const { result } = renderHook(() => useModeFeature('ai', true));

    expect(result.current.allowed).toBe(true);
  });
});
