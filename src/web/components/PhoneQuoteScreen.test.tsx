import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { PhoneQuoteScreen } from './PhoneQuoteScreen';

const highlight = {
  id: 'h1',
  domain: 'example.com',
  path: '/article',
  quote: 'remarkable insight',
  note: 'secret note',
  tags: ['x'],
  savedAt: 1,
};

describe('PhoneQuoteScreen', () => {
  it('shows quote and source, not editors', () => {
    render(<PhoneQuoteScreen highlight={highlight} onBack={() => undefined} />);
    expect(screen.getByText('remarkable insight')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute(
      'href',
      'https://example.com/article#:~:text=remarkable%20insight'
    );
    expect(screen.queryByText('secret note')).toBeNull();
    expect(screen.queryByRole('button', { name: /delete/i })).toBeNull();
  });

  it('calls onBack', () => {
    const onBack = vi.fn();
    render(<PhoneQuoteScreen highlight={highlight} onBack={onBack} />);
    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(onBack).toHaveBeenCalledOnce();
  });

  it('tracks highlight_open_source on click', () => {
    render(
      <PhoneQuoteScreen highlight={highlight} onBack={() => undefined} clientKind="phone" />
    );
    const link = screen.getByRole('link', { name: 'Open' });
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('shows Copy button', () => {
    render(<PhoneQuoteScreen highlight={highlight} onBack={() => undefined} />);
    expect(screen.getByRole('button', { name: 'Copy' })).toBeInTheDocument();
  });
});
