/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { LibraryPulse } from '@/features/settings/components/LibraryPulse';

const base = {
  totalHighlights: 51,
  thisWeekCount: 8,
  todayCount: 2,
  totalDomains: 9,
  withNotesCount: 12,
  withTagsCount: 20,
};

describe('LibraryPulse', () => {
  it('collapsed: shows disclose row with summary, hides grid', () => {
    render(<LibraryPulse {...base} expanded={false} onToggle={vi.fn()} />);

    expect(screen.getByTestId('library-stats-toggle')).toBeTruthy();
    expect(screen.getByText('Library stats')).toBeTruthy();
    expect(screen.getByText(/51 highlights · 9 domains/)).toBeTruthy();
    expect(screen.queryByTestId('library-stats-panel')).toBeNull();
    expect(screen.getByTestId('library-stats-toggle')).toHaveAttribute(
      'aria-expanded',
      'false'
    );
  });

  it('expanded: shows practice grid', () => {
    render(<LibraryPulse {...base} expanded onToggle={vi.fn()} />);

    expect(screen.getByTestId('library-stats-panel')).toBeTruthy();
    expect(screen.getByTestId('library-pulse-total').textContent).toMatch(/51/);
    expect(screen.getByTestId('library-pulse-week').textContent).toMatch(/8/);
    expect(screen.getByTestId('library-pulse-today').textContent).toMatch(/2/);
    expect(screen.getByTestId('library-pulse-domains').textContent).toMatch(/9/);
    expect(screen.getByTestId('library-pulse-notes').textContent).toMatch(/12/);
    expect(screen.getByTestId('library-pulse-tags').textContent).toMatch(/20/);
    expect(screen.getByTestId('library-stats-toggle')).toHaveAttribute(
      'aria-expanded',
      'true'
    );
  });

  it('toggle calls onToggle', () => {
    const onToggle = vi.fn();
    render(<LibraryPulse {...base} expanded={false} onToggle={onToggle} />);
    fireEvent.click(screen.getByTestId('library-stats-toggle'));
    expect(onToggle).toHaveBeenCalledTimes(1);
  });

  it('loading shows ellipsis summary and em dash cells when open', () => {
    render(
      <LibraryPulse
        {...base}
        totalHighlights={0}
        totalDomains={0}
        loading
        expanded
        onToggle={vi.fn()}
      />
    );
    expect(screen.getByText('…')).toBeTruthy();
    expect(screen.getByTestId('library-pulse-total').textContent).toMatch(/—/);
  });
});
