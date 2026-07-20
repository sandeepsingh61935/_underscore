import { describe, it, expect } from 'vitest';
import {
  resolveHighlightPresentation,
  applyPresentationToDisplaySource,
} from './highlight-presentation';

describe('resolveHighlightPresentation', () => {
  it('defaults to as_captured', () => {
    expect(resolveHighlightPresentation({})).toEqual({ format: 'as_captured' });
  });

  it('uses sourceKind code when no user presentation', () => {
    expect(resolveHighlightPresentation({ sourceKind: 'code', language: 'cpp' })).toEqual({
      format: 'code',
      language: 'cpp',
    });
  });

  it('user presentation wins over sourceKind', () => {
    expect(
      resolveHighlightPresentation({
        sourceKind: 'code',
        language: 'cpp',
        presentation: { format: 'bullets' },
      }),
    ).toEqual({ format: 'bullets', language: 'cpp' });
  });
});

describe('applyPresentationToDisplaySource', () => {
  it('wraps code for display', () => {
    expect(applyPresentationToDisplaySource('int x;', { format: 'code', language: 'cpp' })).toBe(
      '```cpp\nint x;\n```',
    );
  });

  it('formats bullets per line', () => {
    expect(applyPresentationToDisplaySource('a\nb', { format: 'bullets' })).toBe('- a\n- b');
  });

  it('formats numbered list', () => {
    expect(applyPresentationToDisplaySource('a\nb', { format: 'numbered' })).toBe('1. a\n2. b');
  });

  it('leaves as_captured unchanged', () => {
    expect(applyPresentationToDisplaySource('hello', { format: 'as_captured' })).toBe('hello');
  });
});
