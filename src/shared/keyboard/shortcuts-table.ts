/**
 * Read-only product keyboard shortcuts (extension content + Settings table).
 */

export type ShortcutPlatform = 'mac' | 'other';

export type ShortcutRow = {
  id: string;
  action: string;
  /** Platform-specific chord label */
  shortcut: string;
  destructive?: boolean;
  note?: string;
};

function mod(platform: ShortcutPlatform): string {
  return platform === 'mac' ? '⌘' : 'Ctrl';
}

export function detectShortcutPlatform(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
): ShortcutPlatform {
  return /Mac|iPhone|iPad|iPod/i.test(ua) ? 'mac' : 'other';
}

export function buildShortcutsTable(
  platform: ShortcutPlatform = detectShortcutPlatform(),
): ShortcutRow[] {
  const m = mod(platform);
  return [
    {
      id: 'highlight',
      action: 'Highlight selection',
      shortcut: `${m}+U`,
    },
    {
      id: 'undo',
      action: 'Undo',
      shortcut: `${m}+Z`,
    },
    {
      id: 'redo',
      action: 'Redo',
      shortcut: platform === 'mac' ? `⌘+Shift+Z` : `Ctrl+Shift+Z · Ctrl+Y`,
    },
    {
      id: 'clear-page',
      action: 'Clear highlights on this page',
      shortcut: `${m}+Shift+U`,
      destructive: true,
      note: 'Removes paint on this page; storage rules unchanged.',
    },
    {
      id: 'delete-click',
      action: 'Delete highlight',
      shortcut: `${m}+Click on highlight`,
    },
    {
      id: 'show-delete',
      action: 'Show delete control',
      shortcut: 'Click highlight',
    },
    {
      id: 'dismiss-delete',
      action: 'Dismiss delete control',
      shortcut: 'Click outside · Esc',
    },
  ];
}

/** Empty-state / first-run keyboard hint — matches real highlight chord. */
export function highlightKeyboardHint(
  platform: ShortcutPlatform = detectShortcutPlatform(),
): string {
  return `Select text · press ${mod(platform)}+U`;
}
