import { describe, it, expect, beforeEach, vi } from 'vitest';

import { getHighlightsInRange } from '@/content/utils/get-highlights-in-range';

describe('getHighlightsInRange', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>alpha beta gamma</p>';
  });

  it('ignores storage-shaped highlights that have no liveRanges', () => {
    const textNode = document.body.firstChild!.firstChild as Text;
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    const sel = document.createRange();
    sel.setStart(textNode, 0);
    sel.setEnd(textNode, 5);
    selection.addRange(sel);

    expect(getHighlightsInRange(selection, [{ id: 'hl-1' }])).toHaveLength(0);
  });

  it('returns highlights whose liveRanges overlap the selection', () => {
    const textNode = document.body.firstChild!.firstChild as Text;
    const live = document.createRange();
    live.setStart(textNode, 0);
    live.setEnd(textNode, 5);

    // jsdom Range.compareBoundaryPoints is unreliable for text offsets;
    // stub to the browser semantics for this fixture (ranges overlap).
    vi.spyOn(live, 'compareBoundaryPoints').mockImplementation((how) => {
      if (how === Range.END_TO_START) return 1;
      if (how === Range.START_TO_END) return -1;
      return 0;
    });

    const selection = window.getSelection()!;
    selection.removeAllRanges();
    const sel = document.createRange();
    sel.setStart(textNode, 2);
    sel.setEnd(textNode, 8);
    selection.addRange(sel);

    const hits = getHighlightsInRange(selection, [{ id: 'hl-1', liveRanges: [live] }]);
    expect(hits).toHaveLength(1);
    expect(hits[0]?.id).toBe('hl-1');
  });
});
