/**
 * @file format-remaining-ttl.ts
 * @description Human-readable remaining TTL for dashboard and badges.
 *
 * - Under 24 hours: clock format (HH:MM:SS)
 * - 24 hours and above: days, months, or years
 */

export const ONE_MINUTE_MS = 60_000;
export const ONE_HOUR_MS = 60 * ONE_MINUTE_MS;
export const ONE_DAY_MS = 24 * ONE_HOUR_MS;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;

/** True when the UI should show a live clock (HH:MM:SS) instead of calendar units. */
export function usesClockTtlFormat(remainingMs: number): boolean {
  return remainingMs > 0 && remainingMs < ONE_DAY_MS;
}

function pluralize(count: number, singular: string, plural?: string): string {
  return count === 1 ? singular : (plural ?? `${singular}s`);
}

/**
 * Format remaining milliseconds for display.
 * Clock (HH:MM:SS) when under one day; otherwise days / months / years.
 */
export function formatRemainingTtl(remainingMs: number): string {
  if (remainingMs <= 0) return 'Expired';

  if (usesClockTtlFormat(remainingMs)) {
    const h = Math.floor(remainingMs / ONE_HOUR_MS);
    const m = Math.floor((remainingMs % ONE_HOUR_MS) / ONE_MINUTE_MS);
    const s = Math.floor((remainingMs % ONE_MINUTE_MS) / 1000);
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  }

  const totalDays = Math.floor(remainingMs / ONE_DAY_MS);

  if (totalDays >= DAYS_PER_YEAR) {
    const years = Math.floor(totalDays / DAYS_PER_YEAR);
    const remDays = totalDays % DAYS_PER_YEAR;
    const months = Math.floor(remDays / DAYS_PER_MONTH);
    if (months > 0) {
      return `${years} ${pluralize(years, 'year')} ${months} ${pluralize(months, 'month')}`;
    }
    return `${years} ${pluralize(years, 'year')}`;
  }

  if (totalDays >= DAYS_PER_MONTH) {
    const months = Math.floor(totalDays / DAYS_PER_MONTH);
    const remDays = totalDays % DAYS_PER_MONTH;
    if (remDays > 0) {
      return `${months} ${pluralize(months, 'month')} ${remDays}d`;
    }
    return `${months} ${pluralize(months, 'month')}`;
  }

  return `${totalDays} ${pluralize(totalDays, 'day')}`;
}

/** Compact label for inline TTL badges (cards). */
export function formatRemainingTtlCompact(remainingMs: number): string {
  if (remainingMs <= 0) return '0m';

  if (usesClockTtlFormat(remainingMs)) {
    const h = Math.floor(remainingMs / ONE_HOUR_MS);
    const m = Math.floor((remainingMs % ONE_HOUR_MS) / ONE_MINUTE_MS);
    return h >= 1 ? `${h}h ${m}m` : `${m}m`;
  }

  const totalDays = Math.floor(remainingMs / ONE_DAY_MS);
  if (totalDays >= DAYS_PER_YEAR) {
    const years = Math.floor(totalDays / DAYS_PER_YEAR);
    return `${years}y`;
  }
  if (totalDays >= DAYS_PER_MONTH) {
    const months = Math.floor(totalDays / DAYS_PER_MONTH);
    return `${months}mo`;
  }
  return `${totalDays}d`;
}
