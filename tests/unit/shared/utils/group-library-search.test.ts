import { describe, expect, it } from 'vitest';

import {
  buildGroupPageUrlSet,
  countGranularSearchResults,
  groupSearchResultsByDomainAndSection,
  groupSearchResultsBySection,
  matchDomainNames,
  matchGroupNames,
  matchSectionNames,
} from '@/shared/utils/group-library-search';
import type { PageGroupItem } from '@/shared/types/page-group';

const hit = (id: string, domain: string, path: string, url?: string) => ({
  id,
  domain,
  path,
  url: url ?? `https://${domain}${path}`,
  text: id,
  matchedFields: ['text' as const],
  createdAt: new Date(),
});

describe('matchDomainNames', () => {
  it('matches hostname substrings case-insensitively', () => {
    expect(
      matchDomainNames(['example.com', 'docs.mozilla.org', 'other.io'], 'MOZ')
    ).toEqual(['docs.mozilla.org']);
  });
});

describe('matchSectionNames', () => {
  it('matches path and optional display title', () => {
    expect(matchSectionNames(['/docs/css', '/about'], 'css')).toEqual(['/docs/css']);
    expect(
      matchSectionNames(['/a', '/b'], 'Cascade', (k) => (k === '/a' ? 'CSS Cascade' : k))
    ).toEqual(['/a']);
  });
});

describe('groupSearchResultsByDomainAndSection', () => {
  it('groups highlights under domain then section', () => {
    const results = [
      hit('1', 'example.com', '/docs'),
      hit('2', 'example.com', '/docs'),
      hit('3', 'example.com', '/blog'),
      hit('4', 'other.com', '/'),
    ];
    const groups = groupSearchResultsByDomainAndSection(results);
    expect(groups.map((g) => g.domain)).toEqual(['example.com', 'other.com']);
    expect(groups[0]!.matchCount).toBe(3);
    expect(groups[0]!.sections.map((s) => s.sectionKey)).toEqual(['/docs', '/blog']);
    expect(groups[0]!.sections[0]!.matchCount).toBe(2);
    expect(groups[1]!.sections[0]!.sectionKey).toBe('/');
  });

  it('includes name-matched domains with zero highlight hits', () => {
    const groups = groupSearchResultsByDomainAndSection([], {
      nameMatchedDomains: ['lonely.com'],
    });
    expect(groups).toHaveLength(1);
    expect(groups[0]!.domain).toBe('lonely.com');
    expect(groups[0]!.nameMatched).toBe(true);
    expect(groups[0]!.matchCount).toBe(0);
  });

  it('includes name-matched sections with zero highlight hits', () => {
    const groups = groupSearchResultsByDomainAndSection([hit('1', 'example.com', '/a')], {
      nameMatchedSections: ['/named'],
    });
    const sectionKeys = groups[0]!.sections.map((s) => s.sectionKey);
    expect(sectionKeys).toContain('/named');
    expect(groups[0]!.sections.find((s) => s.sectionKey === '/named')!.nameMatched).toBe(
      true
    );
  });
});

describe('groupSearchResultsBySection', () => {
  it('flattens to section groups for domain-scoped hits', () => {
    const sections = groupSearchResultsBySection([
      hit('1', 'example.com', '/x'),
      hit('2', 'example.com', '/y'),
      hit('3', 'example.com', '/x'),
    ]);
    expect(sections.map((s) => s.sectionKey)).toEqual(['/x', '/y']);
    expect(sections[0]!.highlights).toHaveLength(2);
  });
});

describe('countGranularSearchResults', () => {
  it('counts highlight hits plus pure name matches', () => {
    const groups = groupSearchResultsByDomainAndSection([hit('1', 'a.com', '/')], {
      nameMatchedDomains: ['b.com', 'a.com'],
    });
    // 1 highlight + 1 pure domain name match (b.com)
    expect(countGranularSearchResults(groups)).toBe(2);
  });
});

describe('matchGroupNames', () => {
  const groups = [
    { id: 'g1', name: 'Research' },
    { id: 'g2', name: ' weekend reads ' },
    { id: 'g3', name: 'Work' },
  ];

  it('matches name substrings case-insensitively and preserves objects', () => {
    expect(matchGroupNames(groups, 'res')).toEqual([{ id: 'g1', name: 'Research' }]);
    expect(matchGroupNames(groups, 'READS')).toEqual([
      { id: 'g2', name: ' weekend reads ' },
    ]);
  });

  it('returns [] for empty/whitespace query', () => {
    expect(matchGroupNames(groups, '')).toEqual([]);
    expect(matchGroupNames(groups, '   ')).toEqual([]);
  });
});

describe('buildGroupPageUrlSet', () => {
  const pageItem = (groupId: string, url: string): PageGroupItem => ({
    id: `${groupId}-${url}`,
    groupId,
    kind: 'page',
    urlNormalized: url,
    title: null,
    faviconUrl: null,
    position: 'a0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  });
  const domainItem = (
    groupId: string,
    hostname: string,
    includeSubdomains = false
  ): PageGroupItem => ({
    id: `${groupId}-${hostname}`,
    groupId,
    kind: 'domain',
    hostname,
    includeSubdomains,
    position: 'a0',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    deletedAt: null,
  });

  it('returns null when no groups are selected', () => {
    expect(buildGroupPageUrlSet([pageItem('g1', 'https://a.com/')], [], [])).toBeNull();
  });

  it('resolves explicit page items by normalized URL', () => {
    const set = buildGroupPageUrlSet(
      [pageItem('g1', 'https://a.com/docs'), pageItem('g2', 'https://b.com/')],
      [],
      ['g1']
    );
    expect(set).not.toBeNull();
    expect([...set!]).toEqual(['https://a.com/docs']);
  });

  it('expands domain rules over known pages and unions groups', () => {
    const set = buildGroupPageUrlSet(
      [domainItem('g1', 'a.com', true), pageItem('g2', 'https://b.com/x')],
      [
        { urlNormalized: 'https://docs.a.com/guide' },
        { urlNormalized: 'https://other.com/' },
      ],
      ['g1', 'g2']
    );
    expect(set).not.toBeNull();
    expect([...set!].sort()).toEqual(
      ['https://b.com/x', 'https://docs.a.com/guide'].sort()
    );
  });

  it('skips tombstoned items', () => {
    const tombstoned = {
      ...pageItem('g1', 'https://a.com/gone'),
      deletedAt: '2026-02-01T00:00:00.000Z',
    };
    const set = buildGroupPageUrlSet([tombstoned], [], ['g1']);
    expect(set).not.toBeNull();
    expect(set!.size).toBe(0);
  });
});
