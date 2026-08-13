/**
 * @vitest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

import { ModelsHubPanel } from '@/features/ai/components/ModelsHubPanel';

describe('ModelsHubPanel', () => {
  it('states device-local keys and never mentions MCP or Connect agent', () => {
    render(
      <ModelsHubPanel
        activeProvider={null}
        activeModelId={null}
        statuses={{}}
        onOpenProvider={vi.fn()}
        onChangeActiveModel={vi.fn()}
      />,
    );

    const root = screen.getByTestId('models-hub');
    expect(root.textContent ?? '').toMatch(/this device/i);
    expect(root.textContent ?? '').not.toMatch(/MCP|OAuth|JWT|Connect agent|remote URL/i);
    expect(screen.getByText('OpenAI')).toBeTruthy();
    expect(screen.getByText('Ollama')).toBeTruthy();
  });
});
