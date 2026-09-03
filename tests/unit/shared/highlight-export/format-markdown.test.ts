/**
 * @file format-markdown.test.ts
 * @description Unit tests for markdown highlight exporter, specifically deep-linked source annotations.
 */
import { describe, expect, it } from 'vitest';

import {
  formatMarkdown,
  formatSourceAnnotation,
} from '@/shared/highlight-export/format-markdown';
import type { ExportableHighlight } from '@/shared/highlight-export/types';

describe('formatSourceAnnotation', () => {
  it('formats simple source annotation when only URL is provided', () => {
    const res = formatSourceAnnotation('https://example.com/article');
    expect(res).toBe('[source] https://example.com/article');
  });

  it('formats source annotation with text fragment when highlight is provided', () => {
    const hl: ExportableHighlight = {
      id: 'hl-1',
      text: 'groundbreaking finding',
      url: 'https://example.com/article',
      domain: 'example.com',
      sectionKey: 'article',
      createdAt: new Date('2026-09-03'),
      selector: {
        exact: 'groundbreaking finding',
        prefix: 'the ',
        suffix: ' was verified',
      },
    };

    const res = formatSourceAnnotation(hl.url, hl);
    expect(res).toBe(
      '[source] https://example.com/article#:~:text=the%20-,groundbreaking%20finding,-%20was%20verified'
    );
  });
});

describe('formatMarkdown with text fragments', () => {
  it('includes deep-linked text fragment in generated markdown source line', () => {
    const hl: ExportableHighlight = {
      id: 'hl-1',
      text: 'crucial point',
      url: 'https://example.com/article',
      domain: 'example.com',
      sectionKey: 'article',
      createdAt: new Date('2026-09-03'),
    };

    const result = formatMarkdown([hl], { kind: 'library' });
    expect(result).toContain(
      '[source] https://example.com/article#:~:text=crucial%20point'
    );
  });
});
