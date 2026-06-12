/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L496-508
 * V2 contract:
 *   - Fade-out + lift (opacity: 0, translateY(4px)) when open is false.
 *   - Skips transition when prefers-reduced-motion is on.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { PaperUnfurl } from './PaperUnfurl';

describe('PaperUnfurl', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('renders its children', () => {
    const { getByText } = render(
      <PaperUnfurl>
        <span>paper</span>
      </PaperUnfurl>
    );
    expect(getByText('paper')).toBeTruthy();
  });

  it('defaults to open (visible) when no prop is given', () => {
    const { container } = render(
      <PaperUnfurl>
        <span>x</span>
      </PaperUnfurl>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('1');
    expect(wrapper.style.transform).toBe('');
  });

  it('renders an unfurled (hidden) state when open is false', () => {
    const { container } = render(
      <PaperUnfurl open={false}>
        <span>x</span>
      </PaperUnfurl>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.opacity).toBe('0');
    expect(wrapper.style.transform).toBe('translateY(4px)');
  });

  it('applies a 200ms transition on opacity and transform when motion is allowed', () => {
    const { container } = render(
      <PaperUnfurl open={false}>
        <span>x</span>
      </PaperUnfurl>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.transition).toContain('200ms');
  });

  it('disables the transition when prefers-reduced-motion is set', () => {
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));

    const { container } = render(
      <PaperUnfurl open={false}>
        <span>x</span>
      </PaperUnfurl>
    );
    const wrapper = container.firstElementChild as HTMLElement;
    expect(wrapper.style.transition).toBe('none');
  });
});
