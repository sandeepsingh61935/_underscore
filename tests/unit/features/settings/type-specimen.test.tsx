import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TypeSpecimen } from '@/features/settings/components/TypeSpecimen';
import { resolveBuiltinTokens } from '@/shared/constants/type-presets';

describe('TypeSpecimen', () => {
  it('renders hierarchy preview from tokens', () => {
    render(<TypeSpecimen tokens={resolveBuiltinTokens('editorial')} />);

    expect(screen.getByText('Library')).toBeTruthy();
    expect(screen.getByText('anthropic.com')).toBeTruthy();
    expect(screen.getByText('Academy')).toBeTruthy();
    expect(screen.getByText(/Source Serif 4/)).toBeTruthy();
  });
});
