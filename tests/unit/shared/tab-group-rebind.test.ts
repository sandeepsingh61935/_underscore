/**
 * @file tab-group-rebind.test.ts
 * @description Unit tests for Tab Group Rebind heuristic and Jaccard similarity.
 */

import { describe, expect, it } from 'vitest';

import type {
  LiveBrowserGroupCandidate,
  TabGroupBinding,
} from '@/shared/types/page-group';
import {
  jaccardSimilarity,
  rebind,
  scoreCandidate,
} from '@/shared/utils/tab-group-rebind';

describe('jaccardSimilarity', () => {
  it('returns 0 for two empty arrays', () => {
    expect(jaccardSimilarity([], [])).toBe(0);
  });

  it('returns 0 when one array is empty and the other is not', () => {
    expect(jaccardSimilarity(['https://example.com'], [])).toBe(0);
    expect(jaccardSimilarity([], ['https://example.com'])).toBe(0);
  });

  it('returns 0 for completely disjoint sets', () => {
    const urlsA = ['https://a.com', 'https://b.com'];
    const urlsB = ['https://c.com', 'https://d.com'];
    expect(jaccardSimilarity(urlsA, urlsB)).toBe(0);
  });

  it('returns 1.0 for exact matches regardless of order or duplicates', () => {
    const urlsA = ['https://a.com', 'https://b.com', 'https://a.com'];
    const urlsB = ['https://b.com', 'https://a.com'];
    expect(jaccardSimilarity(urlsA, urlsB)).toBe(1);
  });

  it('computes correct partial overlap |A ∩ B| / |A ∪ B|', () => {
    const urlsA = ['https://a.com', 'https://b.com'];
    const urlsB = ['https://b.com', 'https://c.com'];
    // Intersection: { 'https://b.com' } (1)
    // Union: { 'https://a.com', 'https://b.com', 'https://c.com' } (3)
    expect(jaccardSimilarity(urlsA, urlsB)).toBeCloseTo(1 / 3, 5);
  });
});

describe('scoreCandidate', () => {
  const baseBinding: TabGroupBinding = {
    appGroupId: 'app-1',
    browserGroupId: 101,
    windowId: 1,
    title: 'Research',
    color: 'blue',
    urls: ['https://a.com', 'https://b.com'],
    lastSeenAt: '2026-09-28T12:00:00.000Z',
  };

  it('scores 4.0 for exact match on title, color, and URLs', () => {
    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 201,
      windowId: 2,
      title: 'Research',
      color: 'blue',
      urls: ['https://a.com', 'https://b.com'],
    };

    const result = scoreCandidate(baseBinding, candidate);
    expect(result.score).toBe(4.0);
    expect(result.jaccardOverlap).toBe(1.0);
    expect(result.titleMatch).toBe(true);
    expect(result.colorMatch).toBe(true);
    expect(result.eligible).toBe(true);
  });

  it('matches when renamed during downtime if URL overlap >= 0.8', () => {
    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 202,
      windowId: 2,
      title: 'Renamed Project',
      color: 'blue',
      urls: [
        'https://1.com',
        'https://2.com',
        'https://3.com',
        'https://4.com',
        'https://5.com',
      ],
    };

    const bindingWith5Urls: TabGroupBinding = {
      ...baseBinding,
      title: 'Old Name',
      urls: ['https://1.com', 'https://2.com', 'https://3.com', 'https://4.com'], // 4/5 = 0.8 overlap
    };

    const result = scoreCandidate(bindingWith5Urls, candidate);
    expect(result.titleMatch).toBe(false);
    expect(result.jaccardOverlap).toBe(0.8);
    expect(result.score).toBe(1.8); // 0 (title) + 1 (color) + 0.8 (overlap)
    expect(result.eligible).toBe(true);
  });

  it('matches when recolored during downtime if same title and URL overlap >= 0.5', () => {
    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 203,
      windowId: 2,
      title: 'research ', // tests trimming/case
      color: 'red', // recolored from blue
      urls: ['https://a.com'], // 1/2 = 0.5 overlap
    };

    const result = scoreCandidate(baseBinding, candidate);
    expect(result.titleMatch).toBe(true);
    expect(result.colorMatch).toBe(false);
    expect(result.jaccardOverlap).toBe(0.5);
    expect(result.score).toBe(2.5); // 2 (title) + 0 (color) + 0.5 (overlap)
    expect(result.eligible).toBe(true);
  });

  it('rejects candidate with low overlap (< 0.5) even if title matches', () => {
    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 204,
      windowId: 2,
      title: 'Research',
      color: 'blue',
      urls: ['https://a.com', 'https://x.com', 'https://y.com', 'https://z.com'], // 1/5 = 0.2 overlap
    };

    const result = scoreCandidate(baseBinding, candidate);
    expect(result.titleMatch).toBe(true);
    expect(result.jaccardOverlap).toBe(0.2);
    expect(result.eligible).toBe(false);
  });
});

