import { describe, it, expect } from 'vitest';

import { buildRelatednessIndex } from './build-relatedness-index';
import { relatedTags } from './related-tags';
import type { RelatednessDoc } from './types';

function doc(
  id: string,
  tags: string[],
  extras?: Partial<RelatednessDoc>
): RelatednessDoc {
  return {
    id,
    text: extras?.text ?? `text ${id}`,
    notes: extras?.notes ?? '',
    url: extras?.url ?? `https://example.com/${id}`,
    domain: extras?.domain ?? 'example.com',
    tags,
    encrypted: extras?.encrypted,
  };
}

describe('relatedTags', () => {
  it('ranks co-occurring tags by Jaccard and excludes self', () => {
    // N large enough that python/data stay under df/N > 0.5.
    // ml∩python: h1,h2 (2); union = 3+2-2 = 3 → 2/3
    // ml∩data: h1 (1); union = 3+2-1 = 4 → 0.25
    const index = buildRelatednessIndex([
      doc('h1', ['ml', 'python', 'data']),
      doc('h2', ['ml', 'python']),
      doc('h3', ['ml']),
      doc('h4', ['data']),
      doc('h5', ['other-a']),
      doc('h6', ['other-b']),
      doc('h7', ['other-c']),
    ]);

    const result = relatedTags(index, 'ml', 5);
    expect(result.map((r) => r.tag)).not.toContain('ml');
    expect(result[0]?.tag).toBe('python');
    expect(result[0]?.cooccur).toBe(2);
    expect(result[0]?.score).toBeCloseTo(2 / 3, 5);
  });

  it('excludes stoplist tags', () => {
    const index = buildRelatednessIndex([
      doc('h1', ['ml', 'todo', 'python']),
      doc('h2', ['ml', 'todo', 'python']),
      doc('h3', ['ml', 'misc']),
      doc('h4', ['ml', 'test']),
      doc('h5', ['ml', 'untagged', 'asdf', 'something']),
    ]);

    const tags = relatedTags(index, 'ml', 10).map((r) => r.tag);
    expect(tags).toEqual(['python']);
  });

  it('excludes ultra-common tags (df/N > 0.5)', () => {
    // N=4; common on h1-h3 (df=3 > 0.5*4); niche co-occurs twice with seed
    const index = buildRelatednessIndex([
      doc('h1', ['seed', 'common', 'niche']),
      doc('h2', ['seed', 'common', 'niche']),
      doc('h3', ['common']),
      doc('h4', ['other']),
    ]);

    const tags = relatedTags(index, 'seed', 5).map((r) => r.tag);
    expect(tags).not.toContain('common');
    expect(tags).toContain('niche');
  });

  it('returns empty when active tag df < 2 (gate)', () => {
    const index = buildRelatednessIndex([
      doc('h1', ['rare', 'python']),
      doc('h2', ['python']),
      doc('h3', ['python']),
    ]);

    expect(relatedTags(index, 'rare', 5)).toEqual([]);
  });

  it('drops weak co-occurrence (need co-occur ≥ 2 or Jaccard ≥ 0.15)', () => {
    // seed df=10; once co-occurs with weak once → cooccur=1, jaccard=1/(10+1-1)=0.1 < 0.15
    const rows: RelatednessDoc[] = [];
    for (let i = 0; i < 10; i++) {
      rows.push(doc(`s${i}`, i === 0 ? ['seed', 'weak'] : ['seed']));
    }
    rows.push(doc('w1', ['weak']));
    const index = buildRelatednessIndex(rows);

    expect(relatedTags(index, 'seed', 5).map((r) => r.tag)).not.toContain('weak');
  });

  it('caps results at top 5', () => {
    const rows: RelatednessDoc[] = [];
    for (let i = 0; i < 6; i++) {
      rows.push(doc(`a${i}`, ['seed', `t${i}`]));
      rows.push(doc(`b${i}`, ['seed', `t${i}`]));
    }
    const index = buildRelatednessIndex(rows);
    expect(relatedTags(index, 'seed', 5)).toHaveLength(5);
  });

  it('is case-insensitive on the query tag', () => {
    const index = buildRelatednessIndex([
      doc('h1', ['ml', 'python']),
      doc('h2', ['ml', 'python']),
      doc('h3', ['noise-a']),
      doc('h4', ['noise-b']),
      doc('h5', ['noise-c']),
    ]);
    expect(relatedTags(index, 'ML', 5)[0]?.tag).toBe('python');
  });
});
