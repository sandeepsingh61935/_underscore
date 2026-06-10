import { useEffect, useState } from 'react';

import { prefersReducedMotion } from '@/shared/utils/prefersReducedMotion';

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export function useProgress(durationMs: number = 1800): number {
  const [progress, setProgress] = useState<number>(0);

  useEffect(() => {
    if (prefersReducedMotion()) {
      setProgress(1);
      return;
    }

    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const elapsed = now - start;
      const t = Math.min(1, elapsed / durationMs);
      setProgress(easeOutCubic(t));
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };

    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
    };
  }, [durationMs]);

  return progress;
}
