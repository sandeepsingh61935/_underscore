/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { DeleteConfirmDialog } from '@/features/collections/components/DeleteConfirmDialog';
import {
  deleteDomainCopy,
  deleteLibraryCopy,
  signOutCopy,
} from '@/shared/utils/confirm-dialog-copy';

describe('DeleteConfirmDialog', () => {
  it('renders copy that names the object', () => {
    const copy = deleteDomainCopy('news.ycombinator.com', 8);
    render(
      <DeleteConfirmDialog
        open
        title={copy.title}
        message={copy.message}
        note={copy.note}
        strongNames={copy.strongNames}
        confirmLabel={copy.confirmLabel}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );

    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(copy.title)).toBeInTheDocument();
    expect(screen.getByTestId('confirm-dialog-message').textContent).toContain(
      'news.ycombinator.com',
    );
    expect(screen.getByTestId('confirm-dialog-message').querySelector('strong')?.textContent).toBe(
      'news.ycombinator.com',
    );
    expect(screen.getByTestId('confirm-dialog-note').textContent).toMatch(/cannot be undone/i);
  });

  it('Cancel is safe — does not call onConfirm', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        title="Delete?"
        message="Gone forever."
        onClose={onClose}
        onConfirm={onConfirm}
      />,
    );

    fireEvent.click(screen.getByTestId('confirm-dialog-cancel'));
    expect(onClose).toHaveBeenCalledOnce();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('busy state disables actions and shows Working…', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        title="Delete this domain?"
        message="Removing highlights."
        confirmLabel="Delete permanently"
        onClose={onClose}
        onConfirm={onConfirm}
        isConfirming
      />,
    );

    const cancel = screen.getByTestId('confirm-dialog-cancel');
    const confirm = screen.getByTestId('confirm-dialog-confirm');
    expect(cancel).toBeDisabled();
    expect(confirm).toBeDisabled();
    expect(confirm.textContent).toBe('Working…');

    fireEvent.click(cancel);
    fireEvent.click(confirm);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onClose).not.toHaveBeenCalled();
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('ignores confirm re-entry while isConfirming even if click is forced', () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        title="Delete?"
        message="Busy"
        onClose={() => {}}
        onConfirm={onConfirm}
        isConfirming
      />,
    );

    const confirm = screen.getByTestId('confirm-dialog-confirm');
    // forceEvent: bypass disabled so handler guard is exercised
    fireEvent(
      confirm,
      new MouseEvent('click', { bubbles: true, cancelable: true }),
    );
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('guest vs signed-in library delete copy', () => {
    const guest = deleteLibraryCopy(false);
    const { rerender } = render(
      <DeleteConfirmDialog
        open
        title={guest.title}
        message={guest.message}
        note={guest.note}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByTestId('confirm-dialog-message').textContent).toMatch(/guest/i);

    const signedIn = deleteLibraryCopy(true);
    rerender(
      <DeleteConfirmDialog
        open
        title={signedIn.title}
        message={signedIn.message}
        note={signedIn.note}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByTestId('confirm-dialog-message').textContent).toMatch(/cloud/i);
    expect(screen.getByTestId('confirm-dialog-message').textContent).not.toMatch(/guest/i);
  });

  it('confirmText challenge disables confirm until exact match', () => {
    const onConfirm = vi.fn();
    render(
      <DeleteConfirmDialog
        open
        title="Delete entire library?"
        message="All highlights go."
        confirmText="DELETE"
        onClose={() => {}}
        onConfirm={onConfirm}
      />,
    );

    const confirm = screen.getByTestId('confirm-dialog-confirm');
    const challenge = screen.getByTestId('confirm-dialog-challenge');
    expect(confirm).toBeDisabled();

    fireEvent.change(challenge, { target: { value: 'delete' } });
    expect(confirm).toBeDisabled();

    fireEvent.change(challenge, { target: { value: 'DELETE' } });
    expect(confirm).not.toBeDisabled();

    fireEvent.click(confirm);
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('export first strip is optional', () => {
    const { rerender } = render(
      <DeleteConfirmDialog
        open
        title="Delete?"
        message="Bulk"
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.queryByTestId('confirm-dialog-export')).toBeNull();

    rerender(
      <DeleteConfirmDialog
        open
        title="Delete?"
        message="Bulk"
        onClose={() => {}}
        onConfirm={() => {}}
        exportFooter={<button type="button">MD</button>}
      />,
    );
    expect(screen.getByTestId('confirm-dialog-export').textContent).toMatch(/Export first/i);
    expect(screen.getByRole('button', { name: 'MD' })).toBeInTheDocument();
  });

  it('danger vs caution confirm styling data-severity', () => {
    const danger = deleteDomainCopy('example.com', 1);
    const { rerender } = render(
      <DeleteConfirmDialog
        open
        severity={danger.severity}
        title={danger.title}
        message={danger.message}
        confirmLabel={danger.confirmLabel}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByTestId('confirm-dialog-confirm')).toHaveAttribute(
      'data-severity',
      'danger',
    );

    const caution = signOutCopy();
    rerender(
      <DeleteConfirmDialog
        open
        severity={caution.severity}
        title={caution.title}
        message={caution.message}
        note={caution.note}
        cancelLabel={caution.cancelLabel}
        confirmLabel={caution.confirmLabel}
        onClose={() => {}}
        onConfirm={() => {}}
      />,
    );
    expect(screen.getByTestId('confirm-dialog-confirm')).toHaveAttribute(
      'data-severity',
      'caution',
    );
    expect(screen.getByTestId('confirm-dialog-cancel').textContent).toBe('Stay signed in');
    expect(screen.getByTestId('confirm-dialog-confirm').textContent).toBe('Sign out');
    expect(screen.getByTestId('confirm-dialog-note').textContent).toMatch(/stay/i);
  });
});
