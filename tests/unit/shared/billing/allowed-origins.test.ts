import { describe, expect, it } from 'vitest';
import {
  defaultBillingSuccessUrl,
  isAllowedBillingCorsOrigin,
  isAllowedBillingRedirectUrl,
  parseBillingAllowedOrigins,
  resolveBillingRedirectUrl,
} from '@/shared/billing/allowed-origins';

describe('parseBillingAllowedOrigins', () => {
  it('parses comma-separated origins and trims', () => {
    expect(
      parseBillingAllowedOrigins(
        'https://underscore-web.pages.dev, https://app.example.com ,http://localhost:3000'
      )
    ).toEqual([
      'https://underscore-web.pages.dev',
      'https://app.example.com',
      'http://localhost:3000',
    ]);
  });

  it('returns empty for blank input', () => {
    expect(parseBillingAllowedOrigins('')).toEqual([]);
    expect(parseBillingAllowedOrigins('   ')).toEqual([]);
    expect(parseBillingAllowedOrigins(undefined)).toEqual([]);
  });
});

describe('isAllowedBillingRedirectUrl', () => {
  const allowed = [
    'https://underscore-web.pages.dev',
    'https://app.example.com',
    'http://localhost:3000',
  ];

  it('accepts allowlisted https origin with path and query', () => {
    expect(
      isAllowedBillingRedirectUrl(
        'https://underscore-web.pages.dev/settings?billing=success',
        allowed
      )
    ).toBe(true);
  });

  it('rejects unknown host', () => {
    expect(isAllowedBillingRedirectUrl('https://evil.example/', allowed)).toBe(
      false
    );
  });

  it('rejects lookalike subdomain of allowed host', () => {
    expect(
      isAllowedBillingRedirectUrl(
        'https://underscore-web.pages.dev.evil.com/',
        allowed
      )
    ).toBe(false);
  });

  it('accepts localhost only when listed', () => {
    expect(
      isAllowedBillingRedirectUrl('http://localhost:3000/settings', allowed)
    ).toBe(true);
    expect(
      isAllowedBillingRedirectUrl('http://localhost:3000/settings', [
        'https://app.example.com',
      ])
    ).toBe(false);
  });

  it('rejects non-http(s) schemes', () => {
    expect(isAllowedBillingRedirectUrl('javascript:alert(1)', allowed)).toBe(
      false
    );
    expect(isAllowedBillingRedirectUrl('data:text/html,hi', allowed)).toBe(
      false
    );
  });

  it('rejects credentials in URL', () => {
    expect(
      isAllowedBillingRedirectUrl(
        'https://user:pass@underscore-web.pages.dev/settings',
        allowed
      )
    ).toBe(false);
  });

  it('rejects empty allowlist', () => {
    expect(
      isAllowedBillingRedirectUrl(
        'https://underscore-web.pages.dev/settings',
        []
      )
    ).toBe(false);
  });

  it('rejects invalid URL strings', () => {
    expect(isAllowedBillingRedirectUrl('not a url', allowed)).toBe(false);
    expect(isAllowedBillingRedirectUrl('//evil.example/path', allowed)).toBe(
      false
    );
  });
});

describe('resolveBillingRedirectUrl', () => {
  const allowed = ['https://app.example.com', 'http://localhost:3000'];

  it('uses default when input missing', () => {
    const r = resolveBillingRedirectUrl(undefined, allowed, 'success');
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.url).toBe(
        'https://app.example.com/settings?billing=success'
      );
    }
  });

  it('accepts valid provided url', () => {
    const r = resolveBillingRedirectUrl(
      'https://app.example.com/settings?billing=cancel',
      allowed,
      'success'
    );
    expect(r).toEqual({
      ok: true,
      url: 'https://app.example.com/settings?billing=cancel',
    });
  });

  it('rejects invalid provided url', () => {
    const r = resolveBillingRedirectUrl(
      'https://evil.example/',
      allowed,
      'success'
    );
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/Invalid/);
  });

  it('fails closed when allowlist empty', () => {
    const r = resolveBillingRedirectUrl(undefined, [], 'success');
    expect(r.ok).toBe(false);
  });
});

describe('defaultBillingSuccessUrl', () => {
  it('builds path under first origin', () => {
    expect(
      defaultBillingSuccessUrl(['https://app.example.com'], 'success')
    ).toBe('https://app.example.com/settings?billing=success');
  });
});

describe('isAllowedBillingCorsOrigin (WP-2)', () => {
  const allowed = ['https://app.example.com', 'http://localhost:3000'];

  it('accepts exact allowlisted Origin', () => {
    expect(isAllowedBillingCorsOrigin('https://app.example.com', allowed)).toBe(
      true
    );
  });

  it('rejects unlisted Origin', () => {
    expect(isAllowedBillingCorsOrigin('https://evil.example', allowed)).toBe(
      false
    );
  });

  it('rejects null or empty allowlist for web origins', () => {
    expect(isAllowedBillingCorsOrigin(null, allowed)).toBe(false);
    expect(isAllowedBillingCorsOrigin('https://app.example.com', [])).toBe(
      false
    );
  });

  it('accepts pinned chrome-extension origin', () => {
    expect(
      isAllowedBillingCorsOrigin(
        'chrome-extension://hecejpjekcgpifnemddfmkjmphmgljlm',
        allowed
      )
    ).toBe(true);
  });

  it('rejects unknown chrome-extension id', () => {
    expect(
      isAllowedBillingCorsOrigin('chrome-extension://aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', allowed)
    ).toBe(false);
  });
});
