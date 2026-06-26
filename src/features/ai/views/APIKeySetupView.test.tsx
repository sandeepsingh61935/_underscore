import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { APIKeySetupView } from './APIKeySetupView';
import * as useAPIKeyStatusModule from '../hooks/useAPIKeyStatus';
import * as useLLMHealthCheckModule from '../hooks/useLLMHealthCheck';

vi.mock('../hooks/useAPIKeyStatus');
vi.mock('../hooks/useLLMHealthCheck');

const mockUseAPIKeyStatus = useAPIKeyStatusModule.useAPIKeyStatus as any;
const mockUseLLMHealthCheck = useLLMHealthCheckModule.useLLMHealthCheck as any;

describe('APIKeySetupView', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseLLMHealthCheck.mockReturnValue({ run: vi.fn() });
    global.browser = {
      storage: {
        local: {
          get: vi.fn().mockResolvedValue({}),
          set: vi.fn().mockResolvedValue(undefined),
        }
      }
    } as any;
  });

  it('renders standard empty input when key is not set', () => {
    mockUseAPIKeyStatus.mockReturnValue({ configured: false, save: vi.fn() });
    render(<APIKeySetupView onClose={vi.fn()} />);

    expect(screen.queryByText(/✓ Configured/i)).not.toBeInTheDocument();
    const input = screen.getByPlaceholderText(/sk-ant-/i);
    expect(input).toBeInTheDocument();
  });

  it('renders configured badge and updated placeholder when key is set', () => {
    mockUseAPIKeyStatus.mockReturnValue({ configured: true, save: vi.fn() });
    render(<APIKeySetupView onClose={vi.fn()} />);

    expect(screen.getByText(/✓ Configured/i)).toBeInTheDocument();
    const input = screen.getByPlaceholderText(/Key is saved/i);
    expect(input).toBeInTheDocument();
  });
});
