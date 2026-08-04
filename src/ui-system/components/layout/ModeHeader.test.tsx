import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { ModeHeader } from './ModeHeader';

describe('ModeHeader', () => {
  it('renders back control when onBack provided', () => {
    render(<ModeHeader onBack={vi.fn()} backLabel="Library" />);
    expect(screen.getByText('← Library')).toBeInTheDocument();
  });

  it('does not render Switch', () => {
    render(<ModeHeader modeId="basic" onSwitch={vi.fn()} />);
    expect(screen.queryByText(/switch/i)).not.toBeInTheDocument();
  });

  it('does not show mode essay when no onBack', () => {
    render(<ModeHeader modeId="basic" />);
    expect(screen.queryByText(/on this device/i)).not.toBeInTheDocument();
  });

  it('returns null when onBack is not provided', () => {
    const { container } = render(<ModeHeader modeId="basic" onSwitch={vi.fn()} />);
    expect(container.firstChild).toBeNull();
  });

  it('uses default Back label when backLabel omitted', () => {
    render(<ModeHeader onBack={vi.fn()} />);
    expect(screen.getByText('← Back')).toBeInTheDocument();
  });
});
