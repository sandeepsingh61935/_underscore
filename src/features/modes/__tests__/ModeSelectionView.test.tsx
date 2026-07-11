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
        initialMode="pro"
        isAuthenticated={true}
      />
    );

    expect(screen.getByRole('button', { name: /Continue as Pro/i })).toBeInTheDocument();
  });

  it('defaults to basic when initialMode is not provided', () => {
    render(<ModeSelectionView />);
    expect(screen.getByRole('button', { name: /Continue as Basic/i })).toBeInTheDocument();
  });

  it('calls onModeSelect (not onSignInClick) when pro is selected and user is authenticated', () => {
    const onModeSelect = vi.fn();
    const onSignInClick = vi.fn();

    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        onSignInClick={onSignInClick}
        initialMode="pro"
        isAuthenticated={true}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue as Pro/i }));
    expect(onModeSelect).toHaveBeenCalledWith('pro');
    expect(onSignInClick).not.toHaveBeenCalled();
  });

  it('calls onSignInClick with mode id when pro is selected and user is not authenticated', () => {
    const onModeSelect = vi.fn();
    const onSignInClick = vi.fn();

    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        onSignInClick={onSignInClick}
        initialMode="pro"
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue as Pro/i }));
    expect(onSignInClick).toHaveBeenCalledWith('pro');
    expect(onModeSelect).not.toHaveBeenCalled();
  });

  it('calls onModeSelect for basic mode regardless of auth state', () => {
    const onModeSelect = vi.fn();
    const onSignInClick = vi.fn();

    render(
      <ModeSelectionView
        onModeSelect={onModeSelect}
        onSignInClick={onSignInClick}
        initialMode="basic"
        isAuthenticated={false}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /Continue as Basic/i }));
    expect(onModeSelect).toHaveBeenCalledWith('basic');
    expect(onSignInClick).not.toHaveBeenCalled();
  });
});
