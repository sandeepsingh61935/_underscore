/**
 * @file analytics.ts
 * @description Product analytics. Allowlisted consume events beacon to
 * POST /api/analytics. Unknown names stay on the in-process event bus only.
 * Never pass highlight text or other PII.
 */

import { parseAnalyticsEvent } from '@/shared/analytics/parse-analytics-event';
import { eventBus } from '@/shared/utils/event-bus';

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

/**
 * Fire a named product event. Never pass highlight text or other PII.
 */
export function trackEvent(name: string, props: AnalyticsProps = {}): void {
  const payload = {
    name,
    props,
    timestamp: Date.now(),
  };
  try {
    eventBus.emit('analytics:event', payload);
  } catch {
    // Analytics must never break UX.
  }
  const parsed = parseAnalyticsEvent({ name, props });
  if (!parsed.ok) return;
  try {
    const origin =
      typeof window !== 'undefined' &&
      typeof window.location?.origin === 'string' &&
      /^https?:\/\//.test(window.location.origin)
        ? window.location.origin
        : '';
    if (!origin) return;
    const url = `${origin}/api/analytics`;
    const body = JSON.stringify({ name: parsed.name, props: parsed.props });
    // String payload → text/plain. JSON Blobs are rewritten by Chromium and
    // then fail request.json() on the Pages Function.
    if (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function') {
      navigator.sendBeacon(url, body);
      return;
    }
    if (typeof fetch === 'function') {
      void fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'text/plain' },
        body,
        keepalive: true,
      }).catch(() => undefined);
    }
  } catch {
    // ignore
  }
}
