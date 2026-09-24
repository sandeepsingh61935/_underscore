import { useEffect, useState } from 'react';

import {
  classifyWebClient,
  type WebClientKind,
} from '@/web/lib/classify-web-client';

function readKind(): WebClientKind {
  if (typeof navigator === 'undefined' || typeof window === 'undefined') {
    return 'desktop';
  }
  const coarse =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;
  return classifyWebClient({
    userAgent: navigator.userAgent,
    maxTouchPoints: navigator.maxTouchPoints ?? 0,
    pointerCoarse: coarse,
    viewportWidth: window.innerWidth,
  });
}

export function useWebClientKind(): WebClientKind {
  const [kind, setKind] = useState<WebClientKind>(readKind);
  useEffect(() => {
    const update = () => setKind(readKind());
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return kind;
}
