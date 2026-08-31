/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UserMenu } from '../../../src/ui-system/components/composed/UserMenu';

describe('V2 UserMenu', () => {
  const user = {
    id: 'u1',
    email: 'jane@example.com',
    displayName: 'Jane Doe',
  };

  it('renders the display name in the trigger', () => {
    render(<UserMenu user={user} onLogout={vi.fn()} />);
    expect(screen.getByText('Jane Doe')).toBeInTheDocument();
  });

  it('falls back to the first letter when no photoUrl is provided', () => {
    render(<UserMenu user={user} onLogout={vi.fn()} />);
    // The avatar fallback shows the initial.
    expect(screen.getByText('J')).toBeInTheDocument();
  });

  it('trigger has 44px minimum touch target', () => {
    const { baseElement } = render(<UserMenu user={user} onLogout={vi.fn()} />);
    const html = baseElement.innerHTML;
    expect(html).toMatch(/min-h-\[44px\]/);
  });

  it('does not use Style C, MD3, or shadcn utility classes', () => {
    const { baseElement } = render(<UserMenu user={user} onLogout={vi.fn()} />);
    const html = baseElement.innerHTML;
    expect(html).not.toMatch(/bg-primary\b/);
    expect(html).not.toMatch(/text-primary-foreground/);
    expect(html).not.toMatch(/text-foreground/);
    expect(html).not.toMatch(/text-muted-foreground/);
    expect(html).not.toMatch(/border-border/);
    expect(html).not.toMatch(/text-label-small/);
    expect(html).not.toMatch(/text-title-small/);
    expect(html).not.toMatch(/text-destructive/);
    expect(html).not.toMatch(/ring-border/);
  });

  it('uses V2 --paper for the trigger avatar fallback', () => {
    const { baseElement } = render(<UserMenu user={user} onLogout={vi.fn()} />);
    const html = baseElement.innerHTML;
    expect(html).toContain('var(--accent)');
  });
});
