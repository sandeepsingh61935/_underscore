import { useEffect, useState } from 'react';

/** Matches web-app.css tabbar breakpoint (`max-width: 820px`). */
export const WEB_MOBILE_MQ = '(max-width: 820px)';

export function useMobileWebViewport(): boolean {
  const [mobile, setMobile] = useState(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return false;
    }
    return window.matchMedia(WEB_MOBILE_MQ).matches;
  });

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const mq = window.matchMedia(WEB_MOBILE_MQ);
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return mobile;
}
