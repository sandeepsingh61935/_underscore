import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { TypeSpecimen } from '@/features/settings/components/TypeSpecimen';
import { resolveBuiltinTokens } from '@/shared/constants/type-presets';

describe('TypeSpecimen', () => {
  it('renders hierarchy preview from tokens', () => {
    render(<TypeSpecimen tokens={resolveBuiltinTokens('editorial')} />);

    expect(screen.getByTestId('type-specimen')).toBeTruthy();
    expect(screen.getByTestId('type-specimen-display').textContent).toBe('Library');
    expect(screen.getByTestId('type-specimen-domain').textContent).toBe('anthropic.com');
    expect(screen.getByTestId('type-specimen-section').textContent).toBe('Academy');
    expect(screen.getByTestId('type-specimen-body').textContent).toMatch(/Cascading resolves/);
    expect(screen.getByTestId('type-specimen-meta').textContent).toMatch(/Source Serif 4/);
    expect(screen.getByTestId('type-specimen-meta').textContent).toMatch(/Inter/);
    expect(screen.getByTestId('type-specimen-meta').textContent).toMatch(/JetBrains Mono/);
  });

  it('reflects custom scale and font names in specimen', () => {
    const tokens = resolveBuiltinTokens('modern');
    tokens.scale['step-3'] = '28px';
    tokens.fonts.serif = 'Fraunces';

    render(<TypeSpecimen tokens={tokens} />);

    expect(screen.getByTestId('type-specimen-display').style.fontSize).toBe('28px');
    expect(screen.getByTestId('type-specimen-meta').textContent).toContain('Fraunces');
  });
});
