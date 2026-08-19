/**
 * @file analytics.ts
 * @description Minimal product analytics for the web app (non-PII props only).
 * No network backend in v1 — emits on the shared event bus for future sinks.
 */

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
}
