import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { TabBar } from './TabBar';

describe('TabBar', () => {
  it('renders four tabs in order: Home, Library, Ask, Settings', () => {
    render(<TabBar active="home" onChange={vi.fn()} />);
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);
    expect(buttons[0]).toHaveTextContent('Home');
    expect(buttons[1]).toHaveTextContent('Library');
    expect(buttons[2]).toHaveTextContent('Ask');
    expect(buttons[3]).toHaveTextContent('Settings');
  });

  it('marks the active tab with the "active" class', () => {
    render(<TabBar active="collections" onChange={vi.fn()} />);
    expect(screen.getByText('Library').className).toContain('active');
    expect(screen.getByText('Home').className).not.toContain('active');
  });

  it('invokes onChange with the tab id when a tab is clicked', () => {
    const onChange = vi.fn();
    render(<TabBar active="home" onChange={onChange} />);
    fireEvent.click(screen.getByText('Settings'));
    expect(onChange).toHaveBeenCalledWith('settings');
  });

  it('invokes onChange with ask', () => {
    const onChange = vi.fn();
    render(<TabBar active="home" onChange={onChange} />);
    fireEvent.click(screen.getByText('Ask'));
    expect(onChange).toHaveBeenCalledWith('ask');
  });
});
