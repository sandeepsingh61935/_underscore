import type { Chord, ShortcutPlatform } from './shortcut-chord';
import { areChordsEqual, formatChord, normalizeKey } from './shortcut-chord';
import { SHORTCUT_DEFINITIONS } from './shortcut-definitions';

export interface ShortcutConflict {
  conflictingId: string;
  conflictingAction: string;
  chord: Chord;
}

export interface ValidationResult {
  valid: boolean;
  error?: string;
  conflict?: ShortcutConflict;
}

const BROWSER_RESERVED_KEYS: Array<{
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
}> = [
  { key: 'w', ctrlOrMeta: true }, // Close tab
  { key: 't', ctrlOrMeta: true }, // New tab
  { key: 't', ctrlOrMeta: true, shift: true }, // Reopen tab
  { key: 'n', ctrlOrMeta: true }, // New window
  { key: 'n', ctrlOrMeta: true, shift: true }, // New private window
  { key: 'q', ctrlOrMeta: true }, // Quit browser
  { key: 'r', ctrlOrMeta: true }, // Reload
  { key: 'r', ctrlOrMeta: true, shift: true }, // Hard reload
  { key: 'p', ctrlOrMeta: true }, // Print
  { key: 'o', ctrlOrMeta: true }, // Open file
  { key: 's', ctrlOrMeta: true }, // Save page
  { key: 'tab', ctrlOrMeta: true }, // Switch tab
  { key: 'tab', ctrlOrMeta: true, shift: true }, // Switch tab reverse
];

export function isBrowserReserved(chord: Chord): boolean {
  const normKey = normalizeKey(chord.key);
  return BROWSER_RESERVED_KEYS.some(
    (reserved) =>
      normalizeKey(reserved.key) === normKey &&
      Boolean(reserved.ctrlOrMeta) === Boolean(chord.ctrlOrMeta) &&
      Boolean(reserved.shift) === Boolean(chord.shift) &&
      Boolean(reserved.alt) === Boolean(chord.alt)
  );
}

export function detectActionConflict(
  targetId: string,
  chord: Chord,
  currentChords: Record<string, Chord>
): ShortcutConflict | null {
  for (const [id, assignedChord] of Object.entries(currentChords)) {
    if (id === targetId) continue;
    if (areChordsEqual(assignedChord, chord)) {
      const def = SHORTCUT_DEFINITIONS.find((d) => d.id === id);
      return {
        conflictingId: id,
        conflictingAction: def?.action ?? id,
        chord,
      };
    }
  }
  return null;
}

export function validateChord(
  targetId: string,
  chord: Chord,
  currentChords: Record<string, Chord>,
  platform?: ShortcutPlatform
): ValidationResult {
  if (!chord.key || chord.key.trim() === '') {
    return { valid: false, error: 'A key is required' };
  }

  // Modifiers check: at least one modifier is recommended to avoid intercepting regular typing
  if (!chord.ctrlOrMeta && !chord.alt) {
    return {
      valid: false,
      error:
        'Shortcut must include a modifier (Ctrl, ⌘, or Alt) to avoid blocking typing',
    };
  }

  if (isBrowserReserved(chord)) {
    return {
      valid: false,
      error: `${formatChord(chord, platform)} is reserved by the browser`,
    };
  }

  const conflict = detectActionConflict(targetId, chord, currentChords);
  if (conflict) {
    return {
      valid: false,
      error: `Conflicts with "${conflict.conflictingAction}"`,
      conflict,
    };
  }

  return { valid: true };
}
