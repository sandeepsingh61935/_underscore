/**
 * @file result.test.ts
 * @description Unit tests for Result type and ErrorBoundary
 */

import { describe, it, expect } from 'vitest';

import { AppError, SystemError, ModeError } from '@/shared/errors/app-error';
import { ok, err, unwrap, safe, ErrorBoundary } from '@/shared/utils/result';

describe('Result & ErrorBoundary (6 tests)', () => {
  // ============================================
  // Result Type Tests
  // ============================================

  it('1. ok() creates success result', () => {
    const res = ok(42);
    expect(res.ok).toBe(true);
    if (res.ok) {
      expect(res.value).toBe(42);
    }
  });

  it('2. err() creates failure result', () => {
    const error = new AppError('Fail');
    const res = err(error);

    expect(res.ok).toBe(false);
    if (!res.ok) {
      expect(res.error).toBe(error);
    }
  });

  it('3. unwrap() returns value or throws', () => {
    expect(unwrap(ok('success'))).toBe('success');

    const error = new AppError('Throw me');
    expect(() => unwrap(err(error))).toThrow(error);
  });

  // ============================================
  // ErrorBoundary Tests
  // ============================================

  it('4. safe() catches promise rejection and wraps in Result', async () => {
    const success = await safe(Promise.resolve(10));
    expect(success).toEqual({ ok: true, value: 10 });

    const failure = await safe(Promise.reject(new Error('Async fail')));
    expect(failure.ok).toBe(false);
    if (!failure.ok) {
      expect(failure.error).toBeInstanceOf(SystemError);
      expect(failure.error.message).toBe('Async fail');
    }
  });

  it('5. ErrorBoundary converts unknown errors to SystemError', () => {
    const e1 = ErrorBoundary.toAppError(new Error('Native error'));
    expect(e1).toBeInstanceOf(SystemError);
    expect(e1.message).toBe('Native error');

    const e2 = ErrorBoundary.toAppError('String error');
    expect(e2).toBeInstanceOf(SystemError);
    expect(e2.message).toBe('String error');
  });

  it('6. ErrorBoundary preserves existing AppErrors', () => {
    const original = new ModeError('Already typed');
    const converted = ErrorBoundary.toAppError(original);

    expect(converted).toBe(original); // Should return same instance
    expect(converted).toBeInstanceOf(ModeError);
  });
});
