import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { TabBar } from './TabBar';

describe('TabBar component', () => {
  it('renders all 4 primary navigation tabs in order', () => {
    render(<TabBar active="home" onChange={vi.fn()} />);

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent('Home');
    expect(buttons[1]).toHaveTextContent('Library');
    expect(buttons[2]).toHaveTextContent('Groups');
    expect(buttons[3]).toHaveTextContent('Settings');
  });

  it('marks the active tab with aria-current="page" and active class', () => {
    const { rerender } = render(<TabBar active="groups" onChange={vi.fn()} />);

    const groupsTab = screen.getByTestId('tab-groups');
    expect(groupsTab).toHaveClass('active');
    expect(groupsTab).toHaveAttribute('aria-current', 'page');

    const homeTab = screen.getByTestId('tab-home');
    expect(homeTab).not.toHaveClass('active');
    expect(homeTab).not.toHaveAttribute('aria-current');

    // Switch active tab
    rerender(<TabBar active="settings" onChange={vi.fn()} />);
    const settingsTab = screen.getByTestId('tab-settings');
    expect(settingsTab).toHaveClass('active');
    expect(settingsTab).toHaveAttribute('aria-current', 'page');
    expect(groupsTab).not.toHaveClass('active');
  });

  it('calls onChange with the tab id when clicked', () => {
    const onChange = vi.fn();
    render(<TabBar active="home" onChange={onChange} />);

    fireEvent.click(screen.getByTestId('tab-groups'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith('groups');

    fireEvent.click(screen.getByTestId('tab-collections'));
    expect(onChange).toHaveBeenCalledTimes(2);
    expect(onChange).toHaveBeenCalledWith('collections');

    fireEvent.click(screen.getByTestId('tab-settings'));
    expect(onChange).toHaveBeenCalledTimes(3);
    expect(onChange).toHaveBeenCalledWith('settings');
  });
});
