import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { Chord } from '@/shared/keyboard/shortcut-chord';
import { SettingsKeyboardSection } from './SettingsKeyboardSection';
import { ShortcutChordInput } from './ShortcutChordInput';

describe('ShortcutChordInput', () => {
  it('renders read-only badge for non-customizable shortcuts', () => {
    render(
      <ShortcutChordInput
        id="delete-click"
        action="Delete highlight"
        shortcut="Ctrl+Click on highlight"
        customizable={false}
        allChords={{}}
        platform="other"
        onSave={async () => {}}
        onReset={async () => {}}
      />
    );

    expect(screen.queryByTestId('shortcut-edit-btn-delete-click')).toBeNull();
    expect(screen.getByText('Ctrl')).toBeTruthy();
  });

  it('enters recording mode when clicked, and cancels on Escape', () => {
    render(
      <ShortcutChordInput
        id="highlight"
        action="Highlight selection"
        shortcut="Ctrl+U"
        customizable={true}
        allChords={{ highlight: { key: 'u', ctrlOrMeta: true } }}
        platform="other"
        onSave={async () => {}}
        onReset={async () => {}}
      />
    );

    const editBtn = screen.getByTestId('shortcut-edit-btn-highlight');
    fireEvent.click(editBtn);

    expect(screen.getByText('Press keys…')).toBeTruthy();

    // Press Escape
    fireEvent.keyDown(window, { key: 'Escape' });

    // Should return to non-recording state
    expect(screen.queryByText('Press keys…')).toBeNull();
  });

  it('captures valid new chord and calls onSave', async () => {
    let savedChord: Chord | null = null;

    render(
      <ShortcutChordInput
        id="highlight"
        action="Highlight selection"
        shortcut="Ctrl+U"
        customizable={true}
        allChords={{ highlight: { key: 'u', ctrlOrMeta: true } }}
        platform="other"
        onSave={async (_id, chord) => {
          savedChord = chord;
        }}
        onReset={async () => {}}
      />
    );

    const editBtn = screen.getByTestId('shortcut-edit-btn-highlight');
    fireEvent.click(editBtn);

    // Press Ctrl+H
    fireEvent.keyDown(window, { key: 'h', ctrlKey: true });

    await waitFor(() => {
      expect(savedChord).toEqual({ key: 'h', ctrlOrMeta: true });
    });
  });

  it('warns on browser-reserved shortcut', () => {
    render(
      <ShortcutChordInput
        id="highlight"
        action="Highlight selection"
        shortcut="Ctrl+U"
        customizable={true}
        allChords={{ highlight: { key: 'u', ctrlOrMeta: true } }}
        platform="other"
        onSave={async () => {}}
        onReset={async () => {}}
      />
    );

    const editBtn = screen.getByTestId('shortcut-edit-btn-highlight');
    fireEvent.click(editBtn);

    // Press Ctrl+W (browser tab close)
    fireEvent.keyDown(window, { key: 'w', ctrlKey: true });

    expect(screen.getByRole('alert')).toHaveTextContent(/reserved by the browser/i);
  });

  it('warns on conflict with another shortcut', () => {
    render(
      <ShortcutChordInput
        id="highlight"
        action="Highlight selection"
        shortcut="Ctrl+U"
        customizable={true}
        allChords={{
          highlight: { key: 'u', ctrlOrMeta: true },
          undo: { key: 'z', ctrlOrMeta: true },
        }}
        platform="other"
        onSave={async () => {}}
        onReset={async () => {}}
      />
    );

    const editBtn = screen.getByTestId('shortcut-edit-btn-highlight');
    fireEvent.click(editBtn);

    // Try to bind Ctrl+Z to highlight
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(screen.getByRole('alert')).toHaveTextContent(/conflicts with "undo"/i);
  });
});

describe('SettingsKeyboardSection', () => {
  it('renders all shortcut rows correctly', () => {
    render(<SettingsKeyboardSection />);

    expect(screen.getByTestId('settings-section-keyboard')).toBeTruthy();
    expect(screen.getByTestId('settings-shortcuts-table')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-highlight')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-undo')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-redo')).toBeTruthy();
    expect(screen.getByTestId('shortcut-row-clear-page')).toBeTruthy();
  });
});
