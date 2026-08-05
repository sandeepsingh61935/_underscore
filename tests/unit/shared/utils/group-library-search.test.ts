import { describe, expect, it } from 'vitest';

import {
  countGranularSearchResults,
  groupSearchResultsByDomainAndSection,
  groupSearchResultsBySection,
  matchDomainNames,
  matchSectionNames,
} from '@/shared/utils/group-library-search';

const hit = (
  id: string,
  domain: string,
  path: string,
  url?: string,
) => ({
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
    expect(matchDomainNames(['example.com', 'docs.mozilla.org', 'other.io'], 'MOZ')).toEqual([
      'docs.mozilla.org',
    ]);
  });
});

describe('matchSectionNames', () => {
  it('matches path and optional display title', () => {
    expect(matchSectionNames(['/docs/css', '/about'], 'css')).toEqual(['/docs/css']);
    expect(
      matchSectionNames(['/a', '/b'], 'Cascade', (k) => (k === '/a' ? 'CSS Cascade' : k)),
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
    expect(groups[0]!.sections.find((s) => s.sectionKey === '/named')!.nameMatched).toBe(true);
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
