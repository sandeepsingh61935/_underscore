import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  areChordsEqual,
  formatChord,
  matchesEvent,
  normalizeKey,
  parseChord,
} from './shortcut-chord';
import {
  detectActionConflict,
  isBrowserReserved,
  validateChord,
} from './shortcut-conflicts';
import {
  SHORTCUT_DEFINITIONS,
  getDefaultChord,
  getShortcutDefinition,
} from './shortcut-definitions';
import { ShortcutManager } from './shortcut-manager';
import type { IShortcutStorage } from './shortcut-storage';
import { parseOverridesSafe } from './shortcut-storage';

describe('shortcut-chord', () => {
  it('normalizes key names', () => {
    expect(normalizeKey('U')).toBe('u');
    expect(normalizeKey(' ')).toBe('space');
    expect(normalizeKey('Spacebar')).toBe('space');
    expect(normalizeKey('Esc')).toBe('escape');
  });

  it('checks chord equality', () => {
    expect(
      areChordsEqual({ key: 'u', ctrlOrMeta: true }, { key: 'U', ctrlOrMeta: true })
    ).toBe(true);
    expect(
      areChordsEqual(
        { key: 'u', ctrlOrMeta: true, shift: true },
        { key: 'u', ctrlOrMeta: true, shift: false }
      )
    ).toBe(false);
  });

  it('formats chord for mac and other platforms', () => {
    const chord = { key: 'u', ctrlOrMeta: true, shift: true };
    expect(formatChord(chord, 'mac')).toBe('⌘+Shift+U');
    expect(formatChord(chord, 'other')).toBe('Ctrl+Shift+U');

    const altChord = { key: 'k', ctrlOrMeta: true, alt: true };
    expect(formatChord(altChord, 'mac')).toBe('⌘+⌥+K');
    expect(formatChord(altChord, 'other')).toBe('Ctrl+Alt+K');
  });

  it('matches KeyboardEvent accurately', () => {
    const chord = { key: 'u', ctrlOrMeta: true };

    // Matches with ctrlKey on non-mac
    const winEvent = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      metaKey: false,
      shiftKey: false,
    });
    expect(matchesEvent(chord, winEvent)).toBe(true);

    // Matches with metaKey on mac
    const macEvent = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: false,
      metaKey: true,
      shiftKey: false,
    });
    expect(matchesEvent(chord, macEvent)).toBe(true);

    // Fails if shift is pressed but not requested
    const shiftEvent = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      shiftKey: true,
    });
    expect(matchesEvent(chord, shiftEvent)).toBe(false);

    // Matches via event.code fallback (e.g. Layout independence)
    const codeEvent = new KeyboardEvent('keydown', {
      key: 'г', // Russian layout for U
      code: 'KeyU',
      ctrlKey: true,
      shiftKey: false,
    });
    expect(matchesEvent(chord, codeEvent)).toBe(true);
  });

  it('parses chord strings correctly', () => {
    expect(parseChord('Ctrl+Shift+U')).toEqual({
      key: 'u',
      ctrlOrMeta: true,
      shift: true,
    });
    expect(parseChord('⌘+⌥+K')).toEqual({
      key: 'k',
      ctrlOrMeta: true,
      alt: true,
    });
    expect(parseChord('')).toBeNull();
  });
});

describe('shortcut-definitions', () => {
  it('contains highlight, undo, redo, and clear-page as customizable', () => {
    const highlight = getShortcutDefinition('highlight');
    expect(highlight?.customizable).toBe(true);
    expect(highlight?.defaultChord).toEqual({ ctrlOrMeta: true, key: 'u' });

    const undo = getShortcutDefinition('undo');
    expect(undo?.customizable).toBe(true);
    expect(getDefaultChord('undo')).toEqual({ ctrlOrMeta: true, key: 'z' });

    const redo = getShortcutDefinition('redo');
    expect(redo?.secondaryDefaultChord).toEqual({ ctrlOrMeta: true, key: 'y' });
  });

  it('marks mouse actions as non-customizable', () => {
    const deleteClick = getShortcutDefinition('delete-click');
    expect(deleteClick?.customizable).toBe(false);
  });
});

