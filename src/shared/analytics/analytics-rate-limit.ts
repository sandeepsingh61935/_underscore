/**
 * Fixed-window per-identity rate limiter for the anonymous analytics endpoint.
 * Pure helper (testable); the Pages Function holds the map per isolate —
 * same documented per-isolate limitation as the LLM proxy pre-check.
 */

export const ANALYTICS_MAX_PER_MINUTE = 60;
export const ANALYTICS_WINDOW_MS = 60_000;
const MAX_TRACKED_KEYS = 10_000;

export interface AnalyticsBucket {
  windowStart: number;
  count: number;
}

export function analyticsIdentity(req: Request): string {
  const cf = req.headers.get('cf-connecting-ip')?.trim();
  if (cf) return `ip:${cf}`;
  const xff = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim();
  if (xff) return `ip:${xff}`;
  return 'ip:unknown';
}

export function tryConsumeAnalytics(
  buckets: Map<string, AnalyticsBucket>,
  key: string,
  nowMs: number = Date.now(),
  max: number = ANALYTICS_MAX_PER_MINUTE
): boolean {
  const cur = buckets.get(key);
  if (!cur || nowMs - cur.windowStart >= ANALYTICS_WINDOW_MS) {
    if (buckets.size >= MAX_TRACKED_KEYS && !cur) {
      // Bound memory: evict the oldest entry before inserting.
      let oldestKey: string | null = null;
      let oldestStart = Infinity;
      for (const [k, b] of buckets) {
        if (b.windowStart < oldestStart) {
          oldestStart = b.windowStart;
          oldestKey = k;
        }
      }
      if (oldestKey) buckets.delete(oldestKey);
    }
    buckets.set(key, { windowStart: nowMs, count: 1 });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}
