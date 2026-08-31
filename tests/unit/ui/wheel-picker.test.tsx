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

    const wheel = new WheelEvent('wheel', {
      deltaY: 100,
      bubbles: true,
      cancelable: true,
    });
    const prevented = !picker.dispatchEvent(wheel);
    expect(prevented).toBe(true);
    expect(onSelect).toHaveBeenCalledWith(1);
  });

  it('renders looped rows for circular wheel continuity', () => {
    const items = Array.from({ length: 20 }, (_, i) => ({
      id: `preset-${i}`,
      label: `Preset ${i + 1}`,
    }));
    const { getAllByRole } = render(
      <WheelPicker items={items} selectedIndex={0} onSelectIndex={vi.fn()} />
    );
    // 20 items + 1 wrap-before + 1 wrap-after
    expect(getAllByRole('button')).toHaveLength(22);
  });

  it('shows wrap neighbor at top when first item is selected', () => {
    const items = [
      { id: 'a', label: 'Alpha' },
      { id: 'b', label: 'Beta' },
      { id: 'c', label: 'Gamma' },
    ];
    const { getAllByRole } = render(
      <WheelPicker items={items} selectedIndex={0} onSelectIndex={vi.fn()} />
    );
    const buttons = getAllByRole('button');
    expect(buttons[0]?.textContent).toBe('Gamma');
    expect(buttons[1]?.textContent).toBe('Alpha');
    expect(buttons[2]?.textContent).toBe('Beta');
  });
});
