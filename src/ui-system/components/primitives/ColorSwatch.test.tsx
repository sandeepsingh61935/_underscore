/**
 * Design contract: src/ui-system/theme/global.css (Page-group ColorSwatch section)
 *   - Swatches reference var(--group-<color>) tokens; no hex in tsx or test.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { GROUP_COLORS } from '../../../shared/types/page-group';
import { ColorSwatch, ColorSwatchPicker } from './ColorSwatch';

describe('ColorSwatch (Editorial contract)', () => {
  it('renders a token var (not hex) for the given color', () => {
    const { container } = render(<ColorSwatch color="blue" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute('style')).toContain('var(--group-blue)');
    expect(dot.getAttribute('style')).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
  });

  it('is aria-hidden by default and supports sm/hollow variants', () => {
    const { container } = render(<ColorSwatch color="red" size="sm" variant="hollow" />);
    const dot = container.firstElementChild as HTMLElement;
    expect(dot.getAttribute('aria-hidden')).toBe('true');
    expect(dot.className).toMatch(/\bgroup-swatch-sm\b/);
    expect(dot.className).toMatch(/\bgroup-swatch-hollow\b/);
    expect(dot.getAttribute('style')).toContain('var(--group-red)');
  });

  it('picker renders a radio group with a label per color', () => {
    const onChange = vi.fn();
    render(<ColorSwatchPicker value="green" onChange={onChange} />);
    const group = screen.getByRole('radiogroup', { name: /group color/i });
    expect(group).toBeTruthy();
    const radios = screen.getAllByRole('radio');
    expect(radios).toHaveLength(GROUP_COLORS.length);
    for (const color of GROUP_COLORS) {
      expect(screen.getByRole('radio', { name: color })).toBeTruthy();
    }
    expect((screen.getByRole('radio', { name: 'green' }) as HTMLInputElement).checked).toBe(
      true
    );
  });

  it('picker calls onChange with the selected color', () => {
    const onChange = vi.fn();
    render(<ColorSwatchPicker value="green" onChange={onChange} />);
    screen.getByRole('radio', { name: 'purple' }).click();
    expect(onChange).toHaveBeenCalledWith('purple');
  });
});
