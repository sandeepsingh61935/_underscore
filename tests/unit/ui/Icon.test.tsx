/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Lock } from 'lucide-react';
import { Icon } from '../../../src/ui-system/components/primitives/Icon';

describe('V2 Icon', () => {
  it('renders a span wrapping the Lucide icon', () => {
    const { container } = render(<Icon icon={Lock} />);
    const span = container.querySelector('span');
    expect(span).toBeInTheDocument();
    expect(span?.tagName).toBe('SPAN');
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
  });

  it('uses V2 ink token by default (not MD3 text-on-surface)', () => {
    const { container } = render(<Icon icon={Lock} />);
    const span = container.firstChild as HTMLElement;
    const style = span.getAttribute('style') ?? '';
    expect(style).toContain('var(--ink)');
  });

  it('uses --accent when color="primary" (brand color = single accent)', () => {
    const { container } = render(<Icon icon={Lock} color="primary" />);
    const span = container.firstChild as HTMLElement;
    const style = span.getAttribute('style') ?? '';
    expect(style).toContain('var(--accent)');
  });

  it('uses --ink-2 when color="on-surface-variant" (muted)', () => {
    const { container } = render(<Icon icon={Lock} color="on-surface-variant" />);
    const span = container.firstChild as HTMLElement;
    const style = span.getAttribute('style') ?? '';
    expect(style).toContain('var(--ink-2)');
  });

  it('uses --accent when color="error" (V2 single-accent rule)', () => {
    const { container } = render(<Icon icon={Lock} color="error" />);
    const span = container.firstChild as HTMLElement;
    const style = span.getAttribute('style') ?? '';
    // V2 spec rule 1: all theme color flows from --accent.
    // Error is an attention signal; --accent is the only non-ink token.
    expect(style).toContain('var(--accent)');
  });

  it('does not use MD3 text-on-surface or text-primary utility classes', () => {
    const { container } = render(<Icon icon={Lock} />);
    const span = container.firstChild as HTMLElement;
    expect(span.className).not.toMatch(/text-on-surface\b/);
    expect(span.className).not.toMatch(/text-primary\b/);
    expect(span.className).not.toMatch(/text-on-surface-variant\b/);
    expect(span.className).not.toMatch(/text-error\b/);
  });
});
