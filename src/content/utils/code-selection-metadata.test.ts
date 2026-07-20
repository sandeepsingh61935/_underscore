/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectCodeSelectionMetadata,
  extractCodeLanguage,
} from './code-selection-metadata';

describe('extractCodeLanguage', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('reads language-* class on code', () => {
    document.body.innerHTML = '<pre><code class="language-cpp">int x;</code></pre>';
    const code = document.querySelector('code')!;
    expect(extractCodeLanguage(code)).toBe('cpp');
  });

  it('reads data-lang', () => {
    document.body.innerHTML = '<pre data-lang="python"><code>print(1)</code></pre>';
    const pre = document.querySelector('pre')!;
    expect(extractCodeLanguage(pre)).toBe('python');
  });
});

describe('detectCodeSelectionMetadata', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('returns sourceKind code when selection is inside pre', () => {
    document.body.innerHTML = '<pre><code class="language-js">const a = 1;</code></pre>';
    const code = document.querySelector('code')!;
    const range = document.createRange();
    range.selectNodeContents(code);
    expect(detectCodeSelectionMetadata(range)).toEqual({
      sourceKind: 'code',
      language: 'js',
    });
  });

  it('returns undefined for prose paragraph', () => {
    document.body.innerHTML = '<p id="p">Hello world</p>';
    const p = document.getElementById('p')!;
    const range = document.createRange();
    range.selectNodeContents(p);
    expect(detectCodeSelectionMetadata(range)).toBeUndefined();
  });
});
