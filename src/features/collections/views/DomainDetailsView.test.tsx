import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { DomainDetailsView } from './DomainDetailsView';
import * as appContext from '@/core/context/AppProvider';
import * as useHighlightsByDomainFactory from '@/features/collections/hooks/useHighlightsByDomainFactory';
import * as useGenerateSummaryModule from '@/features/ai/hooks/useGenerateSummary';

vi.mock('react-router-dom', () => ({
  useParams: () => ({ domain: 'example.com' }),
  useNavigate: () => vi.fn(),
}));

vi.mock('@/core/context/AppProvider');
vi.mock('@/features/collections/hooks/useHighlightsByDomainFactory');
vi.mock('@/features/ai/hooks/useGenerateSummary');

const mockUseApp = appContext.useApp as any;
const mockUseHighlights = useHighlightsByDomainFactory.useHighlightsByDomain as any;
const mockUseGenerateSummary = useGenerateSummaryModule.useGenerateSummary as any;

describe('DomainDetailsView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseApp.mockReturnValue({ isAuthenticated: true, currentMode: 'cloud' });
    mockUseHighlights.mockReturnValue({
      highlights: [
        { id: '1', text: 'test', url: 'https://example.com/path1', path: '/path1' },
      ],
      isLoading: false,
    });
    mockUseGenerateSummary.mockReturnValue({
      start: vi.fn(),
      status: 'idle',
      chunks: null,
    });
  });

  it('renders tab switcher and defaults to Sections', () => {
    render(<DomainDetailsView domain="example.com" />);
    
    // Check tabs exist
    expect(screen.getByRole('button', { name: /Sections/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Summaries/i })).toBeInTheDocument();

    // Sections should be visible initially
    expect(screen.getByText('/path1')).toBeInTheDocument();
  });

  it('switches to Summaries tab and shows generation button and helper text', () => {
    render(<DomainDetailsView domain="example.com" />);

    // Click Summaries tab
    fireEvent.click(screen.getByRole('button', { name: /Summaries/i }));

    // The Generate AI Summary button should appear
    const btn = screen.getByRole('button', { name: /Generate AI Summary/i });
    expect(btn).toBeInTheDocument();

    // The helper text should appear
    expect(screen.getByText(/Creates a temporary summary/i)).toBeInTheDocument();

    // The sections list should not be visible
    expect(screen.queryByText('/path1')).not.toBeInTheDocument();
  });

  it('renders progress steps when status is not idle', () => {
    // 1. Connecting state
    mockUseGenerateSummary.mockReturnValue({
      start: vi.fn(),
      status: 'streaming',
      chunks: '', // no chunks yet means connecting
    });
    const { rerender } = render(<DomainDetailsView domain="example.com" />);
    fireEvent.click(screen.getByRole('button', { name: /Summaries/i }));
    
    expect(screen.getByText(/Connecting to AI provider/i)).toBeInTheDocument();
    
    // 2. Generating state
    mockUseGenerateSummary.mockReturnValue({
      start: vi.fn(),
      status: 'streaming',
      chunks: 'Summary started...',
    });
    rerender(<DomainDetailsView domain="example.com" />);
    
    expect(screen.getByText(/Reading highlights and generating summary/i)).toBeInTheDocument();
    
    // 3. Done state
    mockUseGenerateSummary.mockReturnValue({
      start: vi.fn(),
      status: 'done',
      chunks: 'Final summary text.',
    });
    rerender(<DomainDetailsView domain="example.com" />);
    
    expect(screen.getByText(/Summary complete/i)).toBeInTheDocument();
  });

});
