import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';

import { TypographySettings } from '@/features/settings/components/TypographySettings';
import {
  resolveBuiltinTokens,
  type TypePresetSelection,
  type TypographyTokens,
} from '@/shared/constants/type-presets';
import {
  deleteFontFile,
  getFontFile,
  storeFontFile,
} from '@/shared/services/font-import-store';

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
  deleteFontFile: vi.fn(async () => undefined),
}));

describe('TypographySettings', () => {
  beforeEach(() => {
    mockSelection = { kind: 'builtin', id: 'editorial' };
    mockDisplayName = 'Editorial';
    setSelection.mockClear();
    resetToDefault.mockClear();
    vi.mocked(getFontFile).mockReset();
    vi.mocked(getFontFile).mockResolvedValue(undefined);
    vi.mocked(storeFontFile).mockReset();
    vi.mocked(deleteFontFile).mockReset();
    vi.mocked(deleteFontFile).mockResolvedValue(undefined);
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

  it('includes non-catalog imported face in the font wheel selection', async () => {
    mockSelection = {
      kind: 'custom',
      preset: {
        ...resolveBuiltinTokens('editorial'),
        fonts: {
          serif: 'My Local Serif',
          sans: 'Inter',
          mono: 'JetBrains Mono',
        },
      },
      importedFonts: { serif: 'imp-1' },
    };
    mockDisplayName = 'Custom';
    vi.mocked(getFontFile).mockImplementation(async (id: string) => {
      if (id === 'imp-1') {
        return {
          id: 'imp-1',
          familyName: 'My Local Serif',
          format: 'woff2' as const,
          bytes: new ArrayBuffer(8),
          uploadedAt: Date.now(),
          fileName: 'MyLocalSerif.woff2',
        };
      }
      return undefined;
    });

    render(<TypographySettings expanded onToggle={() => undefined} />);

    await waitFor(() => {
      expect(screen.getByTestId('typography-role-serif').textContent).toMatch(/My Local/);
    });

    const wheel = screen.getByRole('generic', {
      name: 'serif font picker',
    });
    // Selected option text should be the imported face, not catalog index 0.
    expect(wheel.textContent).toMatch(/My Local Serif/);
  });

  it('remove import restores role font to catalog default and updates draft', async () => {
    const customPreset = {
      ...resolveBuiltinTokens('editorial'),
      fonts: {
        serif: 'My Local Serif',
        sans: 'Inter',
        mono: 'JetBrains Mono',
      },
    };
    mockSelection = {
      kind: 'custom',
      preset: customPreset,
      importedFonts: { serif: 'imp-1' },
    };
    mockDisplayName = 'Custom';
    vi.mocked(getFontFile).mockImplementation(async (id: string) => {
      if (id === 'imp-1') {
        return {
          id: 'imp-1',
          familyName: 'My Local Serif',
          format: 'woff2' as const,
          bytes: new ArrayBuffer(8),
          uploadedAt: Date.now(),
          fileName: 'MyLocalSerif.woff2',
        };
      }
      return undefined;
    });

    render(<TypographySettings expanded onToggle={() => undefined} />);

    // Import fonts is collapsed by default
    fireEvent.click(screen.getByText('Import fonts'));

    await waitFor(() => {
      expect(screen.getByTestId('typography-import-remove')).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId('typography-import-remove'));

    await waitFor(() => {
      expect(deleteFontFile).toHaveBeenCalledWith('imp-1');
      expect(setSelection).toHaveBeenCalled();
    });

    const calls = setSelection.mock.calls;
    const last = calls[calls.length - 1]?.[0] as TypePresetSelection;
    expect(last.kind).toBe('custom');
    if (last.kind === 'custom') {
      expect(last.preset.fonts.serif).toBe('Source Serif 4');
      expect(last.importedFonts?.serif).toBeUndefined();
    }
    // Role tab abbreviates to ~10 chars ("Source Se…")
    expect(screen.getByTestId('typography-role-serif').textContent).toMatch(/Source Se/);
  });
});
