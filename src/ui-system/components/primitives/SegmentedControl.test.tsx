/**
 * Wireframe: Out of scope for V2.1 primitives re-spec.
 * Deferred to WT4/5. Contract lock test only.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SegmentedControl } from './SegmentedControl';

describe('SegmentedControl', () => {
  it('renders without crashing', () => {
    const { baseElement } = render(
      <SegmentedControl options={['A', 'B']} value="A" onChange={vi.fn()} />
    );
    expect(baseElement).toBeTruthy();
  });
});
