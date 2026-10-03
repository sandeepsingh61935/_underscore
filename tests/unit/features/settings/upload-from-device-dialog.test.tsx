/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import { previewHasPending } from '@/background/services/interfaces/i-device-library-upload';
import { formatUploadSubtitle } from '@/features/collections/hooks/use-upload-from-device';
import { UploadFromDeviceDialog } from '@/features/settings/components/UploadFromDeviceDialog';

describe('UploadFromDeviceDialog', () => {
  it('renders copy for highlights only', () => {
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={3}
        isUploading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByText(
        'This device has 3 guest highlights not in test@example.com. Add them to this account?'
      )
    ).toBeInTheDocument();
  });

  it('renders copy for groups only', () => {
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={0}
        pendingGroupCount={2}
        pendingGroupItemCount={5}
        isUploading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByText(
        'This device has 2 guest groups (5 items) not in test@example.com. Add them to this account?'
      )
    ).toBeInTheDocument();

    const confirmBtn = screen.getByTestId('device-upload-confirm');
    expect(confirmBtn).not.toBeDisabled();
  });

  it('renders singular noun for 1 group and 1 item', () => {
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={0}
        pendingGroupCount={1}
        pendingGroupItemCount={1}
        isUploading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByText(
        'This device has 1 guest group (1 item) not in test@example.com. Add them to this account?'
      )
    ).toBeInTheDocument();
  });

  it('renders copy for both highlights and groups', () => {
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={1}
        pendingGroupCount={2}
        pendingGroupItemCount={4}
        isUploading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    expect(
      screen.getByText(
        'This device has 1 guest highlight and 2 groups (4 items) not in test@example.com. Add them to this account?'
      )
    ).toBeInTheDocument();
  });

  it('disables confirm button when both pending counts are 0', () => {
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={0}
        pendingGroupCount={0}
        pendingGroupItemCount={0}
        isUploading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const confirmBtn = screen.getByTestId('device-upload-confirm');
    expect(confirmBtn).toBeDisabled();
  });

  it('disables confirm button while uploading', () => {
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={2}
        pendingGroupCount={1}
        isUploading={true}
        error={null}
        onClose={vi.fn()}
        onConfirm={vi.fn()}
      />
    );
    const confirmBtn = screen.getByTestId('device-upload-confirm');
    expect(confirmBtn).toBeDisabled();
    expect(confirmBtn).toHaveTextContent('Uploading…');
  });

  it('calls onConfirm when confirm button clicked', () => {
    const onConfirm = vi.fn();
    render(
      <UploadFromDeviceDialog
        open={true}
        email="test@example.com"
        pendingCount={2}
        isUploading={false}
        error={null}
        onClose={vi.fn()}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByTestId('device-upload-confirm'));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});

describe('formatUploadSubtitle', () => {
  it('formats groups when groupsCopiedCount > 0', () => {
    const text1 = formatUploadSubtitle({
      copiedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      tagsCopiedCount: 0,
      groupsCopiedCount: 1,
      groupItemsCopiedCount: 2,
      queueFlushed: true,
    });
    expect(text1).toBe('1 group');

    const text2 = formatUploadSubtitle({
      copiedCount: 3,
      skippedCount: 1,
      failedCount: 0,
      tagsCopiedCount: 2,
      groupsCopiedCount: 2,
      groupItemsCopiedCount: 4,
      queueFlushed: true,
    });
    expect(text2).toBe('3 uploaded · 2 groups · 1 already in account · 2 tagged');
  });

  it('returns fallback message when empty', () => {
    const text = formatUploadSubtitle({
      copiedCount: 0,
      skippedCount: 0,
      failedCount: 0,
      tagsCopiedCount: 0,
      groupsCopiedCount: 0,
      groupItemsCopiedCount: 0,
      queueFlushed: true,
    });
    expect(text).toBe('Nothing new on this device');
  });
});

describe('previewHasPending', () => {
  it('returns true if any count is greater than zero', () => {
    expect(
      previewHasPending({
        pendingCount: 1,
        pendingGroupCount: 0,
        pendingGroupItemCount: 0,
        email: null,
      })
    ).toBe(true);

    expect(
      previewHasPending({
        pendingCount: 0,
        pendingGroupCount: 1,
        pendingGroupItemCount: 0,
        email: null,
      })
    ).toBe(true);

    expect(
      previewHasPending({
        pendingCount: 0,
        pendingGroupCount: 0,
        pendingGroupItemCount: 1,
        email: null,
      })
    ).toBe(true);
  });

  it('returns false when all counts are 0', () => {
    expect(
      previewHasPending({
        pendingCount: 0,
        pendingGroupCount: 0,
        pendingGroupItemCount: 0,
        email: null,
      })
    ).toBe(false);
  });
});
