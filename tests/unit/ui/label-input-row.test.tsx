import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { LabelInputRow } from '@/ui-system/components/composed/LabelInputRow';

describe('LabelInputRow', () => {
  const baseProps = {
    labels: ['alpha'],
    onRemoveLabel: vi.fn(),
    onAddLabel: vi.fn(),
    draft: '',
    onDraftChange: vi.fn(),
    suggestions: ['alpha', 'beta', 'book'],
  };

  it('commits a label on Enter and comma', () => {
    const onAddLabel = vi.fn();
    const onDraftChange = vi.fn();

    render(
      <LabelInputRow
        {...baseProps}
        draft="new-label"
        onAddLabel={onAddLabel}
        onDraftChange={onDraftChange}
      />
    );

    const input = screen.getByLabelText('Add tag');
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onAddLabel).toHaveBeenCalledWith('new-label');

    fireEvent.keyDown(input, { key: ',' });
    expect(onAddLabel).toHaveBeenCalledTimes(2);
  });

  it('picks a ghost suggestion inline', () => {
    const onAddLabel = vi.fn();
    render(<LabelInputRow {...baseProps} draft="bo" onAddLabel={onAddLabel} />);

    fireEvent.click(screen.getByText('+ book'));
    expect(onAddLabel).toHaveBeenCalledWith('book');
  });

  it('embedded variant has no own border chrome', () => {
    const { container } = render(<LabelInputRow {...baseProps} variant="embedded" />);

    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-variant')).toBe('embedded');
    expect(root.style.borderWidth).toBe('0px');
    expect(root.style.background).toBe('transparent');
    expect(screen.getByLabelText('Add tag')).toBeTruthy();
  });

  it('tray variant keeps its own bordered chrome by default', () => {
    const { container } = render(<LabelInputRow {...baseProps} />);
    const root = container.firstElementChild as HTMLElement;
    expect(root.getAttribute('data-variant')).toBe('tray');
    expect(root.style.border).toContain('1px');
  });
});
