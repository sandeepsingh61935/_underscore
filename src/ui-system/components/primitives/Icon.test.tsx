/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L1052-1066 (V2_Icon)
 * V2 contract:
 *   - SVG with viewBox "0 0 24 24", fill "none", stroke "var(--ink)",
 *     strokeWidth "1.6", strokeLinecap/join "round".
 *   - Size 24 default; sm/md/lg scale variants per impl.
 *   - aria-hidden since icon is decorative (paired with text label).
 *
 * Note: current impl uses lucide-react components (not name-based SVG path
 * lookup). The lucide component already renders with viewBox "0 0 24 24",
 * fill "none", stroke-linecap/join round. We lock the public contract:
 * color routes through V2 tokens, sizes match V2 scale, decorative.
 */
import React from 'react';
import { Search } from 'lucide-react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';

describe('Icon (V2 wireframe contract)', () => {
  it('routes default color to var(--ink)', () => {
    const { container } = render(<Icon icon={Search} />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.getAttribute('style') ?? '').toContain('var(--ink)');
  });

  it('routes primary color to var(--accent)', () => {
    const { container } = render(<Icon icon={Search} color="primary" />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.getAttribute('style') ?? '').toContain('var(--accent)');
  });

  it('routes on-surface-variant color to var(--ink-2)', () => {
    const { container } = render(<Icon icon={Search} color="on-surface-variant" />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.getAttribute('style') ?? '').toContain('var(--ink-2)');
  });

  it('routes error color to var(--accent) per V2 single-accent rule', () => {
    const { container } = render(<Icon icon={Search} color="error" />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.getAttribute('style') ?? '').toContain('var(--accent)');
  });

  it('default size md renders 24px square (matches wireframe 24px default)', () => {
    const { container } = render(<Icon icon={Search} />);
    const span = container.firstElementChild as HTMLElement;
    expect(span.className).toMatch(/w-\[24px\]/);
    expect(span.className).toMatch(/h-\[24px\]/);
  });

  it('size sm renders 18px, size lg renders 40px', () => {
    const { container: a } = render(<Icon icon={Search} size="sm" />);
    const { container: b } = render(<Icon icon={Search} size="lg" />);
    const sm = a.firstElementChild as HTMLElement;
    const lg = b.firstElementChild as HTMLElement;
    expect(sm.className).toMatch(/w-\[18px\]/);
    expect(lg.className).toMatch(/w-\[40px\]/);
  });

  it('is decorative (aria-hidden) so screen readers skip it', () => {
    const { container } = render(<Icon icon={Search} />);
    const svg = container.querySelector('svg') as SVGElement;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
  });
});
