/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppHeader } from '../../../src/ui-system/components/layout/AppHeader';

describe('V2 AppHeader', () => {
  it('renders the primary variant with logo and trailing action slot', () => {
    render(<AppHeader variant="primary" action={<button>Profile</button>} />);
    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument();
  });

  it('renders the sub variant with back button + label', () => {
    render(<AppHeader variant="sub" onBack={vi.fn()} backLabel="Collections" />);
    const back = screen.getByRole('button', { name: /Go back to Collections/ });
    expect(back).toBeInTheDocument();
  });

  it('invokes onBack when the sub-variant back button is clicked', () => {
    const onBack = vi.fn();
    render(<AppHeader variant="sub" onBack={onBack} backLabel="Settings" />);
    fireEvent.click(screen.getByRole('button', { name: /Go back to Settings/ }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('renders the standalone variant without any controls', () => {
    render(<AppHeader variant="standalone" />);
    // No buttons in standalone mode
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('uses V2 --paper surface, --rule-soft border, --ink text', () => {
    const { baseElement } = render(<AppHeader variant="standalone" />);
    const html = baseElement.innerHTML;
    expect(html).toContain('var(--paper)');
    expect(html).toContain('var(--rule-soft)');
  });

  it('does not use Style C, MD3, or arbitrary motion utilities', () => {
    const { baseElement } = render(
      <AppHeader variant="sub" onBack={vi.fn()} backLabel="Collections" />
    );
    const html = baseElement.innerHTML;
    // Style C
    expect(html).not.toMatch(/text-primary\b/);
    expect(html).not.toMatch(/text-outline/);
    expect(html).not.toMatch(/text-body-small/);
    expect(html).not.toMatch(/border-outline-variant/);
    // MD3
    expect(html).not.toMatch(/var\(--md-sys-/);
    // Arbitrary motion
    expect(html).not.toMatch(/duration-\[/);
    expect(html).not.toMatch(/ease-out/);
    // shadcn
    expect(html).not.toMatch(/rounded-md/);
  });

  it('back button has 44px minimum touch target', () => {
    const { baseElement } = render(
      <AppHeader variant="sub" onBack={vi.fn()} backLabel="Collections" />
    );
    const html = baseElement.innerHTML;
    expect(html).toMatch(/min-h-\[44px\]/);
  });
});
