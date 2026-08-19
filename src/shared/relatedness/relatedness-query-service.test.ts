import { describe, it, expect } from 'vitest';

import { RelatednessQueryService } from './relatedness-query-service';
import type { RelatednessDoc } from './types';

function doc(id: string, tags: string[], text = `body ${id}`): RelatednessDoc {
  return {
    id,
    text,
    notes: '',
    url: `https://example.com/${id}`,
    domain: 'example.com',
    tags,
  };
}

describe('RelatednessQueryService', () => {
  it('rebuilds index and serves related tags/highlights', () => {
    const svc = new RelatednessQueryService([
      doc('h1', ['ml', 'python'], 'gradient descent learning'),
      doc('h2', ['ml', 'python'], 'gradient descent batch'),
      doc('h3', ['noise'], 'zzzz'),
      doc('h4', ['noise-b'], 'yyyy'),
      doc('h5', ['noise-c'], 'xxxx'),
    ]);

    expect(svc.size).toBe(5);
    expect(svc.tagDf('ml')).toBe(2);
    expect(svc.relatedTags('ml').map((r) => r.tag)).toContain('python');

    const rel = svc.relatedHighlights('h1');
    expect(rel.map((r) => r.id)).toContain('h2');
    expect(rel.map((r) => r.id)).not.toContain('h1');
  });

  it('rebuild replaces prior docs', () => {
    const svc = new RelatednessQueryService([doc('a', ['t'])]);
    expect(svc.getDoc('a')).not.toBeNull();
    svc.rebuild([
      doc('b', ['t', 'u']),
      doc('c', ['t', 'u']),
      doc('d', ['x']),
      doc('e', ['y']),
      doc('f', ['z']),
    ]);
    expect(svc.getDoc('a')).toBeNull();
    expect(svc.getDoc('b')).not.toBeNull();
    expect(svc.relatedTags('t').map((r) => r.tag)).toContain('u');
  });
});
