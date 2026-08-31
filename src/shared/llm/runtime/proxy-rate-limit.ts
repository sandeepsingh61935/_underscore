/**
 * In-memory rate + concurrency limiter for LLM proxy (per isolate).
 * Pure helpers for tests; edge holds singleton maps.
 */

import {
  LLM_PROXY_MAX_CONCURRENT,
  LLM_PROXY_RATE_LIMIT_PER_HOUR,
  LLM_PROXY_RATE_LIMIT_PER_MINUTE,
} from './proxy-policy';

export interface RateLimitState {
  /** unix ms timestamps of stream starts */
  starts: number[];
  concurrent: number;
}

export type RateLimitDecision =
  { ok: true } | { ok: false; reason: 'rate_hour' | 'rate_minute' | 'concurrent' };

export function emptyRateLimitState(): RateLimitState {
  return { starts: [], concurrent: 0 };
}

export function checkAndRecordStreamStart(
  state: RateLimitState,
  nowMs: number = Date.now(),
  opts?: {
    perHour?: number;
    perMinute?: number;
    maxConcurrent?: number;
  }
): { decision: RateLimitDecision; next: RateLimitState } {
  const perHour = opts?.perHour ?? LLM_PROXY_RATE_LIMIT_PER_HOUR;
  const perMinute = opts?.perMinute ?? LLM_PROXY_RATE_LIMIT_PER_MINUTE;
  const maxConcurrent = opts?.maxConcurrent ?? LLM_PROXY_MAX_CONCURRENT;

  if (state.concurrent >= maxConcurrent) {
    return { decision: { ok: false, reason: 'concurrent' }, next: state };
  }

  const hourAgo = nowMs - 3_600_000;
  const minuteAgo = nowMs - 60_000;
  const starts = state.starts.filter((t) => t > hourAgo);
  const lastMinute = starts.filter((t) => t > minuteAgo);

  if (starts.length >= perHour) {
    return { decision: { ok: false, reason: 'rate_hour' }, next: { ...state, starts } };
  }
  if (lastMinute.length >= perMinute) {
    return { decision: { ok: false, reason: 'rate_minute' }, next: { ...state, starts } };
  }

  return {
    decision: { ok: true },
    next: {
      starts: [...starts, nowMs],
      concurrent: state.concurrent + 1,
    },
  };
}

export function releaseStream(state: RateLimitState): RateLimitState {
  return {
    ...state,
    concurrent: Math.max(0, state.concurrent - 1),
  };
}
