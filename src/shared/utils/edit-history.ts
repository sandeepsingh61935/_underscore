/**
 * Pure undo/redo stacks for the highlight markdown editor draft.
 */

export interface EditSnapshot {
  text: string;
  selStart: number;
  selEnd: number;
}

export interface EditHistory {
  undo: EditSnapshot[];
  redo: EditSnapshot[];
}

export const EMPTY_EDIT_HISTORY: EditHistory = { undo: [], redo: [] };

const DEFAULT_MAX_DEPTH = 100;

export function createEditHistory(): EditHistory {
  return { undo: [], redo: [] };
}

/**
 * Record `current` before applying a new draft. Clears redo.
 * Skips push when text is unchanged (selection-only moves).
 */
export function pushEditHistory(
  history: EditHistory,
  current: EditSnapshot,
  nextText: string,
  maxDepth: number = DEFAULT_MAX_DEPTH,
): EditHistory {
  if (current.text === nextText) {
    return history;
  }
  const undo = [...history.undo, current];
  while (undo.length > maxDepth) {
    undo.shift();
  }
  return { undo, redo: [] };
}

export function undoEdit(
  history: EditHistory,
  current: EditSnapshot,
): { history: EditHistory; snapshot: EditSnapshot } | null {
  if (history.undo.length === 0) return null;
  const undo = history.undo.slice();
  const snapshot = undo.pop()!;
  const redo = [...history.redo, current];
  return { history: { undo, redo }, snapshot };
}

export function redoEdit(
  history: EditHistory,
  current: EditSnapshot,
): { history: EditHistory; snapshot: EditSnapshot } | null {
  if (history.redo.length === 0) return null;
  const redo = history.redo.slice();
  const snapshot = redo.pop()!;
  const undo = [...history.undo, current];
  return { history: { undo, redo }, snapshot };
}
