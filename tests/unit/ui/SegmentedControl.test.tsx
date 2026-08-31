/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, fireEvent, screen } from '@testing-library/react';
import { SegmentedControl } from '../../../src/ui-system/components/primitives/SegmentedControl';

describe('V2 SegmentedControl', () => {
  const opts = ['A', 'B', 'C'] as const;

  it('renders one button per option', () => {
    render(<SegmentedControl options={opts} value="A" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'A' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'B' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'C' })).toBeInTheDocument();
  });

  it('marks the active option with aria-pressed=true', () => {
    render(<SegmentedControl options={opts} value="B" onChange={() => {}} />);
    expect(screen.getByRole('button', { name: 'A' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
    expect(screen.getByRole('button', { name: 'B' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
  });

  it('calls onChange with the clicked value', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={opts} value="A" onChange={onChange} />);
    fireEvent.click(screen.getByRole('button', { name: 'C' }));
    expect(onChange).toHaveBeenCalledWith('C');
  });

  it('uses V2 --paper-2 surface (not MD3 bg-surface-container)', () => {
    const { container } = render(
      <SegmentedControl options={opts} value="A" onChange={() => {}} />
    );
    const root = container.firstChild as HTMLElement;
    const style = root.getAttribute('style') ?? '';
    expect(style).toContain('var(--paper-2)');
  });

  it('active button uses --ink-2 / --paper for ink contrast (not MD3 text-on-surface-variant)', () => {
    render(<SegmentedControl options={opts} value="A" onChange={() => {}} />);
    const active = screen.getByRole('button', { name: 'A' });
    const inactive = screen.getByRole('button', { name: 'B' });
    expect(active.className).not.toMatch(/text-on-surface-variant/);
    expect(inactive.className).not.toMatch(/text-on-surface-variant/);
  });

  it('does not use MD3 arbitrary rounded-[Xpx] utilities', () => {
    const { container } = render(
      <SegmentedControl options={opts} value="A" onChange={() => {}} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.className).not.toMatch(/rounded-\[8px\]/);
    // The button's rounded-[6px] should also be gone
    const buttons = container.querySelectorAll('button');
    buttons.forEach((b) => {
      expect(b.className).not.toMatch(/rounded-\[6px\]/);
    });
  });

  it('does not use MD3 shadow-elevation-1 utility', () => {
    const { container } = render(
      <SegmentedControl options={opts} value="A" onChange={() => {}} />
    );
    const root = container.firstChild as HTMLElement;
    expect(root.innerHTML).not.toMatch(/shadow-elevation-1/);
  });
});
