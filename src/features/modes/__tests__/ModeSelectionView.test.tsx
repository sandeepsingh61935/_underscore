import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelectionView } from '../ModeSelectionView';

describe('ModeSelectionView', () => {
  it('pre-selects initialMode when provided', () => {
    const onModeSelect = vi.fn();
    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        initialMode="cloud"
        isAuthenticated={true}
      />
    );

    expect(screen.getByRole('button', { name: /Continue as Cloud/i })).toBeInTheDocument();
  });

  it('defaults to local when initialMode is not provided', () => {
    render(<ModeSelectionView />);
    expect(screen.getByRole('button', { name: /Continue as Local/i })).toBeInTheDocument();
  });

  it('calls onModeSelect (not onSignInClick) when cloud is selected and user is authenticated', () => {
    const onModeSelect = vi.fn();
    const onSignInClick = vi.fn();

    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        onSignInClick={onSignInClick}
        initialMode="cloud"
        isAuthenticated={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue as Cloud/i }));
    expect(onModeSelect).toHaveBeenCalledWith('cloud');
    expect(onSignInClick).not.toHaveBeenCalled();
  });

  it('calls onSignInClick with mode id when cloud is selected and user is not authenticated', () => {
    const onModeSelect = vi.fn();
    const onSignInClick = vi.fn();

    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        onSignInClick={onSignInClick}
        initialMode="cloud"
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue as Cloud/i }));
    expect(onSignInClick).toHaveBeenCalledWith('cloud');
    expect(onModeSelect).not.toHaveBeenCalled();
  });

  it('calls onModeSelect for local mode regardless of auth state', () => {
    const onModeSelect = vi.fn();
    const onSignInClick = vi.fn();

    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        onSignInClick={onSignInClick}
        initialMode="local"
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue as Local/i }));
    expect(onModeSelect).toHaveBeenCalledWith('local');
    expect(onSignInClick).not.toHaveBeenCalled();
  });
});
