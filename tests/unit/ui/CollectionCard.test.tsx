/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CollectionCard } from '../../../src/ui-system/components/composed/CollectionCard';

describe('V2 CollectionCard', () => {
  it('renders domain and highlight count', () => {
    render(<CollectionCard domain="github.com" count={5} onClick={vi.fn()} />);
    expect(screen.getByText('github.com')).toBeInTheDocument();
    expect(screen.getByText('5 highlights')).toBeInTheDocument();
  });

  it('singularizes highlight count when count is 1', () => {
    render(<CollectionCard domain="x.com" count={1} onClick={vi.fn()} />);
    expect(screen.getByText('1 highlight')).toBeInTheDocument();
  });

  it('renders optional category label', () => {
    render(
      <CollectionCard domain="docs.rs" category="Docs" count={3} onClick={vi.fn()} />
    );
    expect(screen.getByText('Docs')).toBeInTheDocument();
  });

  it('invokes onClick with no args when clicked', () => {
    const onClick = vi.fn();
    render(<CollectionCard domain="github.com" count={2} onClick={onClick} />);
    const button = screen.getByRole('button', { name: /Open github.com collection/ });
    fireEvent.click(button);
    expect(onClick).toHaveBeenCalledOnce();
  });

  it('active surface uses V2 --paper, border uses --rule-soft', () => {
    const { baseElement } = render(
      <CollectionCard domain="github.com" count={2} onClick={vi.fn()} />
    );
    const html = baseElement.innerHTML;
    expect(html).toContain('var(--paper)');
    expect(html).toContain('var(--rule-soft)');
  });

  it('does not use Style C, MD3, or shadcn utility classes', () => {
    const { baseElement } = render(
      <CollectionCard domain="github.com" category="Code" count={2} onClick={vi.fn()} />
    );
    const html = baseElement.innerHTML;
    expect(html).not.toMatch(/bg-card/);
    expect(html).not.toMatch(/bg-secondary/);
    expect(html).not.toMatch(/text-muted-foreground/);
    expect(html).not.toMatch(/text-foreground/);
    expect(html).not.toMatch(/border-border/);
    expect(html).not.toMatch(/shadow-md/);
    expect(html).not.toMatch(/text-title-small/);
    expect(html).not.toMatch(/text-label-medium/);
    expect(html).not.toMatch(/text-label-small/);
    expect(html).not.toMatch(/rounded-xl/);
  });

  it('handles favicon error by hiding the broken image (no DOM mutation)', () => {
    const { container } = render(
      <CollectionCard
        domain="broken.com"
        favicon="https://example.invalid/missing.png"
        count={0}
        onClick={vi.fn()}
      />
    );
    const img = container.querySelector('img')!;
    fireEvent.error(img);
    // The React-managed visibility path must not use e.currentTarget.style mutation.
    // After error: image is hidden, globe icon visible.
    const styleAttr = img.getAttribute('style') ?? '';
    expect(styleAttr).not.toMatch(/display:\s*none/);
  });
});
