/**
 * Wireframe: Out of scope for V2.1 primitives re-spec.
 * Deferred to WT4/5. Contract lock test only.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { Dialog } from './Dialog';

describe('Dialog', () => {
  it('renders without crashing when open', () => {
    const { baseElement } = render(
      <Dialog open={true} onClose={() => {}}>
        Dialog content
      </Dialog>
    );
    expect(baseElement).toBeTruthy();
  });
});
