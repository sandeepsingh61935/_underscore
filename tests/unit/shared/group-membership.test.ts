import { describe, expect, it } from 'vitest';

import {
  matchesDomainRule,
  membershipsForUrl,
  resolveGroupPages,
  type KnownGroupPage,
} from '@/shared/utils/group-membership';
import type { PageGroup, PageGroupItem } from '@/shared/types/page-group';

const GROUP_A: PageGroup = {
  id: 'g-a',
  name: 'Research',
  color: 'blue',
  position: 'V',
  boundDeviceId: null,
  boundDeviceLabel: null,
  boundBrowser: null,
  boundAt: null,
  createdAt: '2026-09-28T09:00:00.000Z',
  updatedAt: '2026-09-28T09:00:00.000Z',
  deletedAt: null,
};

const GROUP_B: PageGroup = {
  ...GROUP_A,
  id: 'g-b',
  name: 'Reading',
  position: 'k',
};

function pageItem(overrides: Partial<Extract<PageGroupItem, { kind: 'page' }>> = {}): PageGroupItem {
  return {
    kind: 'page',
    id: 'item-page-1',
    groupId: 'g-a',
    position: 'V',
    urlNormalized: 'https://example.com/article',
    title: 'Article',
    faviconUrl: null,
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-28T09:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

function domainItem(
  overrides: Partial<Extract<PageGroupItem, { kind: 'domain' }>> = {},
): PageGroupItem {
  return {
    kind: 'domain',
    id: 'item-domain-1',
    groupId: 'g-a',
    position: 'V',
    hostname: 'github.com',
    includeSubdomains: false,
    createdAt: '2026-09-28T09:00:00.000Z',
    updatedAt: '2026-09-28T09:00:00.000Z',
    deletedAt: null,
    ...overrides,
  };
}

describe('matchesDomainRule', () => {
  it('matches the exact hostname by default', () => {
    expect(
      matchesDomainRule('https://github.com/', {
        hostname: 'github.com',
        includeSubdomains: false,
      }),
    ).toBe(true);
    expect(
      matchesDomainRule('https://docs.github.com/x', {
        hostname: 'github.com',
        includeSubdomains: false,
      }),
    ).toBe(false);
  });

  it('matches subdomains only with includeSubdomains via hostname suffix', () => {
    const rule = { hostname: 'github.com', includeSubdomains: true };
    expect(matchesDomainRule('https://docs.github.com/x', rule)).toBe(true);
    expect(matchesDomainRule('https://github.com/x', rule)).toBe(true);
    expect(matchesDomainRule('https://notgithub.com/x', rule)).toBe(false);
  });

  it('never matches file: urls', () => {
    expect(
      matchesDomainRule('file:///home/user/github.com.html', {
        hostname: 'github.com',
        includeSubdomains: true,
      }),
    ).toBe(false);
  });

  it('rejects unparseable urls', () => {
    expect(
      matchesDomainRule('not a url', { hostname: 'github.com', includeSubdomains: true }),
    ).toBe(false);
  });
});

describe('resolveGroupPages', () => {
  const known: KnownGroupPage[] = [
    { urlNormalized: 'https://github.com/underscore', title: 'Repo', faviconUrl: null },
    { urlNormalized: 'https://docs.github.com/en', title: 'Docs', faviconUrl: null },
    { urlNormalized: 'https://example.com/other', title: 'Other', faviconUrl: null },
  ];

  it('returns explicit pages with source explicit', () => {
    const pages = resolveGroupPages([pageItem()], known);
    expect(pages).toHaveLength(1);
    expect(pages[0]).toMatchObject({
      urlNormalized: 'https://example.com/article',
      source: 'explicit',
    });
  });

  it('expands domain rules to known pages with via:<hostname> source', () => {
    const pages = resolveGroupPages(
      [domainItem({ includeSubdomains: true })],
      known,
    );
    expect(pages.map((p) => p.urlNormalized).sort()).toEqual([
      'https://docs.github.com/en',
      'https://github.com/underscore',
    ]);
    expect(pages.every((p) => p.source === 'via:github.com')).toBe(true);
  });

  it('dedupes pages covered by both an explicit item and a domain rule', () => {
    const items = [
      pageItem({ id: 'e1', urlNormalized: 'https://github.com/underscore' }),
      domainItem({ id: 'd1', includeSubdomains: true }),
    ];
    const pages = resolveGroupPages(items, known);
    const match = pages.filter((p) => p.urlNormalized === 'https://github.com/underscore');
    expect(match).toHaveLength(1);
    expect(match[0]!.source).toBe('explicit');
  });

  it('skips tombstoned items', () => {
    const pages = resolveGroupPages(
      [pageItem({ deletedAt: '2026-09-28T10:00:00.000Z' })],
      known,
    );
    expect(pages).toHaveLength(0);
  });
});

describe('membershipsForUrl', () => {
  it('reports explicit membership with a null viaHostname', () => {
    const memberships = membershipsForUrl('https://example.com/article', [GROUP_A], [
      pageItem(),
    ]);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.group.id).toBe('g-a');
    expect(memberships[0]!.viaHostname).toBeNull();
  });

  it('reports domain-rule membership with the rule hostname', () => {
    const memberships = membershipsForUrl('https://docs.github.com/en', [GROUP_A], [
      domainItem({ includeSubdomains: true }),
    ]);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.viaHostname).toBe('github.com');
  });

  it('returns one entry per matching group for the Home chip', () => {
    const items = [
      pageItem({ groupId: 'g-a', urlNormalized: 'https://example.com/article' }),
      pageItem({ groupId: 'g-b', id: 'item-page-2', urlNormalized: 'https://example.com/article' }),
    ];
    const memberships = membershipsForUrl('https://example.com/article', [GROUP_A, GROUP_B], items);
    expect(memberships.map((m) => m.group.id)).toEqual(['g-a', 'g-b']);
  });

  it('prefers explicit over via within the same group', () => {
    const items = [
      pageItem({ urlNormalized: 'https://github.com/underscore' }),
      domainItem({ includeSubdomains: true }),
    ];
    const memberships = membershipsForUrl('https://github.com/underscore', [GROUP_A], items);
    expect(memberships).toHaveLength(1);
    expect(memberships[0]!.viaHostname).toBeNull();
  });

  it('returns no memberships for non-member urls', () => {
    expect(membershipsForUrl('https://unrelated.test/', [GROUP_A], [pageItem()])).toEqual([]);
  });
});
