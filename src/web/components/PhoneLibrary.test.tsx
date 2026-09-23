import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneLibrary } from './PhoneLibrary';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

const HIGHLIGHTS: WebHighlight[] = [
  {
    id: 'h1',
    domain: 'example.com',
    path: '/docs',
    quote: 'Alpha insight',
    note: '',
    tags: [],
    savedAt: 1000,
  },
  {
    id: 'h2',
    domain: 'example.com',
    path: '/about',
    quote: 'Beta quote',
    note: '',
    tags: [],
    savedAt: 900,
  },
  {
    id: 'h3',
    domain: 'other.org',
    path: '/post',
    quote: 'Gamma remark',
    note: '',
    tags: [],
    savedAt: 800,
  },
];

describe('PhoneLibrary', () => {
  it('shows domain list with counts when no domain selected', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText('example.com')).toBeInTheDocument();
    expect(screen.getByText('other.org')).toBeInTheDocument();
    expect(screen.getByText('2 highlights')).toBeInTheDocument();
    expect(screen.getByText('1 highlight')).toBeInTheDocument();
  });

  it('calls onOpenDomain when domain row is clicked', () => {
    const onOpenDomain = vi.fn();
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={onOpenDomain}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    fireEvent.click(screen.getByText('example.com'));
    expect(onOpenDomain).toHaveBeenCalledWith('example.com');
  });

  it('shows quotes for selected domain', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText('Alpha insight')).toBeInTheDocument();
    expect(screen.getByText('Beta quote')).toBeInTheDocument();
    expect(screen.queryByText('Gamma remark')).toBeNull();
  });

  it('shows PhoneQuoteScreen when highlightId is set', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId="h1"
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    // Quote screen shows the full quote text
    expect(screen.getByText('Alpha insight')).toBeInTheDocument();
    // Has the Open link (from PhoneQuoteScreen)
    expect(screen.getByRole('link', { name: 'Open' })).toBeInTheDocument();
    // No domain list rows
    expect(screen.queryByText('other.org')).toBeNull();
  });

  it('shows empty message when no highlights', () => {
    render(
      <PhoneLibrary
        highlights={[]}
        query=""
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText(/no highlights yet/i)).toBeInTheDocument();
  });

  it('does not render delete, export, or vault UI', () => {
    const { container } = render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query=""
        onQueryChange={() => undefined}
        domain="example.com"
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
    expect(screen.queryByText(/export/i)).toBeNull();
    expect(screen.queryByText(/vault/i)).toBeNull();
  });

  it('filters domains by query text', () => {
    render(
      <PhoneLibrary
        highlights={HIGHLIGHTS}
        query="other"
        onQueryChange={() => undefined}
        domain={null}
        highlightId={null}
        onOpenDomain={() => undefined}
        onOpenHighlight={() => undefined}
        onBack={() => undefined}
        clientKind="phone"
      />
    );
    expect(screen.getByText('other.org')).toBeInTheDocument();
    expect(screen.queryByText('example.com')).toBeNull();
  });
});
