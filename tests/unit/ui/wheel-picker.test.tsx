import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render } from '@testing-library/react';

import { WheelPicker } from '@/ui-system/components/composed/WheelPicker';

describe('WheelPicker', () => {
  it('does not arm wheel until pointer down', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <WheelPicker
        items={[
          { id: 'a', label: 'Alpha' },
          { id: 'b', label: 'Beta' },
        ]}
        selectedIndex={0}
        onSelectIndex={onSelect}
      />
    );

    const picker = container.firstChild as HTMLElement;
    const wheel = new WheelEvent('wheel', { deltaY: 100, bubbles: true });
    picker.dispatchEvent(wheel);
    expect(onSelect).not.toHaveBeenCalled();
  });

  it('scrolls when armed and prevents default on wheel', () => {
    const onSelect = vi.fn();
    const { container } = render(
      <WheelPicker
        items={[
          { id: 'a', label: 'Alpha' },
          { id: 'b', label: 'Beta' },
        ]}
        selectedIndex={0}
        onSelectIndex={onSelect}
      />
    );

    const picker = container.firstChild as HTMLElement;
    fireEvent.pointerDown(picker);

    const wheel = new WheelEvent('wheel', { deltaY: 100, bubbles: true, cancelable: true });
    const prevented = !picker.dispatchEvent(wheel);
    expect(prevented).toBe(true);
    expect(onSelect).toHaveBeenCalledWith(1);
  });
});
