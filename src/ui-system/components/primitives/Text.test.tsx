/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L1019-1037 (V2_Text)
 * V2 contract:
 *   - step + family params map to size + u-serif|u-sans|u-mono class.
 *   - 9 step-scale sizes; families sans/serif/mono.
 *
 * Note: current impl uses variant-based step map (MD3-style ramp) but
 * routes to V2 step tokens. No family prop is exposed yet; family-class
 * routing is a future cycle. Tests lock what the public contract exposes.
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Text } from './Text';

describe('Text (V2 wireframe contract)', () => {
  it('body variant maps to --step-0 with --ink color', () => {
    const { container } = render(<Text>Hello</Text>);
    const el = container.firstElementChild as HTMLElement;
    const style = el.getAttribute('style') ?? '';
    expect(style).toContain('var(--step-0)');
    expect(style).toContain('var(--ink)');
  });

  it('headlineMedium maps to --step-4', () => {
    const { container } = render(<Text variant="headlineMedium">Title</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('style') ?? '').toContain('var(--step-4)');
  });

  it('labelSmall maps to --step--2 (smallest V2 size)', () => {
    const { container } = render(<Text variant="labelSmall">Tiny</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('style') ?? '').toContain('var(--step--2)');
  });

  it('muted variant routes to --ink-3', () => {
    const { container } = render(<Text muted>Quiet</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('style') ?? '').toContain('var( --ink-3 )');
  });

  it('link variant routes to --accent', () => {
    const { container } = render(<Text variant="link">Go</Text>);
    const el = container.firstElementChild as HTMLElement;
    expect(el.getAttribute('style') ?? '').toContain('var( --accent )');
  });

  it('h1 variant renders as <h1>', () => {
    render(<Text variant="h1">Title</Text>);
    expect(screen.getByRole('heading', { level: 1 })).toBeTruthy();
  });

  it('h2 variant renders as <h2>', () => {
    render(<Text variant="h2">Title</Text>);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });

  it('h3 variant renders as <h2> (per impl semanticTagMap: h3 -> h2)', () => {
    // Impl decision: h3 maps to <h2> in the semanticTagMap. Lock actual
    // behavior; a future cycle can revisit this mapping.
    render(<Text variant="h3">Title</Text>);
    expect(screen.getByRole('heading', { level: 2 })).toBeTruthy();
  });
});
