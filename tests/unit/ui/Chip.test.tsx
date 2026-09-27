/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from '../../../src/ui-system/components/primitives/Chip';

describe('V2 Chip', () => {
  describe('Basic rendering', () => {
    it('renders a button element', () => {
      render(<Chip>Tag</Chip>);
      expect(screen.getByRole('button', { name: 'Tag' })).toBeInTheDocument();
    });

    it('uses .chip-filter class (--rule-soft border, ink text in CSS)', () => {
      const { container } = render(<Chip>x</Chip>);
      const el = container.querySelector('button') as HTMLElement;
      expect(el.className).toMatch(/\bchip-filter\b/);
    });
  });

  describe('No legacy design system tokens', () => {
    it('does not use MD3 --md-sys- color tokens', () => {
      const { container } = render(<Chip>x</Chip>);
      const html = container.innerHTML;
      expect(html).not.toMatch(/--md-sys-/);
    });

    it('does not use MD3 text-on-surface-variant utility', () => {
      const { container } = render(<Chip>x</Chip>);
      const html = container.innerHTML;
      expect(html).not.toMatch(/text-on-surface-variant/);
    });
  });
});
