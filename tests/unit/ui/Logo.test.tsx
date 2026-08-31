/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { Logo } from '../../../src/ui-system/components/primitives/Logo';

describe('V2 Logo', () => {
  it('renders the wordmark by default', () => {
    const { container } = render(<Logo />);
    expect(container.textContent).toMatch(/underscore/);
  });

  it('hides the wordmark when showText={false}', () => {
    const { container } = render(<Logo showText={false} />);
    expect(container.textContent).not.toMatch(/underscore/);
  });

  it('uses --ink for the badge background (V2: dark badge = ink surface)', () => {
    const { container } = render(<Logo />);
    const html = container.innerHTML;
    expect(html).toContain('var(--ink)');
  });

  it('uses --paper for the mark (V2: light mark on dark badge)', () => {
    const { container } = render(<Logo />);
    const html = container.innerHTML;
    expect(html).toContain('var(--paper)');
  });

  it('uses color-mix reflection with var(--paper) for ambient reflection', () => {
    const { container } = render(<Logo />);
    const html = container.innerHTML;
    expect(html).toContain('color-mix(in srgb, var(--paper) 8%, transparent)');
  });

  it('does not use deprecated --logo-* tokens', () => {
    const { container } = render(<Logo />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/--logo-bg/);
    expect(html).not.toMatch(/--logo-text/);
    expect(html).not.toMatch(/--logo-ambient-reflection/);
  });

  it('does not use MD3 text-title-large / text-headline-* utility classes', () => {
    const { container } = render(<Logo />);
    const html = container.innerHTML;
    expect(html).not.toMatch(/text-title-large/);
    expect(html).not.toMatch(/text-headline-medium/);
    expect(html).not.toMatch(/text-headline-large/);
    expect(html).not.toMatch(/text-on-surface/);
    expect(html).not.toMatch(/font-display/);
  });
});
