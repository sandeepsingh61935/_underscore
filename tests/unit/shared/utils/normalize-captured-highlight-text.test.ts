/**
 * @file normalize-captured-highlight-text.test.ts
 * @description Capture-time body normalizer (Approach A) for transcript/DOM junk.
 */
import { describe, expect, it } from 'vitest';

import {
  looksLikeFencedMarkdown,
  normalizeCapturedHighlightText,
  softTrimCapturedText,
} from '@/shared/utils/normalize-captured-highlight-text';

describe('normalizeCapturedHighlightText', () => {
  it('flattens pretty-printed multi-segment transcript DOM text', () => {
    const raw = `
  
    0:00
    In this video we explore how propaganda films
  
  

    0:05
    shaped public opinion during wartime.
  
  

    0:10
    The director used montage to create emotion.
  
`;
    expect(normalizeCapturedHighlightText(raw)).toBe(
      '0:00 In this video we explore how propaganda films 0:05 shaped public opinion during wartime. 0:10 The director used montage to create emotion.',
    );
  });

  it('joins screenshot-like short segments and glues leading commas', () => {
    const raw = `0:00
In a time of total war
,  the film
,  to
,  to`;
    expect(normalizeCapturedHighlightText(raw)).toBe(
      '0:00 In a time of total war, the film, to, to',
    );
  });

  it('removes 4-space indent that would become CommonMark code blocks', () => {
    const raw = `0:00
In a time of total war

    ,  the film
    ,  to`;
    const out = normalizeCapturedHighlightText(raw);
    expect(out).toBe('0:00 In a time of total war, the film, to');
    expect(out).not.toMatch(/^ {4,}/m);
    expect(out).not.toContain('\n');
  });

  it('collapses HTML source indent inside a single paragraph capture', () => {
    const raw = `
        Hello world this is
        a sentence with
        lots of indent from HTML source
`;
    expect(normalizeCapturedHighlightText(raw)).toBe(
      'Hello world this is a sentence with lots of indent from HTML source',
    );
  });

  it('joins word-per-line spans', () => {
    const raw = `
  The
  quick
  brown
  fox
`;
    expect(normalizeCapturedHighlightText(raw)).toBe('The quick brown fox');
  });

  it('leaves a clean single sentence unchanged', () => {
    const s = 'In a time of total war, the film shaped opinion.';
    expect(normalizeCapturedHighlightText(s)).toBe(s);
  });

  it('preserves intentional fenced code structure', () => {
    const fenced = '```js\nfunction hi() {\n  return 1;\n}\n```';
    expect(normalizeCapturedHighlightText(fenced)).toBe(fenced);
  });

  it('preserves mid-body fences (trim ends only)', () => {
    const src = '\nSee this:\n\n```\nint x = 1;\n```\n\nDone.\n';
    expect(normalizeCapturedHighlightText(src)).toBe(
      'See this:\n\n```\nint x = 1;\n```\n\nDone.',
    );
  });

  it('keeps inline backticks in prose', () => {
    expect(normalizeCapturedHighlightText('use the `code` keyword in docs')).toBe(
      'use the `code` keyword in docs',
    );
  });

  it('collapses NBSP and unicode spaces', () => {
    expect(normalizeCapturedHighlightText('hello\u00A0\u00A0world\n\u00A0next')).toBe(
      'hello world next',
    );
  });

  it('normalizes CRLF', () => {
    expect(normalizeCapturedHighlightText('a\r\nb\r\n  c')).toBe('a b c');
  });

  it('returns empty for whitespace-only input', () => {
    expect(normalizeCapturedHighlightText('  \n  \n')).toBe('');
  });

  it('handles 200 segment lines without newlines', () => {
    const many = Array.from({ length: 200 }, (_, i) => `    segment ${i} words here`).join(
      '\n\n',
    );
    const out = normalizeCapturedHighlightText(many);
    expect(out.startsWith('segment 0 words here segment 1')).toBe(true);
    expect(out.includes('\n')).toBe(false);
  });

  it('flattens list-like capture (known tradeoff for plain capture)', () => {
    expect(normalizeCapturedHighlightText('Features:\n- fast\n- offline')).toBe(
      'Features: - fast - offline',
    );
  });

  it('glues other leading punctuation without a space', () => {
    expect(normalizeCapturedHighlightText('wait\n… next')).toBe('wait… next');
    expect(normalizeCapturedHighlightText('see\n) end')).toBe('see) end');
    expect(normalizeCapturedHighlightText('end\n; more')).toBe('end; more');
  });

  it('flattens youtubetotranscript-style multi-blank indent capture (golden)', () => {
    // Real library body shape reported from extension UI after multi-segment select.
    const blank = '                      ';
    const pad = '                        ';
    const raw = [
      'finitum',
      blank,
      blank,
      blank,
      blank,
      `${pad}until he runs out of ink`,
      blank,
      blank,
      blank,
      blank,
      `${pad}his typical intellectual moves to break`,
      blank,
      blank,
      blank,
      blank,
      `${pad}things into three parts`,
      blank,
      blank,
      blank,
      blank,
      `${pad}and i guess you can go back and in a`,
      blank,
      blank,
      blank,
      blank,
      `${pad}pro-christian way kind of force this`,
      blank,
      blank,
      blank,
      blank,
      `${pad}into that`,
      blank,
      blank,
      blank,
      blank,
      `${pad}thesis antithesis mol`,
    ].join('\n');

    expect(normalizeCapturedHighlightText(raw)).toBe(
      'finitum until he runs out of ink his typical intellectual moves to break things into three parts and i guess you can go back and in a pro-christian way kind of force this into that thesis antithesis mol',
    );
  });
});

describe('softTrimCapturedText', () => {
  it('keeps internal indent for code captures', () => {
    const raw = '\nfunction x() {\n  return 1;\n}\n';
    expect(softTrimCapturedText(raw)).toBe('function x() {\n  return 1;\n}');
  });
});

describe('looksLikeFencedMarkdown', () => {
  it('detects opening fence', () => {
    expect(looksLikeFencedMarkdown('```js\ncode\n```')).toBe(true);
  });

  it('detects mid-body fence line', () => {
    expect(looksLikeFencedMarkdown('intro\n```\ncode\n```')).toBe(true);
  });

  it('does not treat inline ticks as fences', () => {
    expect(looksLikeFencedMarkdown('use `code` here')).toBe(false);
  });
});
