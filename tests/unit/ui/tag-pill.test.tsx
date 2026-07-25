import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { TagPill } from '@/ui-system/components/primitives/TagPill';

describe('TagPill', () => {
  it('renders a compact 20px pill without a 44px remove target', () => {
    const onRemove = vi.fn();
    const { container } = render(<TagPill label="research" onRemove={onRemove} />);

    const pill = container.querySelector('span');
    expect(pill).not.toBeNull();
    expect(pill?.style.height).toBe('20px');

    const removeButton = screen.getByRole('button', { name: 'Remove research' });
    expect(removeButton.style.width).toBe('16px');
    expect(removeButton.style.height).toBe('16px');

    fireEvent.click(removeButton);
    expect(onRemove).toHaveBeenCalledTimes(1);
  });

  it('renders ghost suggestion pills with a dashed border affordance', () => {
    const onPick = vi.fn();
    render(<TagPill ghost label="todo" onPick={onPick} />);

    fireEvent.click(screen.getByRole('button'));
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(screen.getByText('+ todo')).toBeTruthy();
  });
});
