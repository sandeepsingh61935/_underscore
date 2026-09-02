import { describe, it, expect } from 'vitest';

import { buildRelatednessIndex } from './build-relatedness-index';
import { relatedPages } from './related-pages';
import type { RelatednessDoc } from './types';

function doc(
  id: string,
  partial: Partial<RelatednessDoc> & { tags?: string[] }
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

describe('relatedPages', () => {
  it('returns a cross-domain page that shares wording with the seed page', () => {
    const index = buildRelatednessIndex([
      doc('seed', {
        url: 'https://docs.example.com/guide',
        domain: 'docs.example.com',
        tags: [],
        text: 'neural network backpropagation hidden layers training',
      }),
      doc('hit', {
        url: 'https://ml.org/n',
        domain: 'ml.org',
        tags: [],
        text: 'neural network backpropagation training schedule',
      }),
    ]);

    const top = relatedPages(index, 'docs.example.com', '/guide');
    expect(top).toHaveLength(1);
    expect(top[0]).toMatchObject({
      domain: 'ml.org',
      section: '/n',
      highlightCount: 1,
      reason: 'Similar text',
    });
    expect(top[0]!.score).toBeGreaterThan(0);
  });

  it('excludes same-domain sibling paths even when wording matches', () => {
    const index = buildRelatednessIndex([
      doc('seed', {
        url: 'https://docs.example.com/guide',
        domain: 'docs.example.com',
        tags: ['ml'],
        text: 'gradient descent learning rate',
      }),
      doc('sib', {
        url: 'https://docs.example.com/other',
        domain: 'docs.example.com',
        tags: ['ml'],
        text: 'gradient descent learning rate schedule',
      }),
      doc('far', {
        url: 'https://ml.org/n',
        domain: 'ml.org',
        tags: ['ml'],
        text: 'gradient descent learning rate',
      }),
    ]);

    const top = relatedPages(index, 'docs.example.com', '/guide');
    expect(top.map((r) => r.domain)).toEqual(['ml.org']);
    expect(top.map((r) => r.section)).not.toContain('/other');
  });

  it('uses Shared tags when tags overlap and text does not',
    () => {
      const index = buildRelatednessIndex([
        doc('seed', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['shared'],
          text: 'aaaaaaaa bbbbbbbb cccccccc',
        }),
        doc('tagged', {
          url: 'https://b.com/q',
          domain: 'b.com',
          tags: ['shared'],
          text: 'zzzzzzzz yyyyyyyy xxxxxxxx',
        }),
      ]);

      const top = relatedPages(index, 'a.com', '/p');
      expect(top).toHaveLength(1);
      expect(top[0]?.reason).toBe('Shared tags');
      expect(top[0]?.signals.sharedTags).toBe(true);
    }
  );

  it('ranks by max pair score, not sum of many weak marks',
    () => {
      const rows: RelatednessDoc[] = [
        doc('seed', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['topic'],
          text: 'unique seed vocabulary neural backpropagation',
        }),
        doc('strong', {
          url: 'https://short.com/one',
          domain: 'short.com',
          tags: ['topic'],
          text: 'unique seed vocabulary neural backpropagation',
        }),
      ];
      for (let i = 0; i < 8; i++) {
        rows.push(
          doc(`weak${i}`, {
            url: 'https://long.com/article',
            domain: 'long.com',
            tags: ['topic'],
            text: `weak filler wording ${i} qqqq wwww eeee`,
          })
        );
      }

      const top = relatedPages(buildRelatednessIndex(rows), 'a.com', '/p', 3);
      expect(top[0]?.domain).toBe('short.com');
    }
  );

  it('caps at 3 pages',
    () => {
      const rows: RelatednessDoc[] = [
        doc('seed', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['x'],
          text: 'shared wording abcdefghijk',
        }),
      ];
      for (let i = 0; i < 5; i++) {
        rows.push(
          doc(`r${i}`, {
            url: `https://n${i}.com/p`,
            domain: `n${i}.com`,
            tags: ['x'],
            text: `shared wording abcdefghijk extra ${i}`,
          })
        );
      }

      const top = relatedPages(buildRelatednessIndex(rows), 'a.com', '/p');
      expect(top.length).toBe(3);
      expect(top.every((r) => r.score > 0)).toBe(true);
    }
  );

  it('returns empty when the seed page has no docs',
    () => {
      const index = buildRelatednessIndex([
        doc('only', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['x'],
        }),
      ]);
      expect(relatedPages(index, 'missing.com', '/nope')).toEqual([]);
    }
  );

  it('does not BM25-score encrypted ciphertext as plaintext',
    () => {
      const index = buildRelatednessIndex([
        doc('seed', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['shared'],
          text: 'completely unique seed plaintext aaa bbb ccc',
        }),
        doc('cipher', {
          url: 'https://cipher.example/x',
          domain: 'cipher.example',
          tags: [],
          text: 'completely unique seed plaintext aaa bbb ccc',
          encrypted: true,
        }),
        doc('tagged', {
          url: 'https://ok.example/y',
          domain: 'ok.example',
          tags: ['shared'],
          text: 'unrelated body zzz yyy xxx www vvv',
        }),
      ]);

      const top = relatedPages(index, 'a.com', '/p');
      expect(top.map((r) => r.domain)).not.toContain('cipher.example');
      expect(top.some((r) => r.domain === 'ok.example')).toBe(true);
    }
  );

  it('treats two paths on the same foreign host as two pages',
    () => {
      const index = buildRelatednessIndex([
        doc('seed', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['t'],
          text: 'shared topic vocabulary one two three',
        }),
        doc('p1', {
          url: 'https://b.com/one',
          domain: 'b.com',
          tags: ['t'],
          text: 'shared topic vocabulary one two three',
        }),
        doc('p2', {
          url: 'https://b.com/two',
          domain: 'b.com',
          tags: ['t'],
          text: 'shared topic vocabulary one two three',
        }),
      ]);

      const top = relatedPages(index, 'a.com', '/p', 3);
      const b = top.filter((r) => r.domain === 'b.com');
      expect(b).toHaveLength(2);
      expect(b.map((r) => r.section).sort()).toEqual(['/one', '/two']);
    }
  );

  it('counts multiple highlights on a candidate page as one row',
    () => {
      const index = buildRelatednessIndex([
        doc('seed', {
          url: 'https://a.com/p',
          domain: 'a.com',
          tags: ['t'],
          text: 'shared topic vocabulary one two three',
        }),
        doc('c1', {
          url: 'https://b.com/q',
          domain: 'b.com',
          tags: ['t'],
          text: 'shared topic vocabulary one two three',
        }),
        doc('c2', {
          url: 'https://b.com/q',
          domain: 'b.com',
          tags: ['t'],
          text: 'shared topic vocabulary extra words',
        }),
      ]);

      const top = relatedPages(index, 'a.com', '/p');
      expect(top).toHaveLength(1);
      expect(top[0]?.highlightCount).toBe(2);
    }
  );
});
