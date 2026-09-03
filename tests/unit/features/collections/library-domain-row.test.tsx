import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LibraryDomainRow } from '@/features/collections/components/LibraryDomainRow';
import { FAVICON_DISPLAY_PX } from '@/shared/favicon/compress-favicon';

vi.mock('@/shared/favicon/domain-favicon-store', () => ({
  getDomainFavicon: vi.fn().mockResolvedValue(null),
}));

describe('LibraryDomainRow', () => {
  it('renders a 16px domain favicon beside the title', () => {
    render(
      <LibraryDomainRow domain="github.com" count={3} onOpen={() => undefined} />
    );

    const icon = screen.getByRole('button', { name: 'github.com' }).querySelector('img');
    expect(icon).not.toBeNull();
    expect(icon?.getAttribute('width')).toBe(String(FAVICON_DISPLAY_PX));
    expect(icon?.getAttribute('height')).toBe(String(FAVICON_DISPLAY_PX));
    expect(icon?.getAttribute('src')).toContain('favicons');
    expect(icon?.getAttribute('src')).toContain('github.com');
  });

  it('falls back to a letter when the host has no public icon', () => {
    render(
      <LibraryDomainRow domain="localhost" count={1} onOpen={() => undefined} />
    );

    const row = screen.getByRole('button', { name: 'localhost' });
    expect(row.querySelector('img')).toBeNull();
    expect(row.querySelector('.domain-favicon')?.textContent).toBe('L');
  });
});
