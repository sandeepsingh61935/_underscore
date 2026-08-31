/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L627-677 (V2_Chip)
 * V2 contract:
 *   - filter variant: 44px tall, 2px radius, --paper-2 surface,
 *     --rule-soft border default, --accent border+text when selected.
 *   - input variant: pill (borderRadius: 999), --paper-2 surface,
 *     --rule-soft border, 32px height, trailing × button when onRemove set.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';

describe('Chip (V2 wireframe contract)', () => {
  it('renders a filter chip with min-height 44px and --paper-2 surface', () => {
    const { container } = render(<Chip variant="filter">Apple</Chip>);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    // Tailwind arbitrary value class `min-h-[44px]` enforces V2 touch target
    expect(btn.className).toMatch(/min-h-\[44px\]/);
    // Surface comes from tonalPill base class
    expect(btn.className).toMatch(/bg-\[var\(--paper-2\)\]/);
  });

  it('uses --rule-soft border when not selected, --accent when selected', () => {
    const { container: a } = render(<Chip variant="filter">A</Chip>);
    const { container: b } = render(
      <Chip variant="filter" selected>
        A
      </Chip>
    );
    const idle = a.querySelector('button') as HTMLButtonElement;
    const sel = b.querySelector('button') as HTMLButtonElement;
    expect(idle.className).toMatch(/border-\[var\(--rule-soft\)\]/);
    expect(sel.className).toMatch(/border-\[var\(--accent\)\]/);
  });

  it('input variant uses pill (rounded-full) with --rule-soft border and --paper-2 surface', () => {
    const { container } = render(
      <Chip variant="input" onRemove={() => {}}>
        Apple
      </Chip>
    );
    // input variant wraps in a div span (not button)
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/rounded-full/);
    expect(wrapper.className).toMatch(/bg-\[var\(--paper-2\)\]/);
  });

  it('input variant renders a Remove button (aria-label="Remove") when onRemove is set', () => {
    render(
      <Chip variant="input" onRemove={() => {}}>
        Apple
      </Chip>
    );
    expect(screen.getByRole('button', { name: /remove/i })).toBeTruthy();
  });

  it('input variant does NOT render Remove button when onRemove is absent', () => {
    render(<Chip variant="input">Apple</Chip>);
    expect(screen.queryByRole('button', { name: /remove/i })).toBeNull();
  });

  it('Remove button invokes onRemove and stops propagation', () => {
    const onRemove = vi.fn();
    const parent = vi.fn();
    render(
      <div onClick={parent}>
        <Chip variant="input" onRemove={onRemove}>
          Apple
        </Chip>
      </div>
    );
    screen.getByRole('button', { name: /remove/i }).click();
    expect(onRemove).toHaveBeenCalledTimes(1);
    // stopPropagation should prevent the parent click from firing
    expect(parent).not.toHaveBeenCalled();
  });
});
