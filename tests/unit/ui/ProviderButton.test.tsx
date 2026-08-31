/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProviderButton } from '../../../src/ui-system/components/composed/ProviderButton';

describe('V2 ProviderButton', () => {
  it('renders the provider label by default', () => {
    render(<ProviderButton provider="google" />);
    expect(
      screen.getByRole('button', { name: /Continue with Google/ })
    ).toBeInTheDocument();
  });

  it('renders custom children when provided', () => {
    render(<ProviderButton provider="google">Custom Label</ProviderButton>);
    expect(screen.getByRole('button', { name: 'Custom Label' })).toBeInTheDocument();
  });

  it('is disabled when isLoading is true', () => {
    render(<ProviderButton provider="google" isLoading />);
    const button = screen.getByRole('button');
    expect(button).toBeDisabled();
  });

  it('is disabled when disabled prop is true', () => {
    render(<ProviderButton provider="google" disabled />);
    const button = screen.getByRole('button', { name: /Continue with Google/ });
    expect(button).toBeDisabled();
  });

  it('invokes onClick when clicked', () => {
    const onClick = vi.fn();
    render(<ProviderButton provider="apple" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Apple/ }));
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('does not invoke onClick when disabled', () => {
    const onClick = vi.fn();
    render(<ProviderButton provider="apple" disabled onClick={onClick} />);
    fireEvent.click(screen.getByRole('button', { name: /Continue with Apple/ }));
    expect(onClick).not.toHaveBeenCalled();
  });

  it('uses V2 --paper surface and --rule border (not Style C bg-surface/border-outline)', () => {
    const { baseElement } = render(<ProviderButton provider="google" />);
    const html = baseElement.innerHTML;
    expect(html).toContain('var(--paper)');
    expect(html).toContain('var(--rule)');
  });

  it('does not use Style C, MD3, or shadcn utility classes', () => {
    const { baseElement } = render(<ProviderButton provider="facebook" />);
    const html = baseElement.innerHTML;
    expect(html).not.toMatch(/bg-surface/);
    expect(html).not.toMatch(/text-on-surface/);
    expect(html).not.toMatch(/border-outline/);
    expect(html).not.toMatch(/text-label-large/);
    expect(html).not.toMatch(/text-muted-foreground/);
    expect(html).not.toMatch(/rounded-lg/);
    expect(html).not.toMatch(/shadow-sm/);
    expect(html).not.toMatch(/shadow-md/);
    expect(html).not.toMatch(/hover:border-primary/);
    expect(html).not.toMatch(/duration-short/);
  });

  it('does not apply vendor brand-color hover states (Q8)', () => {
    const { baseElement } = render(
      <>
        <ProviderButton provider="google" />
        <ProviderButton provider="facebook" />
      </>
    );
    const html = baseElement.innerHTML;
    // No red-50 / blue-50 / zinc-50 hover utilities
    expect(html).not.toMatch(/red-50|red-600|red-200/);
    expect(html).not.toMatch(/blue-50|blue-600|blue-200/);
    expect(html).not.toMatch(/zinc-50|锌/);
  });

  it('has 44px minimum touch target', () => {
    const { baseElement } = render(<ProviderButton provider="google" />);
    const html = baseElement.innerHTML;
    expect(html).toMatch(/min-h-\[44px\]/);
  });
});
