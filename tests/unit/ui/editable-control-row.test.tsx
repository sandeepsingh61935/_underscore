import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import { EditableControlRow } from '@/ui-system/components/composed/TypographyControls';

describe('EditableControlRow', () => {
  it('renders a compact wheel picker when valueKind is set', () => {
    const onChange = vi.fn();
    const { container, getByRole } = render(
      <EditableControlRow label="Display" value="22px" valueKind="px-scale" onChange={onChange} />
    );

    expect(container.querySelector('input')).toBeNull();
    const wheel = getByRole('generic', {
      name: 'Display value. Click to arm, then scroll or use arrow keys.',
    });
    expect(wheel).toBeTruthy();
    expect(wheel.textContent).toContain('22px');
  });

  it('steps value via wheel picker arrow keys', () => {
    const onChange = vi.fn();
    const { getByRole } = render(
      <EditableControlRow label="Display" value="22px" valueKind="px-scale" onChange={onChange} />
    );

    const wheel = getByRole('generic', {
      name: 'Display value. Click to arm, then scroll or use arrow keys.',
    });
    fireEvent.keyDown(wheel, { key: 'ArrowDown' });
    expect(onChange).toHaveBeenCalledWith('23px');
  });
});
