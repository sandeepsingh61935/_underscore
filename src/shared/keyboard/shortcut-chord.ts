import { z } from 'zod';

export type ShortcutPlatform = 'mac' | 'other';

export interface Chord {
  key: string;
  ctrlOrMeta?: boolean;
  shift?: boolean;
  alt?: boolean;
}

export const ChordSchema = z.object({
  key: z.string().min(1),
  ctrlOrMeta: z.boolean().optional(),
  shift: z.boolean().optional(),
  alt: z.boolean().optional(),
});

export const ShortcutOverridesSchema = z.record(z.string(), ChordSchema);

export type ShortcutOverrides = z.infer<typeof ShortcutOverridesSchema>;

export function detectShortcutPlatform(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''
): ShortcutPlatform {
  return /Mac|iPhone|iPad|iPod/i.test(ua) ? 'mac' : 'other';
}

export function normalizeKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower === ' ' || lower === 'spacebar') return 'space';
  if (lower === 'esc') return 'escape';
  return lower;
}

export function areChordsEqual(a: Chord, b: Chord): boolean {
  return (
    normalizeKey(a.key) === normalizeKey(b.key) &&
    Boolean(a.ctrlOrMeta) === Boolean(b.ctrlOrMeta) &&
    Boolean(a.shift) === Boolean(b.shift) &&
    Boolean(a.alt) === Boolean(b.alt)
  );
}

export function matchesEvent(chord: Chord, event: KeyboardEvent): boolean {
  const normKey = normalizeKey(chord.key);
  const eventNormKey = normalizeKey(event.key);

  const keyMatches =
    eventNormKey === normKey ||
    (normKey.length === 1 &&
      Boolean(event.code) &&
      event.code.toLowerCase() === `key${normKey}`);

  if (!keyMatches) return false;

  const hasMod = Boolean(event.ctrlKey || event.metaKey);
  const wantsMod = Boolean(chord.ctrlOrMeta);
  if (hasMod !== wantsMod) return false;

  if (Boolean(event.shiftKey) !== Boolean(chord.shift)) return false;
  if (Boolean(event.altKey) !== Boolean(chord.alt)) return false;

  return true;
}

export function formatKeyName(
  key: string,
  platform: ShortcutPlatform = detectShortcutPlatform()
): string {
  const norm = normalizeKey(key);
  if (norm === 'escape') return 'Esc';
  if (norm === 'space') return 'Space';
  if (norm === 'enter') return platform === 'mac' ? 'Return' : 'Enter';
  if (norm === 'backspace') return platform === 'mac' ? 'Delete' : 'Backspace';
  if (norm === 'delete') return platform === 'mac' ? 'Del' : 'Del';
  if (norm === 'arrowup') return '↑';
  if (norm === 'arrowdown') return '↓';
  if (norm === 'arrowleft') return '←';
  if (norm === 'arrowright') return '→';
  return norm.toUpperCase();
}

export function formatChord(
  chord: Chord,
  platform: ShortcutPlatform = detectShortcutPlatform()
): string {
  const parts: string[] = [];
  const isMac = platform === 'mac';

  if (chord.ctrlOrMeta) {
    parts.push(isMac ? '⌘' : 'Ctrl');
  }
  if (chord.alt) {
    parts.push(isMac ? '⌥' : 'Alt');
  }
  if (chord.shift) {
    parts.push('Shift');
  }

  parts.push(formatKeyName(chord.key, platform));

  return parts.join('+');
}

export function parseChord(chordStr: string): Chord | null {
  if (!chordStr || typeof chordStr !== 'string') return null;

  const tokens = chordStr
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean);

  if (tokens.length === 0) return null;

  let ctrlOrMeta = false;
  let shift = false;
  let alt = false;
  let key = '';

  for (const token of tokens) {
    const lower = token.toLowerCase();
    if (
      lower === 'ctrl' ||
      lower === 'control' ||
      lower === 'cmd' ||
      lower === 'command' ||
      token === '⌘'
    ) {
      ctrlOrMeta = true;
    } else if (lower === 'shift') {
      shift = true;
    } else if (
      lower === 'alt' ||
      lower === 'opt' ||
      lower === 'option' ||
      token === '⌥'
    ) {
      alt = true;
    } else {
      key = normalizeKey(token);
    }
  }

  if (!key) return null;

  return {
    key,
    ...(ctrlOrMeta ? { ctrlOrMeta: true } : {}),
    ...(shift ? { shift: true } : {}),
    ...(alt ? { alt: true } : {}),
  };
}
