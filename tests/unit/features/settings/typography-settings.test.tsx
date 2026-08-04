import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, within } from '@testing-library/react';

import { TypographySettings } from '@/features/settings/components/TypographySettings';
import {
  resolveBuiltinTokens,
  type TypePresetSelection,
  type TypographyTokens,
} from '@/shared/constants/type-presets';

const setSelection = vi.fn(async (_next: TypePresetSelection) => undefined);
const resetToDefault = vi.fn(async () => undefined);

let mockSelection: TypePresetSelection = { kind: 'builtin', id: 'editorial' };
let mockDisplayName = 'Editorial';

vi.mock('@/ui-system/hooks/useTypePreset', () => ({
  useTypePreset: () => ({
    selection: mockSelection,
    tokens: resolveBuiltinTokens(
      mockSelection.kind === 'builtin' ? mockSelection.id : 'editorial'
    ),
    displayName: mockDisplayName,
    ready: true,
    setSelection,
    resetToDefault,
  }),
}));

vi.mock('@/shared/services/font-import-store', () => ({
  getFontFile: vi.fn(async () => null),
  storeFontFile: vi.fn(),
  deleteFontFile: vi.fn(),
}));

describe('TypographySettings', () => {
  beforeEach(() => {
    mockSelection = { kind: 'builtin', id: 'editorial' };
    mockDisplayName = 'Editorial';
    setSelection.mockClear();
    resetToDefault.mockClear();
  });

  it('shows collapsed summary with preset and serif face', () => {
    render(<TypographySettings expanded={false} onToggle={() => undefined} />);

    expect(screen.getByTestId('typography-summary').textContent).toBe(
      'Editorial · Source Serif 4'
    );
    expect(screen.queryByTestId('typography-panel')).toBeNull();
  });

  it('expands to reveal specimen, presets, roles, scale, spacing, margins, import, apply/reset', () => {
    render(<TypographySettings expanded onToggle={() => undefined} />);

    const panel = screen.getByTestId('typography-panel');
    expect(within(panel).getByTestId('type-specimen')).toBeTruthy();
    expect(within(panel).getByTestId('typography-preset-chips')).toBeTruthy();
    expect(within(panel).getByTestId('typography-role-tabs')).toBeTruthy();
    expect(within(panel).getByTestId('typography-role-serif')).toBeTruthy();
    expect(within(panel).getByTestId('typography-role-sans')).toBeTruthy();
    expect(within(panel).getByTestId('typography-role-mono')).toBeTruthy();
    expect(within(panel).getByText('Scale')).toBeTruthy();
    expect(within(panel).getByText('Spacing')).toBeTruthy();
    expect(within(panel).getByText('Margins')).toBeTruthy();
    expect(within(panel).getByText('Import fonts')).toBeTruthy();
    expect(within(panel).getByTestId('typography-apply').textContent).toBe('Apply');
    expect(within(panel).getByTestId('typography-reset').textContent).toBe('Reset');
  });

  it('applies a builtin preset via chip (live-apply)', () => {
    render(<TypographySettings expanded onToggle={() => undefined} />);

    fireEvent.click(screen.getByTestId('typography-preset-chip-modern'));

    expect(setSelection).toHaveBeenCalledWith({ kind: 'builtin', id: 'modern' });
  });

  it('switches font roles without applying', () => {
    render(<TypographySettings expanded onToggle={() => undefined} />);

    fireEvent.click(screen.getByTestId('typography-role-mono'));
    expect(setSelection).not.toHaveBeenCalled();

    const mono = screen.getByTestId('typography-role-mono');
    expect(mono.getAttribute('style') ?? '').toMatch(/accent|var\(--accent\)/);
  });

  it('marks draft custom when scale steps and Apply persists custom tokens', () => {
    render(<TypographySettings expanded onToggle={() => undefined} />);

    // Open Scale section (collapsed by default)
    fireEvent.click(screen.getByText('Scale'));

    const displayWheel = screen.getByRole('generic', {
      name: 'Display value. Click to arm, then scroll or use arrow keys.',
    });
    fireEvent.keyDown(displayWheel, { key: 'ArrowDown' });

    expect(screen.getByTestId('typography-custom-hint')).toBeTruthy();
    expect(screen.getByTestId('typography-summary').textContent).toMatch(/^Custom ·/);

    fireEvent.click(screen.getByTestId('typography-apply'));

    expect(setSelection).toHaveBeenCalledTimes(1);
    const arg = setSelection.mock.calls[0]?.[0] as TypePresetSelection;
    expect(arg.kind).toBe('custom');
    if (arg.kind === 'custom') {
      const tokens = arg.preset as TypographyTokens;
      expect(tokens.scale['step-3']).toBe('23px');
      expect(tokens.fonts.serif).toBe('Source Serif 4');
    }
  });

  it('Reset restores editorial default via hook', () => {
    render(<TypographySettings expanded onToggle={() => undefined} />);

    fireEvent.click(screen.getByTestId('typography-reset'));
    expect(resetToDefault).toHaveBeenCalledTimes(1);
  });

  it('toggles expansion via header control', () => {
    const onToggle = vi.fn();
    render(<TypographySettings expanded={false} onToggle={onToggle} />);

    fireEvent.click(screen.getByTestId('typography-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
