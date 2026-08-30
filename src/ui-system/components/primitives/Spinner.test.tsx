/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L532-546 (V2_Spinner)
 * V2 contract:
 *   - 2px solid ring, border-radius 50%, default border var(--rule-soft),
 *     border-top-color var( --accent ) (the rotating edge).
 *   - sm/md/lg sizes from SPINNER_SIZES map (16/24/32 in current impl).
 *   - role="status", aria-label="Loading" for a11y.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Spinner } from './Spinner';

describe('Spinner (V2 wireframe contract)', () => {
  it('renders with role=status and aria-label=Loading', () => {
    render(<Spinner />);
    expect(screen.getByRole('status', { name: /loading/i })).toBeTruthy();
  });

  it('routes border-top-color to var(--accent)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('border-top-color: var(--accent)');
  });

  it('routes default border (right/bottom/left) to var(--rule-soft)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--rule-soft)');
  });

  it('default size md renders 24px (w-6 h-6 in current Tailwind impl)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    // Current impl uses Tailwind w-6 h-6 for md (24px)
    expect(el.className).toMatch(/w-6/);
    expect(el.className).toMatch(/h-6/);
  });

  it('size sm renders 16px, size lg renders 32px', () => {
    const { container: a } = render(<Spinner size="sm" />);
    const { container: b } = render(<Spinner size="lg" />);
    const sm = a.firstElementChild as HTMLElement;
    const lg = b.firstElementChild as HTMLElement;
    expect(sm.className).toMatch(/w-4/);
    expect(lg.className).toMatch(/w-8/);
  });

  it('is fully round (rounded-full class or border-radius: 50%)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    // Current impl uses Tailwind rounded-full
    const isRoundClass = /\brounded-full\b/.test(el.className);
    const isRoundStyle = (el.getAttribute('style') ?? '').includes('border-radius: 50%');
    expect(isRoundClass || isRoundStyle).toBe(true);
  });
});
