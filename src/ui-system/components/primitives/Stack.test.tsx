/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L444-491
 * V2 contract:
 *   - Stack slides between sibling levels in 220ms with translateX(±30%) + opacity.
 *   - Reduced motion mode swaps levels instantly.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Stack } from './Stack';

describe('Stack', () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    window.matchMedia = originalMatchMedia;
  });

  it('renders its children inside a wrapper', () => {
    const { getByText } = render(
      <Stack direction="forward">
        <span>hello</span>
      </Stack>
    );
    expect(getByText('hello')).toBeTruthy();
  });

  it('applies a direction-derived class to the wrapper', () => {
    const { container, rerender } = render(
      <Stack direction="forward">
        <span>x</span>
      </Stack>
    );
    const wrapper = container.firstElementChild;
    expect(wrapper).toBeTruthy();
    const forwardClasses = wrapper!.className;
    expect(forwardClasses).toContain('forward');

    rerender(
      <Stack direction="back">
        <span>x</span>
      </Stack>
    );
    expect(wrapper!.className).toContain('back');
  });

  it('applies a reduced-motion class when prefers-reduced-motion is set', () => {
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
      <Stack direction="forward">
        <span>x</span>
      </Stack>
    );
    expect(container.firstElementChild!.className).toContain('stack--reduced');
  });
});
