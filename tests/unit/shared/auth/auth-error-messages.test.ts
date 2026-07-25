import { describe, it, expect } from 'vitest';

import {
    mapAuthError,
    isRateLimitCode,
    isExistingAccountSignup,
    INTERNAL_RATE_LIMIT_CODE,
    EXISTING_ACCOUNT_CODE,
} from '@/shared/auth/auth-error-messages';

describe('mapAuthError', () => {
    it('always returns the same fixed message for sign-in, ignoring the underlying code (anti-enumeration)', () => {
        expect(mapAuthError('sign-in', { code: 'invalid_credentials' })).toBe('Email or password is incorrect.');
        expect(mapAuthError('sign-in', { code: 'user_not_found' })).toBe('Email or password is incorrect.');
        expect(mapAuthError('sign-in', { code: 'email_not_confirmed' })).toBe('Email or password is incorrect.');
        expect(mapAuthError('sign-in', null)).toBe('Email or password is incorrect.');
    });

    it('maps otp_expired to one honest message for verify contexts', () => {
        expect(mapAuthError('verify-email-otp', { code: 'otp_expired' })).toBe(
            'That code is incorrect or has expired. Try again or resend a new code.'
        );
        expect(mapAuthError('verify-recovery-otp', { code: 'otp_expired' })).toBe(
            'That code is incorrect or has expired. Try again or resend a new code.'
        );
    });

    it('falls back to message-pattern matching when a Supabase error has no code (older GoTrue)', () => {
        expect(mapAuthError('verify-email-otp', { message: 'Token has expired or is invalid' })).toBe(
            'That code is incorrect or has expired. Try again or resend a new code.'
        );
    });

    it('maps user_already_exists to a sign-in nudge for sign-up', () => {
        expect(mapAuthError('sign-up', { code: 'user_already_exists' })).toBe(
            'An account with this email already exists. Sign in instead.'
        );
    });

    it('maps weak_password to a min-length message', () => {
        expect(mapAuthError('sign-up', { code: 'weak_password' })).toBe('Password must be at least 8 characters.');
        expect(mapAuthError('update-password', { code: 'weak_password' })).toBe('Password must be at least 8 characters.');
    });

    it('maps rate limits (internal or Supabase) with a generic message when retryAfterMs is unknown', () => {
        expect(mapAuthError('resend-email-otp', { code: INTERNAL_RATE_LIMIT_CODE })).toBe(
            'Too many attempts. Please wait a moment and try again.'
        );
        expect(mapAuthError('resend-email-otp', { code: 'over_email_send_rate_limit' })).toBe(
            'Too many attempts. Please wait a moment and try again.'
        );
    });

    it('includes a mm:ss countdown when retryAfterMs is provided', () => {
        const message = mapAuthError('resend-email-otp', { code: INTERNAL_RATE_LIMIT_CODE }, { retryAfterMs: 45_000 });
        expect(message).toBe('Too many attempts. Try again in 0:45.');
    });

    it('formats retryAfterMs over a minute as m:ss', () => {
        const message = mapAuthError('resend-email-otp', { code: INTERNAL_RATE_LIMIT_CODE }, { retryAfterMs: 75_000 });
        expect(message).toBe('Too many attempts. Try again in 1:15.');
    });

    it('falls back to a sensible default for unrecognized codes per context', () => {
        expect(mapAuthError('sign-up', { code: 'something_unexpected' })).toBe(
            'Something went wrong creating your account. Please try again.'
        );
        expect(mapAuthError('update-password', null)).toBe('Failed to update password. Please try again.');
    });

    it('accepts a plain string error', () => {
        expect(mapAuthError('request-password-reset', 'Network error')).toBe(
            'Unable to send a reset code right now. Please try again.'
        );
    });

    it('never distinguishes oauth failures from sign-in copy', () => {
        expect(mapAuthError('oauth', { message: 'Missing authentication tokens in OAuth redirect' })).toBe(
            'Google sign-in failed. Please try again.'
        );
    });
});

describe('isRateLimitCode', () => {
    it('recognizes the internal RATE_LIMIT code and Supabase rate-limit codes', () => {
        expect(isRateLimitCode(INTERNAL_RATE_LIMIT_CODE)).toBe(true);
        expect(isRateLimitCode('over_email_send_rate_limit')).toBe(true);
        expect(isRateLimitCode('over_request_rate_limit')).toBe(true);
    });

    it('returns false for non-rate-limit codes and empty input', () => {
        expect(isRateLimitCode('invalid_credentials')).toBe(false);
        expect(isRateLimitCode(undefined)).toBe(false);
        expect(isRateLimitCode(null)).toBe(false);
    });
});

describe('isExistingAccountSignup', () => {
    it('is true when identities is empty and there is no session (Supabase anti-enumeration signup response)', () => {
        expect(isExistingAccountSignup({ identities: [] }, null)).toBe(true);
    });

    it('is false for a normal new signup with populated identities', () => {
        expect(isExistingAccountSignup({ identities: [{ id: 'x' }] as unknown[] }, null)).toBe(false);
    });

    it('is false when a session is present (e.g. auto-confirm enabled)', () => {
        expect(isExistingAccountSignup({ identities: [] }, { access_token: 't' })).toBe(false);
    });

    it('is false when identities is missing entirely', () => {
        expect(isExistingAccountSignup({}, null)).toBe(false);
        expect(isExistingAccountSignup(null, null)).toBe(false);
    });
});

it('exports a distinct code for existing-account signup', () => {
    expect(EXISTING_ACCOUNT_CODE).toBe('EXISTING_ACCOUNT');
});
