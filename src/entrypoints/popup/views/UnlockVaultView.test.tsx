/**
 * @file UnlockVaultView.test.tsx
 * @description Tests for the user-facing vault unlock view (ADR-018).
 *
 * The view is body-only (V2 popup chrome contract): PopupShell owns the
 * 400x600 chrome, this view returns body content with a flex column root.
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { UnlockVaultView } from './UnlockVaultView';

const noop = (): void => undefined;
const noopAsync = async (): Promise<{ success: boolean; error?: string }> => ({ success: true });

describe('UnlockVaultView', () => {
  it('renders a passphrase input and an unlock button', () => {
    render(
      <UnlockVaultView
        onUnlock={noopAsync}
        onUnlockSuccess={noop}
        onCancel={noop}
      />
    );

    expect(screen.getByLabelText(/passphrase/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /unlock/i })).toBeInTheDocument();
  });

  it('calls onUnlock with the entered passphrase on submit', async () => {
    const onUnlock = vi.fn(async () => ({ success: true }));

    render(
      <UnlockVaultView
        onUnlock={onUnlock}
        onUnlockSuccess={noop}
        onCancel={noop}
      />
    );

    fireEvent.change(screen.getByLabelText(/passphrase/i), {
      target: { value: 'open-sesame' },
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));

    await waitFor(() => {
      expect(onUnlock).toHaveBeenCalledWith('open-sesame');
    });
  });

  it('disables the unlock button while isUnlocking=true', () => {
    render(
      <UnlockVaultView
        onUnlock={noopAsync}
        onUnlockSuccess={noop}
        onCancel={noop}
        isUnlocking={true}
      />
    );

    const button = screen.getByRole('button', { name: /unlock/i });
    expect(button).toBeDisabled();
  });

  it('calls onCancel when the back button is clicked', () => {
    const onCancel = vi.fn();

    render(
      <UnlockVaultView
        onUnlock={noopAsync}
        onUnlockSuccess={noop}
        onCancel={onCancel}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /back/i }));

    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  it('surfaces the unlock error message from onUnlock', async () => {
    const onUnlock = vi.fn(async () => ({
      success: false,
      error: 'Incorrect passphrase',
    }));

    render(
      <UnlockVaultView
        onUnlock={onUnlock}
        onUnlockSuccess={noop}
        onCancel={noop}
      />
    );

    fireEvent.change(screen.getByLabelText(/passphrase/i), {
      target: { value: 'wrong' },
    });
    fireEvent.click(screen.getByRole('button', { name: /unlock/i }));

    await waitFor(() => {
      expect(screen.getByText(/incorrect passphrase/i)).toBeInTheDocument();
    });
  });
});
