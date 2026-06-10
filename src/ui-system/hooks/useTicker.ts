import { useEffect, useState } from 'react';

import { prefersReducedMotion } from '@/shared/utils/prefersReducedMotion';

export function useTicker(intervalMs: number = 1000): number {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    if (prefersReducedMotion()) return;

    const tick = () => {
      if (!document.hidden) {
        setNow(Date.now());
      }
    };

    const id = setInterval(tick, intervalMs);
    document.addEventListener('visibilitychange', tick);
    return () => {
      clearInterval(id);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [intervalMs]);

  return now;
}
