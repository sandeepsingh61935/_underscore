import { useCallback, useEffect, useState } from 'react';

const DEFAULT_COOLDOWN_MS = 60_000;

export interface UseResendCooldownResult {
  /** Milliseconds remaining until another resend is allowed. 0 = ready. */
  remainingMs: number;
  /** True while remainingMs > 0. */
  isLocked: boolean;
  /** mm:ss display string, e.g. "0:45". */
  formatted: string;
  /** Start (or restart) the cooldown. Defaults to 60s if no duration given. */
  start: (durationMs?: number) => void;
}

function formatMmSs(ms: number): string {
  const totalSeconds = Math.ceil(ms / 1000);
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

/**
 * Client-side resend cooldown shared by every OTP resend button (web +
 * extension, signup verification + password reset).
 *
 * Locks the button for `defaultDurationMs` after every successful resend,
 * and for `retryAfterMs` (or the default) after a rate-limited resend —
 * so the UI stops firing requests it already knows the server will reject,
 * instead of relying on the user to notice a repeated error.
 */
export function useResendCooldown(
  defaultDurationMs = DEFAULT_COOLDOWN_MS
): UseResendCooldownResult {
  const [unlockAt, setUnlockAt] = useState<number | null>(null);
  const [remainingMs, setRemainingMs] = useState(0);

  useEffect(() => {
    if (!unlockAt) {
      setRemainingMs(0);
      return;
    }

    const tick = (): void => {
      const remaining = Math.max(0, unlockAt - Date.now());
      setRemainingMs(remaining);
      if (remaining === 0) {
        setUnlockAt(null);
      }
    };

    tick();
    const intervalId = setInterval(tick, 250);
    return () => clearInterval(intervalId);
  }, [unlockAt]);

  const start = useCallback(
    (durationMs: number = defaultDurationMs): void => {
      setUnlockAt(Date.now() + durationMs);
    },
    [defaultDurationMs]
  );

  return {
    remainingMs,
    isLocked: remainingMs > 0,
    formatted: formatMmSs(remainingMs),
    start,
  };
}
