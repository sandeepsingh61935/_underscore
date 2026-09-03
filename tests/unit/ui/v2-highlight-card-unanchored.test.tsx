import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';

describe('HighlightCard unanchored recovery UI', () => {
  it('does not render unanchored pill or re-anchor button when isUnanchored is false or omitted', () => {
    render(
      <HighlightCard
        quote="Test quote"
        domain="example.com"
      />
    );

    expect(screen.queryByText(/Unanchored/i)).toBeNull();
    expect(screen.queryByRole('button', { name: /Re-anchor to selection/i })).toBeNull();
  });

  it('renders "Unanchored (Page modified)" pill and "Re-anchor to selection" button when isUnanchored is true', () => {
    const onReanchor = vi.fn();

    render(
      <HighlightCard
        quote="Drifted quote on modified page"
        domain="example.com"
        isUnanchored={true}
        onReanchor={onReanchor}
      />
    );

    // Verify unanchored status pill
    const pill = screen.getByText(/Unanchored \(Page modified\)/i);
    expect(pill).toBeInTheDocument();

    // Verify re-anchor button
    const reanchorBtn = screen.getByRole('button', { name: /Re-anchor to selection/i });
    expect(reanchorBtn).toBeInTheDocument();

    // Verify click triggers onReanchor
    fireEvent.click(reanchorBtn);
    expect(onReanchor).toHaveBeenCalledTimes(1);
  });

  it('disables or prevents re-anchor when canReanchor is false', () => {
    const onReanchor = vi.fn();

    render(
      <HighlightCard
        quote="Drifted quote"
        domain="example.com"
        isUnanchored={true}
        canReanchor={false}
        onReanchor={onReanchor}
      />
    );

    const reanchorBtn = screen.getByRole('button', { name: /Re-anchor to selection/i });
    expect(reanchorBtn).toBeDisabled();
  });
});
