import { describe, it, expect } from 'vitest';

import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import {
  buildExport,
  buildFilename,
  buildXlsxExport,
  filterRawHighlightsByScope,
  formatSingleHighlightMarkdown,
  formatSourceAnnotation,
  partitionExportable,
  toExportableHighlight,
} from '@/shared/highlight-export';

function hl(over: Partial<HighlightDataV2> = {}): HighlightDataV2 {
  return {
    id: 'h-1',
    text: 'Sample highlight text.',
    contentHash: 'a'.repeat(64),
    colorRole: 'yellow',
    type: 'underscore',
    ranges: [],
    createdAt: new Date('2026-06-13T10:24:00Z'),
    url: 'https://wikipedia.org/wiki/Antigravity',
    metadata: { source: 'user' as const, tags: ['physics'], notes: 'Key definition' },
    ...over,
  };
}

describe('highlight-export', () => {
  describe('toExportableHighlight', () => {
    it('maps domain and section from URL', () => {
      const result = toExportableHighlight(hl());
      expect(result).toMatchObject({
        domain: 'wikipedia.org',
        sectionKey: '/wiki/Antigravity',
        tags: ['physics'],
        note: 'Key definition',
      });
    });

    it('returns null when URL is missing', () => {
      expect(toExportableHighlight(hl({ url: undefined }))).toBeNull();
    });
  });

  describe('filterRawHighlightsByScope', () => {
    const items = [
      hl({ id: 'h-1', url: 'https://wikipedia.org/wiki/Antigravity' }),
      hl({ id: 'h-2', url: 'https://github.com/obra/superpowers' }),
      hl({ id: 'h-3', url: 'https://wikipedia.org/wiki/Dark_Matter' }),
    ];

    it('filters by domain', () => {
      const filtered = filterRawHighlightsByScope(items, { kind: 'domain', domain: 'wikipedia.org' });
      expect(filtered).toHaveLength(2);
    });

    it('filters by section', () => {
      const filtered = filterRawHighlightsByScope(items, {
        kind: 'section',
        domain: 'wikipedia.org',
        sectionKey: '/wiki/Antigravity',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('h-1');
    });

    it('splits query-identity sections on the same path shell', () => {
      const transcriptItems = [
        hl({
          id: 't-a',
          url: 'https://youtubetotranscript.com/transcript?v=AAA&utm_source=x',
        }),
        hl({
          id: 't-b',
          url: 'https://youtubetotranscript.com/transcript?v=BBB',
        }),
      ];
      const filtered = filterRawHighlightsByScope(transcriptItems, {
        kind: 'section',
        domain: 'youtubetotranscript.com',
        sectionKey: '/transcript?v=AAA',
      });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('t-a');
    });

    it('maps query-aware sectionKey on exportable highlights', () => {
      const result = toExportableHighlight(
        hl({
          url: 'https://youtubetotranscript.com/transcript?v=AAA&utm_source=x',
        }),
      );
      expect(result?.sectionKey).toBe('/transcript?v=AAA');
    });

    it('filters by highlight id', () => {
      const filtered = filterRawHighlightsByScope(items, { kind: 'highlight', highlightId: 'h-2' });
      expect(filtered).toHaveLength(1);
      expect(filtered[0]?.id).toBe('h-2');
    });
  });

  describe('partitionExportable', () => {
    it('omits highlights with empty text', () => {
      const exportable = toExportableHighlight(hl())!;
      const empty = { ...exportable, id: 'h-empty', text: '' };
      const { included, omitted } = partitionExportable([exportable, empty]);
      expect(included).toHaveLength(1);
      expect(omitted).toBe(1);
    });
  });

  describe('formatSourceAnnotation', () => {
    it('emits a plain URL without a redundant markdown link label', () => {
      const url = 'https://chatgpt.com/g/g-p-6a342068ca7881919bda708085339c09-bergson-s-essay-on-comedy/c/6a454c65-bc68-83e9-973a-97011773f328';
      expect(formatSourceAnnotation(url)).toBe(`[source] ${url}`);
    });
  });

  describe('formatSingleHighlightMarkdown', () => {
    it('numbers the highlight and annotates date and source', () => {
      const markdown = formatSingleHighlightMarkdown(toExportableHighlight(hl())!);
      expect(markdown).toContain('**1.**');
      expect(markdown).toContain('Sample highlight text.');
      expect(markdown).toContain('[date] 2026-06-13');
      expect(markdown).toContain(
        '[source] https://wikipedia.org/wiki/Antigravity',
      );
      expect(markdown).not.toContain('](https://');
      expect(markdown).not.toContain('[color]');
      expect(markdown).toContain('[tags] physics');
      expect(markdown).toContain('[note] Key definition');
    });

    it('preserves fenced code and lists via line-wise blockquotes', () => {
      const markdown = formatSingleHighlightMarkdown(
        toExportableHighlight(
          hl({
            text: 'Intro\n\n```\nint a = 0;\n```\n\n- one\n- two',
          }),
        )!,
      );
      expect(markdown).toContain('> ```');
      expect(markdown).toContain('> int a = 0;');
      expect(markdown).toContain('> - one');
      expect(markdown).not.toContain('> "Intro');
    });
  });

  describe('buildExport', () => {
    it('builds hierarchical library markdown with sequential numbering', () => {
      const highlights = [
        toExportableHighlight(hl())!,
        toExportableHighlight(
          hl({
            id: 'h-2',
            url: 'https://github.com/obra/superpowers',
            text: 'Skills extend AI capabilities.',
          }),
        )!,
      ];

      const result = buildExport(highlights, { kind: 'library' });
      expect(result.filename).toMatch(/^underscore-highlights-/);
      expect(result.markdown).toContain('# My Highlights');
      expect(result.markdown).toContain('[exported]');
      expect(result.markdown).toContain('[count]');
      expect(result.markdown).toContain('## wikipedia.org');
      expect(result.markdown).toContain('## github.com');
      expect(result.markdown).toContain('**1.**');
      expect(result.markdown).toContain('**2.**');
      expect(result.stats.included).toBe(2);
    });

    it('builds section-scoped markdown without domain headings', () => {
      const result = buildExport([toExportableHighlight(hl())!], {
        kind: 'section',
        domain: 'wikipedia.org',
        sectionKey: '/wiki/Antigravity',
      });
      expect(result.markdown).toContain('# wikipedia.org · /wiki/Antigravity');
      expect(result.markdown).not.toContain('## wikipedia.org');
    });

    it('includes note and tags when highlight metadata is set', () => {
      const exportable = toExportableHighlight(
        hl({ metadata: { source: 'user' as const, notes: 'Key definition', tags: ['comedy'] } }),
      )!;
      const result = buildExport([exportable], {
        kind: 'section',
        domain: 'wikipedia.org',
        sectionKey: '/wiki/Antigravity',
      });
      expect(result.markdown).toContain('[note] Key definition');
      expect(result.markdown).toContain('[tags] comedy');
    });

    it('includes saved LLM artifacts before highlight blocks', () => {
      const exportable = toExportableHighlight(hl())!;
      const result = buildExport(
        [exportable],
        { kind: 'section', domain: 'wikipedia.org', sectionKey: '/wiki/Antigravity' },
        {
          sectionSummary: {
            id: 'sum-1',
            kind: 'section_summary',
            scope: { kind: 'section', domain: 'wikipedia.org', sectionKey: '/wiki/Antigravity' },
            content: 'Section overview from LLM.',
            highlightCountAtGeneration: 1,
            createdAt: '2026-06-13T00:00:00.000Z',
            updatedAt: '2026-06-13T00:00:00.000Z',
          },
          scopeQueries: [{
            id: 'q-1',
            kind: 'scope_query',
            scope: { kind: 'section', domain: 'wikipedia.org', sectionKey: '/wiki/Antigravity' },
            question: 'What is antigravity?',
            content: 'The highlights discuss fictional antigravity.',
            highlightCountAtGeneration: 1,
            createdAt: '2026-06-13T00:00:00.000Z',
            updatedAt: '2026-06-13T00:00:00.000Z',
          }],
        },
      );
      expect(result.markdown).toContain('## Summary');
      expect(result.markdown).toContain('Section overview from LLM.');
      expect(result.markdown).toContain('## Questions');
      expect(result.markdown).toContain('### Q: What is antigravity?');
      expect(result.markdown).toContain('**1.**');
    });
  });

  describe('buildFilename', () => {
    it('sanitizes section keys', () => {
      expect(
        buildFilename({
          kind: 'section',
          domain: 'example.com',
          sectionKey: '/wiki/Antigravity',
        }),
      ).toBe('wiki-Antigravity.md');
    });

    it('uses xlsx extension when requested', () => {
      expect(buildFilename({ kind: 'library' }, 'xlsx')).toMatch(
        /underscore-highlights-\d{4}-\d{2}-\d{2}\.xlsx$/,
      );
    });
  });

  describe('buildXlsxExport', () => {
    it('produces a spreadsheet buffer with highlight rows', () => {
      const exportable = toExportableHighlight(hl())!;
      const result = buildXlsxExport([exportable], { kind: 'library' });
      expect(result.format).toBe('xlsx');
      expect(result.filename).toMatch(/\.xlsx$/);
      expect(result.xlsxBuffer).toBeInstanceOf(ArrayBuffer);
      expect(result.xlsxBuffer!.byteLength).toBeGreaterThan(0);
    });
  });
});
