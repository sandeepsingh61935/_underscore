import type { Chord, ShortcutPlatform } from './shortcut-chord';
import { formatChord } from './shortcut-chord';

export type ShortcutCategory = 'highlighting' | 'editing' | 'navigation';

export interface ShortcutDefinition {
  id: string;
  action: string;
  category: ShortcutCategory;
  defaultChord?: Chord;
  secondaryDefaultChord?: Chord;
  customizable: boolean;
  destructive?: boolean;
  note?: string;
  /** Non-customizable actions that describe mouse / system interactions */
  nonKeyboardDescription?: (platform: ShortcutPlatform) => string;
}

export const SHORTCUT_DEFINITIONS: ShortcutDefinition[] = [
  {
    id: 'highlight',
    action: 'Highlight selection',
    category: 'highlighting',
    defaultChord: { ctrlOrMeta: true, key: 'u' },
    customizable: true,
  },
  {
    id: 'undo',
    action: 'Undo',
    category: 'editing',
    defaultChord: { ctrlOrMeta: true, key: 'z' },
    customizable: true,
  },
  {
    id: 'redo',
    action: 'Redo',
    category: 'editing',
    defaultChord: { ctrlOrMeta: true, shift: true, key: 'z' },
    secondaryDefaultChord: { ctrlOrMeta: true, key: 'y' },
    customizable: true,
  },
  {
    id: 'clear-page',
    action: 'Clear highlights on this page',
    category: 'editing',
    defaultChord: { ctrlOrMeta: true, shift: true, key: 'u' },
    destructive: true,
    note: 'Removes paint on this page; storage rules unchanged.',
    customizable: true,
  },
  {
    id: 'delete-click',
    action: 'Delete highlight',
    category: 'highlighting',
    customizable: false,
    nonKeyboardDescription: (platform) =>
      `${platform === 'mac' ? '⌘' : 'Ctrl'}+Click on highlight`,
  },
  {
    id: 'show-delete',
    action: 'Show delete control',
    category: 'highlighting',
    customizable: false,
    nonKeyboardDescription: () => 'Click highlight',
  },
  {
    id: 'dismiss-delete',
    action: 'Dismiss delete control',
    category: 'highlighting',
    customizable: false,
    nonKeyboardDescription: () => 'Esc · Click outside',
  },
];

export function getShortcutDefinition(id: string): ShortcutDefinition | undefined {
  return SHORTCUT_DEFINITIONS.find((def) => def.id === id);
}

export function getDefaultChord(id: string): Chord | undefined {
  return getShortcutDefinition(id)?.defaultChord;
}

export function formatDefaultShortcut(
  def: ShortcutDefinition,
  platform: ShortcutPlatform
): string {
  if (def.nonKeyboardDescription) {
    return def.nonKeyboardDescription(platform);
  }

  if (!def.defaultChord) return '';

  const primary = formatChord(def.defaultChord, platform);
  if (def.secondaryDefaultChord && platform === 'other') {
    return `${primary} · ${formatChord(def.secondaryDefaultChord, platform)}`;
  }
  return primary;
}