describe('shortcut-conflicts', () => {
  it('detects browser reserved chords', () => {
    expect(isBrowserReserved({ key: 'w', ctrlOrMeta: true })).toBe(true);
    expect(isBrowserReserved({ key: 't', ctrlOrMeta: true })).toBe(true);
    expect(isBrowserReserved({ key: 'u', ctrlOrMeta: true })).toBe(false);
  });

  it('detects conflicts with other assigned shortcuts', () => {
    const current = {
      highlight: { key: 'u', ctrlOrMeta: true },
      undo: { key: 'z', ctrlOrMeta: true },
    };

    const conflict = detectActionConflict(
      'undo',
      { key: 'u', ctrlOrMeta: true },
      current
    );
    expect(conflict?.conflictingId).toBe('highlight');
  });

  it('validates proposed chords completely', () => {
    const current = {
      highlight: { key: 'u', ctrlOrMeta: true },
      undo: { key: 'z', ctrlOrMeta: true },
    };

    // Missing modifier
    expect(validateChord('clear-page', { key: 'k' }, current).valid).toBe(false);

    // Browser reserved
    expect(
      validateChord('clear-page', { key: 'w', ctrlOrMeta: true }, current).valid
    ).toBe(false);

    // Conflict
    expect(
      validateChord('clear-page', { key: 'u', ctrlOrMeta: true }, current).valid
    ).toBe(false);

    // Valid
    expect(
      validateChord('clear-page', { key: 'k', ctrlOrMeta: true, alt: true }, current)
        .valid
    ).toBe(true);
  });
});

describe('shortcut-storage', () => {
  it('parses valid overrides safely', () => {
    const valid = {
      highlight: { key: 'h', ctrlOrMeta: true },
      undo: { key: 'z', ctrlOrMeta: true, shift: true },
    };
    expect(parseOverridesSafe(valid)).toEqual(valid);

    const invalid = { highlight: { notAKey: 123 } };
    expect(parseOverridesSafe(invalid)).toEqual({});
    expect(parseOverridesSafe(null)).toEqual({});
  });
});

describe('ShortcutManager', () => {
  class MockStorage implements IShortcutStorage {
    overrides: Record<string, any> = {};
    listeners: Set<(o: any) => void> = new Set();

    async getOverrides() {
      return this.overrides;
    }
    async setOverride(id: string, chord: any) {
      this.overrides[id] = chord;
      this.listeners.forEach((l) => l(this.overrides));
    }
    async resetOverride(id: string) {
      delete this.overrides[id];
      this.listeners.forEach((l) => l(this.overrides));
    }
    async resetAll() {
      this.overrides = {};
      this.listeners.forEach((l) => l(this.overrides));
    }
    onChange(cb: (o: any) => void) {
      this.listeners.add(cb);
      return () => this.listeners.delete(cb);
    }
  }

  let mockStorage: MockStorage;
  let manager: ShortcutManager;

  beforeEach(async () => {
    mockStorage = new MockStorage();
    manager = new ShortcutManager(SHORTCUT_DEFINITIONS, mockStorage);
    await manager.init();
  });

  it('triggers registered handler on matching keydown event', () => {
    const handler = vi.fn();
    manager.on('highlight', handler);

    const div = document.createElement('div');
    manager.bind(div);

    const event = new KeyboardEvent('keydown', {
      key: 'u',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    div.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);
    expect(event.defaultPrevented).toBe(true);

    manager.destroy();
  });

  it('supports secondary chord like Ctrl+Y for Redo', () => {
    const handler = vi.fn();
    manager.on('redo', handler);

    const div = document.createElement('div');
    manager.bind(div);

    const event = new KeyboardEvent('keydown', {
      key: 'y',
      ctrlKey: true,
      bubbles: true,
      cancelable: true,
    });
    div.dispatchEvent(event);

    expect(handler).toHaveBeenCalledTimes(1);

    manager.destroy();
  });

  it('hot-reloads when storage changes', async () => {
    const handler = vi.fn();
    manager.on('highlight', handler);

    const div = document.createElement('div');
    manager.bind(div);

    // Default Ctrl+U works
    div.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'u',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(handler).toHaveBeenCalledTimes(1);

    // Override to Ctrl+H
    await mockStorage.setOverride('highlight', { key: 'h', ctrlOrMeta: true });

    // Old chord does not trigger
    div.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'u',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(handler).toHaveBeenCalledTimes(1);

    // New chord triggers
    div.dispatchEvent(
      new KeyboardEvent('keydown', {
        key: 'h',
        ctrlKey: true,
        bubbles: true,
        cancelable: true,
      })
    );
    expect(handler).toHaveBeenCalledTimes(2);

    manager.destroy();
  });
});