describe('rebind', () => {
  it('matches live candidate to binding on exact match', () => {
    const binding: TabGroupBinding = {
      appGroupId: 'group-1',
      browserGroupId: 10,
      windowId: 1,
      title: 'Docs',
      color: 'green',
      urls: ['https://docs.example.com'],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 99,
      windowId: 1,
      title: 'Docs',
      color: 'green',
      urls: ['https://docs.example.com'],
    };

    const result = rebind([binding], [candidate]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]).toMatchObject({
      binding,
      candidate,
      score: 4.0,
      jaccardOverlap: 1.0,
    });
    expect(result.unmatchedBindings).toHaveLength(0);
    expect(result.unmatchedCandidates).toHaveLength(0);
  });

  it('matches rename during downtime when URL overlap >= 0.8', () => {
    const binding: TabGroupBinding = {
      appGroupId: 'group-1',
      browserGroupId: 10,
      windowId: 1,
      title: 'Original Title',
      color: 'grey',
      urls: ['https://1.com', 'https://2.com', 'https://3.com', 'https://4.com'],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 88,
      windowId: 1,
      title: 'Completely Different Title',
      color: 'grey',
      urls: [
        'https://1.com',
        'https://2.com',
        'https://3.com',
        'https://4.com',
        'https://5.com',
      ],
    };

    const result = rebind([binding], [candidate]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.binding.appGroupId).toBe('group-1');
    expect(result.matches[0]?.candidate.browserGroupId).toBe(88);
  });

  it('matches recolor during downtime when title matches and URL overlap >= 0.5', () => {
    const binding: TabGroupBinding = {
      appGroupId: 'group-1',
      browserGroupId: 10,
      windowId: 1,
      title: 'Tasks',
      color: 'red',
      urls: ['https://a.com', 'https://b.com'],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 77,
      windowId: 1,
      title: 'Tasks',
      color: 'purple',
      urls: ['https://a.com'],
    };

    const result = rebind([binding], [candidate]);
    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.binding.appGroupId).toBe('group-1');
    expect(result.matches[0]?.candidate.browserGroupId).toBe(77);
  });

  it('rejects rebind on low overlap (< 0.5) with same title', () => {
    const binding: TabGroupBinding = {
      appGroupId: 'group-1',
      browserGroupId: 10,
      windowId: 1,
      title: 'Work',
      color: 'blue',
      urls: ['https://w1.com', 'https://w2.com', 'https://w3.com'],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 55,
      windowId: 1,
      title: 'Work',
      color: 'blue',
      urls: ['https://other1.com', 'https://other2.com'],
    };

    const result = rebind([binding], [candidate]);
    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedBindings).toEqual([binding]);
    expect(result.unmatchedCandidates).toEqual([candidate]);
  });

  it('disambiguates two groups with same title using URL overlap and color', () => {
    const bindingDev: TabGroupBinding = {
      appGroupId: 'dev-group',
      browserGroupId: 10,
      windowId: 1,
      title: 'Project',
      color: 'blue',
      urls: ['https://github.com/app', 'https://dev.local'],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const bindingDesign: TabGroupBinding = {
      appGroupId: 'design-group',
      browserGroupId: 11,
      windowId: 1,
      title: 'Project',
      color: 'yellow',
      urls: ['https://figma.com/file1', 'https://dribbble.com'],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidateDesign: LiveBrowserGroupCandidate = {
      browserGroupId: 100,
      windowId: 1,
      title: 'Project',
      color: 'yellow',
      urls: ['https://figma.com/file1', 'https://dribbble.com'],
    };

    const candidateDev: LiveBrowserGroupCandidate = {
      browserGroupId: 101,
      windowId: 1,
      title: 'Project',
      color: 'blue',
      urls: ['https://github.com/app', 'https://dev.local'],
    };

    const result = rebind([bindingDev, bindingDesign], [candidateDesign, candidateDev]);

    expect(result.matches).toHaveLength(2);
    const devMatch = result.matches.find((m) => m.binding.appGroupId === 'dev-group');
    const designMatch = result.matches.find(
      (m) => m.binding.appGroupId === 'design-group'
    );

    expect(devMatch?.candidate.browserGroupId).toBe(101);
    expect(designMatch?.candidate.browserGroupId).toBe(100);
    expect(result.unmatchedBindings).toHaveLength(0);
    expect(result.unmatchedCandidates).toHaveLength(0);
  });

  it('handles empty URLs or missing visible tabs cleanly without crashing', () => {
    const binding: TabGroupBinding = {
      appGroupId: 'group-empty',
      browserGroupId: 1,
      windowId: 1,
      title: 'Firefox Tabless',
      color: 'grey',
      urls: [],
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidate: LiveBrowserGroupCandidate = {
      browserGroupId: 2,
      windowId: 1,
      title: 'Firefox Tabless',
      color: 'grey',
      urls: [],
    };

    expect(() => rebind([binding], [candidate])).not.toThrow();
    const result = rebind([binding], [candidate]);
    // Since both URL lists are empty, overlap is 0 (< 0.5), so not eligible
    expect(result.matches).toHaveLength(0);
    expect(result.unmatchedBindings).toHaveLength(1);
    expect(result.unmatchedCandidates).toHaveLength(1);
  });

  it('performs greedy one-to-one assignment without duplicate assignments', () => {
    const binding1: TabGroupBinding = {
      appGroupId: 'b-1',
      browserGroupId: 10,
      windowId: 1,
      title: 'Shared Name',
      color: 'blue',
      urls: ['https://a.com', 'https://b.com'], // 100% overlap with c1 -> score 4.0
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const binding2: TabGroupBinding = {
      appGroupId: 'b-2',
      browserGroupId: 20,
      windowId: 1,
      title: 'Shared Name',
      color: 'blue',
      urls: ['https://a.com'], // 50% overlap with c1 -> score 3.5
      lastSeenAt: '2026-09-28T12:00:00.000Z',
    };

    const candidate1: LiveBrowserGroupCandidate = {
      browserGroupId: 50,
      windowId: 1,
      title: 'Shared Name',
      color: 'blue',
      urls: ['https://a.com', 'https://b.com'],
    };

    const result = rebind([binding1, binding2], [candidate1]);

    expect(result.matches).toHaveLength(1);
    expect(result.matches[0]?.binding.appGroupId).toBe('b-1');
    expect(result.matches[0]?.candidate.browserGroupId).toBe(50);
    expect(result.unmatchedBindings).toEqual([binding2]);
    expect(result.unmatchedCandidates).toHaveLength(0);
  });
});
