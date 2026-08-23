import { describe, expect, it } from 'vitest';

import { toAuthStatePayload } from '@/shared/auth/auth-state-payload';
import { isAllowedExternalAuthOrigin } from '@/shared/auth/external-origin';
import { SessionBridgePayloadSchema } from '@/shared/schemas/auth-schemas';

describe('auth-state-payload', () => {
  it('serializes verification fields and lastAuthTime', () => {
    const payload = toAuthStatePayload({
      isAuthenticated: true,
      user: {
        id: 'user-1',
        email: 'user@example.com',
        displayName: 'User',
      },
      provider: 'google',
      lastAuthTime: new Date('2026-01-01T00:00:00.000Z'),
      verificationStatus: 'awaiting',
      verificationExpiresAt: 1234,
    });

    expect(payload.lastAuthTime).toBe('2026-01-01T00:00:00.000Z');
    expect(payload.verificationStatus).toBe('awaiting');
    expect(payload.verificationExpiresAt).toBe(1234);
  });
});

describe('external-origin', () => {
  it('allows localhost, pages.dev, and vercel app origins', () => {
    expect(isAllowedExternalAuthOrigin('http://localhost:5173/sign-in')).toBe(true);
    expect(isAllowedExternalAuthOrigin('http://127.0.0.1:3000/install')).toBe(true);
    expect(isAllowedExternalAuthOrigin('https://underscore.pages.dev/')).toBe(true);
    expect(isAllowedExternalAuthOrigin('https://underscore-web.vercel.app/install')).toBe(true);
    expect(isAllowedExternalAuthOrigin('https://evil.example.com/')).toBe(false);
  });
});

describe('auth-schemas', () => {
  it('validates session bridge payload', () => {
    const parsed = SessionBridgePayloadSchema.safeParse({
      access_token: 'access',
      refresh_token: 'refresh',
    });
    expect(parsed.success).toBe(true);
  });
});
