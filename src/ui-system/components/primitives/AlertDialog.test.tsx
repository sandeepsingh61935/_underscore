/**
 * Wireframe: Out of scope for V2.1 primitives re-spec.
 * Deferred to WT4/5. Contract lock test only.
 */
import React from 'react';
import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogOverlay,
  AlertDialogPortal,
  AlertDialogTitle,
} from './AlertDialog';

describe('AlertDialog', () => {
  it('renders without crashing', () => {
    const { baseElement } = render(
      <AlertDialog open={true}>
        <AlertDialogPortal>
          <AlertDialogOverlay />
          <AlertDialogContent>
            <AlertDialogTitle>Title</AlertDialogTitle>
          </AlertDialogContent>
        </AlertDialogPortal>
      </AlertDialog>
    );
    expect(baseElement).toBeTruthy();
  });
});
