/**
 * Design contract: src/ui-system/theme/global.css (Spinner)
 * Design contract:
 *   - 2px solid ring, border-radius 50%, default border var(--rule-soft),
 *     border-top-color var(--accent) (the rotating edge).
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

  it('uses .spinner class (accent top edge, --rule-soft ring in CSS)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/\bspinner\b/);
  });

  it('default size md uses .spinner-md (24px in CSS)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    expect(el.className).toMatch(/\bspinner-md\b/);
  });

  it('size sm uses .spinner-sm, size lg uses .spinner-lg', () => {
    const { container: a } = render(<Spinner size="sm" />);
    const { container: b } = render(<Spinner size="lg" />);
    const sm = a.firstElementChild as HTMLElement;
    const lg = b.firstElementChild as HTMLElement;
    expect(sm.className).toMatch(/\bspinner-sm\b/);
    expect(lg.className).toMatch(/\bspinner-lg\b/);
  });

  it('is fully round (spinner class, 50% radius)', () => {
    const { container } = render(<Spinner />);
    const el = container.firstElementChild as HTMLElement;
    // Plain-CSS spinner: 50% radius + accent top edge
    const isRoundClass = /\bspinner\b/.test(el.className);
    const isRoundStyle = (el.getAttribute('style') ?? '').includes('border-radius: 50%');
    expect(isRoundClass || isRoundStyle).toBe(true);
  });
});
