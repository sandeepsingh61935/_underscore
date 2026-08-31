import { describe, expect, it } from 'vitest';

import {
  buildShortcutsTable,
  detectShortcutPlatform,
  highlightKeyboardHint,
} from './shortcuts-table';

describe('detectShortcutPlatform', () => {
  it('detects mac', () => {
    expect(detectShortcutPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X)')).toBe('mac');
  });

  it('detects other', () => {
    expect(detectShortcutPlatform('Mozilla/5.0 (Windows NT 10.0)')).toBe('other');
  });
});

describe('buildShortcutsTable', () => {
  it('lists core actions with platform chords', () => {
    const mac = buildShortcutsTable('mac');
    expect(mac.find((r) => r.id === 'highlight')?.shortcut).toBe('⌘+U');
    expect(mac.find((r) => r.id === 'clear-page')?.destructive).toBe(true);
    expect(mac.find((r) => r.id === 'clear-page')?.note).toMatch(/page/i);

    const win = buildShortcutsTable('other');
    expect(win.find((r) => r.id === 'highlight')?.shortcut).toBe('Ctrl+U');
    expect(win.find((r) => r.id === 'redo')?.shortcut).toMatch(/Ctrl\+Y/);
  });

  it('has no rebinding fields — read-only rows', () => {
    const rows = buildShortcutsTable('other');
    expect(rows.every((r) => r.action && r.shortcut)).toBe(true);
    expect(rows.map((r) => r.id)).toContain('dismiss-delete');
  });
});

describe('highlightKeyboardHint', () => {
  it('uses real highlight chord not return key', () => {
    expect(highlightKeyboardHint('mac')).toBe('Select text · press ⌘+U');
    expect(highlightKeyboardHint('other')).toBe('Select text · press Ctrl+U');
    expect(highlightKeyboardHint('mac')).not.toMatch(/↩/);
  });
});
