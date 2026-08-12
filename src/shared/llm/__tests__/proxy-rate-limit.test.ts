import { describe, expect, it } from 'vitest';

import {
  checkAndRecordStreamStart,
  emptyRateLimitState,
  releaseStream,
} from '@/shared/llm/runtime/proxy-rate-limit';

describe('proxy rate limit (ADR-027)', () => {
  it('allows first stream and tracks concurrent', () => {
    const { decision, next } = checkAndRecordStreamStart(emptyRateLimitState(), 1_000, {
      perHour: 30,
      perMinute: 5,
      maxConcurrent: 1,
    });
    expect(decision).toEqual({ ok: true });
    expect(next.concurrent).toBe(1);
  });

  it('blocks second concurrent stream', () => {
    let state = emptyRateLimitState();
    const a = checkAndRecordStreamStart(state, 1_000, { maxConcurrent: 1 });
    state = a.next;
    const b = checkAndRecordStreamStart(state, 1_001, { maxConcurrent: 1 });
    expect(b.decision).toEqual({ ok: false, reason: 'concurrent' });
  });

  it('release allows another stream', () => {
    let state = emptyRateLimitState();
    state = checkAndRecordStreamStart(state, 1_000, { maxConcurrent: 1 }).next;
    state = releaseStream(state);
    const again = checkAndRecordStreamStart(state, 1_002, { maxConcurrent: 1 });
    expect(again.decision).toEqual({ ok: true });
  });

  it('enforces per-minute burst', () => {
    let state = emptyRateLimitState();
    const now = 10_000;
    for (let i = 0; i < 5; i++) {
      const r = checkAndRecordStreamStart(state, now + i, {
        perMinute: 5,
        perHour: 100,
        maxConcurrent: 10,
      });
      expect(r.decision.ok).toBe(true);
      state = releaseStream(r.next);
    }
    const blocked = checkAndRecordStreamStart(state, now + 10, {
      perMinute: 5,
      perHour: 100,
      maxConcurrent: 10,
    });
    expect(blocked.decision).toEqual({ ok: false, reason: 'rate_minute' });
  });
});
