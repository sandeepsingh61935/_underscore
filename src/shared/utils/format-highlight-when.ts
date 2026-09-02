/** Epoch ms. Values in seconds (10-digit unix) are promoted. */
export function coerceTimestampMs(ts: number): number {
  if (!Number.isFinite(ts) || ts <= 0) return 0;
  return ts > 0 && ts < 1e12 ? ts * 1000 : ts;
}

/**
 * Relative time under 24h; calendar date after that.
 */
export function formatHighlightWhen(ts: number, now = Date.now()): string {
  const ms = coerceTimestampMs(ts);
  if (ms <= 0) return '';
  const d = now - ms;
  if (d < 45e3) return 'just now';
  if (d < 3600e3) return `${Math.max(1, Math.round(d / 60e3))}m ago`;
  if (d < 86400e3) return `${Math.max(1, Math.round(d / 3600e3))}h ago`;

  const then = new Date(ms);
  const thisYear = new Date(now).getFullYear();
  return then.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    ...(then.getFullYear() !== thisYear ? { year: 'numeric' as const } : {}),
  });
}
