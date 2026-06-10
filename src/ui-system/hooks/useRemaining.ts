import { useEffect, useRef } from 'react';

import { useTicker } from './useTicker';

export function useRemaining(deadline: number, onExpire: () => void): number {
  const now = useTicker(1000);
  const firedRef = useRef(false);

  useEffect(() => {
    if (now >= deadline && !firedRef.current) {
      firedRef.current = true;
      onExpire();
    }
  }, [now, deadline, onExpire]);

  return Math.max(0, deadline - now);
}
