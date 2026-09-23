import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneHome } from './PhoneHome';
import type { WebHighlight } from '@/web/hooks/useWebLibrary';

const HIGHLIGHTS: WebHighlight[] = [
  {
    id: 'h1',
    domain: 'example.com',
    path: '/docs',
    quote: 'First quote',
    note: '',
    tags: [],
    savedAt: 3000,
  },
  {
    id: 'h2',
    domain: 'example.com',
    path: '/about',
    quote: 'Second quote',
    note: '',
    tags: [],
    savedAt: 2000,
  },
  {
    id: 'h3',
    domain: 'other.org',
    path: '/post',
    quote: 'Third quote',
    note: '',
    tags: [],
    savedAt: 1000,
  },
];

describe('PhoneHome', () => {
  it('shows greeting and count', () => {
    render(
      <PhoneHome
        greeting="Good evening, sandy"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByText('Good evening, sandy')).toBeInTheDocument();
    expect(screen.getByText('3 highlights')).toBeInTheDocument();
  });

  it('shows recent quotes', () => {
    render(
      <PhoneHome
        greeting="Good morning"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByText('First quote')).toBeInTheDocument();
    expect(screen.getByText('Second quote')).toBeInTheDocument();
    expect(screen.getByText('Third quote')).toBeInTheDocument();
  });

  it('calls onOpenHighlight when quote is tapped', () => {
    const onOpen = vi.fn();
    render(
      <PhoneHome
        greeting="Good morning"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={onOpen}
      />
    );
    fireEvent.click(screen.getByText('First quote'));
    expect(onOpen).toHaveBeenCalledWith('h1', 'example.com');
  });

  it('does not render Current page, Pages, stats grid, or Ask', () => {
    render(
      <PhoneHome
        greeting="Hello"
        count={3}
        recent={HIGHLIGHTS}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.queryByText('Current page')).toBeNull();
    expect(screen.queryByText('Pages')).toBeNull();
    expect(screen.queryByText('Ask')).toBeNull();
    expect(screen.queryByText('This week')).toBeNull();
    expect(screen.queryByText('Sources')).toBeNull();
  });

  it('shows empty message when no highlights', () => {
    render(
      <PhoneHome
        greeting="Hello"
        count={0}
        recent={[]}
        onOpenHighlight={() => undefined}
      />
    );
    expect(screen.getByText(/no highlights yet/i)).toBeInTheDocument();
  });
});
