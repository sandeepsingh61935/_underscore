import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';

import { useResendCooldown } from '@/features/auth/hooks/useResendCooldown';

describe('useResendCooldown', () => {
    beforeEach(() => {
        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('starts unlocked', () => {
        const { result } = renderHook(() => useResendCooldown());
        expect(result.current.isLocked).toBe(false);
        expect(result.current.remainingMs).toBe(0);
    });

    it('locks for the default 60s after start()', () => {
        const { result } = renderHook(() => useResendCooldown());

        act(() => {
            result.current.start();
        });

        expect(result.current.isLocked).toBe(true);
        expect(result.current.formatted).toBe('1:00');
    });

    it('unlocks automatically once the duration elapses', () => {
        const { result } = renderHook(() => useResendCooldown());

        act(() => {
            result.current.start(5_000);
        });
        expect(result.current.isLocked).toBe(true);

        act(() => {
            vi.advanceTimersByTime(5_100);
        });

        expect(result.current.isLocked).toBe(false);
        expect(result.current.remainingMs).toBe(0);
    });

    it('honors a server-provided retryAfterMs instead of the default', () => {
        const { result } = renderHook(() => useResendCooldown());

        act(() => {
            result.current.start(90_000);
        });

        expect(result.current.formatted).toBe('1:30');
    });

    it('counts down over time', () => {
        const { result } = renderHook(() => useResendCooldown());

        act(() => {
            result.current.start(10_000);
        });
        expect(result.current.remainingMs).toBeGreaterThan(9_000);

        act(() => {
            vi.advanceTimersByTime(4_000);
        });

        expect(result.current.remainingMs).toBeLessThanOrEqual(6_100);
        expect(result.current.remainingMs).toBeGreaterThan(0);
        expect(result.current.isLocked).toBe(true);
    });
});
