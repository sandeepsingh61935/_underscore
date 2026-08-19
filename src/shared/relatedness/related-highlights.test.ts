import { describe, it, expect } from 'vitest';

import { buildRelatednessIndex } from './build-relatedness-index';
import { relatedHighlights } from './related-highlights';
import type { RelatednessDoc } from './types';

function doc(
  id: string,
  partial: Partial<RelatednessDoc> & { tags?: string[] },
): RelatednessDoc {
  return {
    id,
    text: partial.text ?? `unique body for ${id}`,
    notes: partial.notes ?? '',
    url: partial.url ?? `https://example.com/${id}`,
    domain: partial.domain ?? 'example.com',
    tags: partial.tags ?? [],
    encrypted: partial.encrypted,
  };
}

describe('relatedHighlights', () => {
  it('excludes the seed highlight', () => {
    const index = buildRelatednessIndex([
      doc('seed', { tags: ['ml'], text: 'gradient descent learning rate' }),
      doc('a', { tags: ['ml'], text: 'gradient descent batch size' }),
      doc('b', { tags: ['ml'], text: 'learning rate schedule' }),
    ]);

    const ids = relatedHighlights(index, 'seed', 5).map((r) => r.id);
    expect(ids).not.toContain('seed');
    expect(ids.length).toBeGreaterThan(0);
  });

  it('boosts same-URL neighbors', () => {
    const page = 'https://docs.example.com/guide';
    const index = buildRelatednessIndex([
      doc('seed', {
        url: page,
        domain: 'docs.example.com',
        text: 'alpha beta gamma delta epsilon',
        tags: [],
      }),
      doc('sib', {
        url: page,
        domain: 'docs.example.com',
        text: 'zeta eta theta iota kappa',
        tags: [],
      }),
      doc('far', {
        url: 'https://other.org/x',
        domain: 'other.org',
        text: 'completely different wording here',
        tags: [],
      }),
    ]);

    const top = relatedHighlights(index, 'seed', 5);
    expect(top[0]?.id).toBe('sib');
    expect(top[0]?.signals.sameUrl).toBe(true);
    expect(top[0]?.reason).toMatch(/Same page/);
  });

  it('enforces max 2 results per URL', () => {
    const page = 'https://long.example.com/article';
    const rows: RelatednessDoc[] = [
      doc('seed', {
        url: page,
        domain: 'long.example.com',
        text: 'shared topic vocabulary one two three four five',
        tags: ['topic'],
      }),
    ];
    for (let i = 0; i < 5; i++) {
      rows.push(
        doc(`p${i}`, {
          url: page,
          domain: 'long.example.com',
          text: `shared topic vocabulary extra words ${i} six seven eight`,
          tags: ['topic'],
        }),
      );
    }
    rows.push(
      doc('other1', {
        url: 'https://a.com/1',
        domain: 'a.com',
        text: 'shared topic vocabulary nine ten',
        tags: ['topic'],
      }),
      doc('other2', {
        url: 'https://b.com/2',
        domain: 'b.com',
        text: 'shared topic vocabulary eleven twelve',
        tags: ['topic'],
      }),
      doc('other3', {
        url: 'https://c.com/3',
        domain: 'c.com',
        text: 'shared topic vocabulary thirteen fourteen',
        tags: ['topic'],
      }),
    );

    const top = relatedHighlights(indexOf(rows), 'seed', 5);
    const fromPage = top.filter((r) => r.id.startsWith('p'));
    expect(fromPage.length).toBeLessThanOrEqual(2);
    expect(top.length).toBeGreaterThan(2);
  });

  it('still returns neighbors for untagged seeds via text/URL', () => {
    const page = 'https://blog.example.com/post';
    const index = buildRelatednessIndex([
      doc('seed', {
        url: page,
        domain: 'blog.example.com',
        tags: [],
        text: 'neural network backpropagation hidden layers',
      }),
      doc('sib', {
        url: page,
        domain: 'blog.example.com',
        tags: [],
        text: 'forward propagation activation functions',
      }),
      doc('texty', {
        url: 'https://ml.org/n',
        domain: 'ml.org',
        tags: [],
        text: 'neural network backpropagation training',
      }),
    ]);

    const top = relatedHighlights(index, 'seed', 5);
    expect(top.length).toBeGreaterThan(0);
    expect(top.some((r) => r.id === 'sib' || r.id === 'texty')).toBe(true);
  });

  it('does not BM25-score encrypted ciphertext as plaintext', () => {
    const index = buildRelatednessIndex([
      doc('seed', {
        tags: ['shared'],
        text: 'completely unique seed plaintext aaa bbb ccc',
        encrypted: false,
      }),
      doc('cipher', {
        tags: [],
        // Looks like English but flagged encrypted — must not match via BM25
        text: 'completely unique seed plaintext aaa bbb ccc',
        encrypted: true,
        url: 'https://cipher.example/x',
        domain: 'cipher.example',
      }),
      doc('tagged', {
        tags: ['shared'],
        text: 'unrelated body zzz yyy xxx www vvv',
        url: 'https://ok.example/y',
        domain: 'ok.example',
      }),
    ]);

    const top = relatedHighlights(index, 'seed', 5);
    const cipher = top.find((r) => r.id === 'cipher');
    expect(cipher).toBeUndefined();
    expect(top.some((r) => r.id === 'tagged')).toBe(true);
  });

  it('uses tags + URL when seed text is encrypted', () => {
    const page = 'https://secure.example.com/a';
    const index = buildRelatednessIndex([
      doc('seed', {
        tags: ['alpha'],
        text: '',
        encrypted: true,
        url: page,
        domain: 'secure.example.com',
      }),
      doc('sib', {
        tags: ['alpha'],
        text: 'readable sibling body content here',
        url: page,
        domain: 'secure.example.com',
      }),
      doc('tagonly', {
        tags: ['alpha'],
        text: 'other page with shared tag only',
        url: 'https://other.example/z',
        domain: 'other.example',
      }),
    ]);

    const top = relatedHighlights(index, 'seed', 5);
    expect(top.map((r) => r.id)).toEqual(expect.arrayContaining(['sib', 'tagonly']));
    expect(top.find((r) => r.id === 'sib')?.signals.sameUrl).toBe(true);
    expect(top.find((r) => r.id === 'tagonly')?.signals.sharedTags).toBe(true);
  });

  it('caps at top 5 and drops non-positive scores', () => {
    const rows: RelatednessDoc[] = [
      doc('seed', { tags: ['x'], text: 'seed only tokens abcdefghijk' }),
    ];
    for (let i = 0; i < 8; i++) {
      rows.push(
        doc(`r${i}`, {
          tags: ['x'],
          text: `related shared wording ${i} abcdefghijk`,
          url: `https://n${i}.com/`,
          domain: `n${i}.com`,
        }),
      );
    }
    // Unrelated noise — should not appear
    rows.push(
      doc('noise', {
        tags: [],
        text: 'zzzzzzzz qqqqqqqq',
        url: 'https://noise.com/',
        domain: 'noise.com',
      }),
    );

    const top = relatedHighlights(buildRelatednessIndex(rows), 'seed', 5);
    expect(top.length).toBeLessThanOrEqual(5);
    expect(top.every((r) => r.score > 0)).toBe(true);
    expect(top.map((r) => r.id)).not.toContain('noise');
  });

  it('reason reflects dominant signals', () => {
    const page = 'https://ex.com/p';
    const index = buildRelatednessIndex([
      doc('seed', {
        url: page,
        domain: 'ex.com',
        tags: ['t1'],
        text: 'machine learning optimization gradient',
      }),
      doc('both', {
        url: page,
        domain: 'ex.com',
        tags: ['t1'],
        text: 'machine learning optimization methods',
      }),
    ]);

    const hit = relatedHighlights(index, 'seed', 1)[0];
    expect(hit?.reason).toContain('Same page');
    expect(hit?.reason).toContain('Shared tags');
  });

  it('returns empty for unknown seed id', () => {
    const index = buildRelatednessIndex([doc('a', { tags: ['t'] })]);
    expect(relatedHighlights(index, 'missing', 5)).toEqual([]);
  });
});

function indexOf(rows: RelatednessDoc[]) {
  return buildRelatednessIndex(rows);
}
