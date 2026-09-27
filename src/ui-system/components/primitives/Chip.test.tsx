/**
 * Design contract: src/ui-system/theme/global.css (Chip section)
 *   - filter variant: 44px tall, --radius, --paper-2 surface,
 *     --rule-soft border default, --accent border+text when selected.
 *   - input variant: pill, --paper-2 surface, --rule-soft border,
 *     trailing × button when onRemove set.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { Chip } from './Chip';

describe('Chip (Editorial contract)', () => {
  it('renders a filter chip with .chip + .chip-filter classes', () => {
    const { container } = render(<Chip variant="filter">Apple</Chip>);
    const btn = container.querySelector('button') as HTMLButtonElement;
    expect(btn).toBeTruthy();
    // 44px touch target + --paper-2 surface live in global.css `.chip`
    expect(btn.className).toMatch(/\bchip\b/);
    expect(btn.className).toMatch(/\bchip-filter\b/);
  });

  it('marks selected filter chips with .is-selected (--accent border+text)', () => {
    const { container: a } = render(<Chip variant="filter">A</Chip>);
    const { container: b } = render(
      <Chip variant="filter" selected>
        A
      </Chip>
    );
    const idle = a.querySelector('button') as HTMLButtonElement;
    const sel = b.querySelector('button') as HTMLButtonElement;
    expect(idle.className).not.toMatch(/\bis-selected\b/);
    expect(sel.className).toMatch(/\bis-selected\b/);
    expect(sel.getAttribute('aria-pressed')).toBe('true');
  });

  it('input variant uses pill wrap with --paper-2 surface', () => {
    const { container } = render(
      <Chip variant="input" onRemove={() => {}}>
        Apple
      </Chip>
    );
    // input variant wraps in a div (not button)
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.className).toMatch(/\bchip-input-wrap\b/);
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
