/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { LibraryPulse } from '@/features/settings/components/LibraryPulse';

describe('LibraryPulse', () => {
  it('renders six practice stats', () => {
    render(
      <LibraryPulse
        totalHighlights={51}
        thisWeekCount={8}
        todayCount={2}
        totalDomains={9}
        withNotesCount={12}
        withTagsCount={20}
      />,
    );

    expect(screen.getByTestId('library-pulse')).toBeTruthy();
    expect(screen.getByTestId('library-pulse-total').textContent).toMatch(/51/);
    expect(screen.getByTestId('library-pulse-week').textContent).toMatch(/8/);
    expect(screen.getByTestId('library-pulse-today').textContent).toMatch(/2/);
    expect(screen.getByTestId('library-pulse-domains').textContent).toMatch(/9/);
    expect(screen.getByTestId('library-pulse-notes').textContent).toMatch(/12/);
    expect(screen.getByTestId('library-pulse-tags').textContent).toMatch(/20/);
  });

  it('shows em dash placeholders while loading', () => {
    render(
      <LibraryPulse
        totalHighlights={0}
        thisWeekCount={0}
        todayCount={0}
        totalDomains={0}
        withNotesCount={0}
        withTagsCount={0}
        loading
      />,
    );

    expect(screen.getByTestId('library-pulse-total').textContent).toMatch(/—/);
  });
});
