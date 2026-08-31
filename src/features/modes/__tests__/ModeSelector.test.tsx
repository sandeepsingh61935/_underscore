import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ModeSelector } from '../ModeSelector';
import type { ModeDefinition } from '../registry';

const mockModes: ModeDefinition[] = [
  {
    id: 'basic',
    name: 'Basic',
    altName: 'On this device',
    family: 'device',
    tag: 'Permanent',
    blurb: 'Test blurb 1',
    motif: '◷',
    accent: 'var(--mode-basic)',
    persistence: 'permanent',
    signin: false,
    ttlConfigurable: false,
    enabled: true,
    order: 1,
  },
  {
    id: 'pro',
    name: 'Pro',
    altName: 'Persistent cloud',
    family: 'cloud',
    tag: 'Synced',
    blurb: 'Test blurb 2',
    motif: '◇',
    accent: 'var(--mode-pro)',
    persistence: 'synced',
    signin: true,
    ttlConfigurable: false,
    enabled: true,
    order: 2,
    badge: 'New',
  },
];

describe('ModeSelector', () => {
  it('renders all modes with names, descriptions, and badges', () => {
    render(<ModeSelector modes={mockModes} currentModeId="basic" onSelect={() => {}} />);

    // Check first mode
    expect(screen.getByText('Basic')).toBeInTheDocument();
    expect(screen.getByText('Test blurb 1')).toBeInTheDocument();

    // Check second mode with badge
    expect(screen.getByText('Pro')).toBeInTheDocument();
    expect(screen.getByText('Test blurb 2')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
  });

  it('fires onSelect with mode ID when clicked', () => {
    const onSelect = vi.fn();
    render(<ModeSelector modes={mockModes} currentModeId="basic" onSelect={onSelect} />);

    fireEvent.click(screen.getByText('Pro'));
    expect(onSelect).toHaveBeenCalledWith('pro');
  });

  it('respects disabled prop', () => {
    const onSelect = vi.fn();
    render(
      <ModeSelector
        modes={mockModes}
        currentModeId="basic"
        onSelect={onSelect}
        disabled={true}
      />
    );

    const button = screen.getByText('Pro').closest('button');
    expect(button).toBeDisabled();

    if (button) fireEvent.click(button);
    expect(onSelect).not.toHaveBeenCalled();
  });
});
