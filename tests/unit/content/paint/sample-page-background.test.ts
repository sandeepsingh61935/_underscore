import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { sampleBackgroundNearRange } from '@/content/paint/sample-page-background';

describe('sampleBackgroundNearRange', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('walks past transparent parent to colored grandparent', () => {
    document.body.innerHTML = `
      <div id="grand" style="background-color: rgb(10, 20, 30)">
        <div id="parent" style="background-color: transparent">
          <span id="t">hello</span>
        </div>
      </div>
    `;
    const span = document.getElementById('t')!;
    const text = span.firstChild as Text;
    const range = document.createRange();
    range.setStart(text, 0);
    range.setEnd(text, 5);

    // jsdom getComputedStyle may not honor inline styles fully — mock
    const grand = document.getElementById('grand')!;
    const parent = document.getElementById('parent')!;
    vi.spyOn(window, 'getComputedStyle').mockImplementation((el) => {
      if (el === parent) {
        return { backgroundColor: 'rgba(0, 0, 0, 0)' } as CSSStyleDeclaration;
      }
      if (el === grand) {
        return { backgroundColor: 'rgb(10, 20, 30)' } as CSSStyleDeclaration;
      }
      if (el === span) {
        return { backgroundColor: 'rgba(0, 0, 0, 0)' } as CSSStyleDeclaration;
      }
      return { backgroundColor: 'rgb(255, 255, 255)' } as CSSStyleDeclaration;
    });

    expect(sampleBackgroundNearRange(range)).toBe('rgb(10, 20, 30)');
  });
});
