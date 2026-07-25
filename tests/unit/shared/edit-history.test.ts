/**
 * @file edit-history.test.ts
 */
import { describe, expect, it } from 'vitest';

import {
  createEditHistory,
  pushEditHistory,
  redoEdit,
  undoEdit,
} from '@/shared/utils/edit-history';

describe('edit-history', () => {
  it('push then undo restores prior snapshot', () => {
    let h = createEditHistory();
    h = pushEditHistory(h, { text: 'a', selStart: 0, selEnd: 1 }, 'ab');
    const u = undoEdit(h, { text: 'ab', selStart: 2, selEnd: 2 });
    expect(u).not.toBeNull();
    expect(u!.snapshot).toEqual({ text: 'a', selStart: 0, selEnd: 1 });
    expect(u!.history.undo).toHaveLength(0);
    expect(u!.history.redo).toHaveLength(1);
  });

  it('redo restores after undo', () => {
    let h = createEditHistory();
    h = pushEditHistory(h, { text: 'a', selStart: 0, selEnd: 0 }, 'b');
    const u = undoEdit(h, { text: 'b', selStart: 1, selEnd: 1 })!;
    const r = redoEdit(u.history, u.snapshot)!;
    expect(r.snapshot.text).toBe('b');
    expect(r.history.redo).toHaveLength(0);
  });

  it('skips push when text unchanged', () => {
    let h = createEditHistory();
    h = pushEditHistory(h, { text: 'a', selStart: 0, selEnd: 0 }, 'a');
    expect(h.undo).toHaveLength(0);
  });

  it('new edit after undo clears redo', () => {
    let h = createEditHistory();
    h = pushEditHistory(h, { text: 'a', selStart: 0, selEnd: 0 }, 'b');
    const u = undoEdit(h, { text: 'b', selStart: 0, selEnd: 0 })!;
    h = pushEditHistory(u.history, u.snapshot, 'c');
    expect(h.redo).toHaveLength(0);
    expect(h.undo).toHaveLength(1);
  });

  it('caps undo depth', () => {
    let h = createEditHistory();
    for (let i = 0; i < 5; i++) {
      h = pushEditHistory(h, { text: String(i), selStart: 0, selEnd: 0 }, String(i + 1), 3);
    }
    expect(h.undo.length).toBe(3);
    expect(h.undo[0]?.text).toBe('2');
  });
});
