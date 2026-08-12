import React from 'react';
import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';

import { AskModelChip } from './AskModelChip';
import type { AskModelOption } from '@/shared/llm/ask-model-options';

const OPTIONS: AskModelOption[] = [
  {
    provider: 'openai',
    modelId: 'gpt-4o-mini',
    providerLabel: 'OpenAI',
    modelLabel: 'gpt-4o-mini',
    label: 'OpenAI · gpt-4o-mini',
  },
  {
    provider: 'anthropic',
    modelId: 'claude-sonnet-4-6',
    providerLabel: 'Anthropic',
    modelLabel: 'claude-sonnet-4-6',
    label: 'Anthropic · claude-sonnet-4-6',
  },
];

describe('AskModelChip', () => {
  it('shows active label and opens configured menu', () => {
    const onSelect = vi.fn();
    const onManage = vi.fn();
    render(
      <AskModelChip
        options={OPTIONS}
        activeProvider="openai"
        activeLabel="OpenAI · gpt-4o-mini"
        onSelect={onSelect}
        onManage={onManage}
      />,
    );

    expect(screen.getByTestId('ask-model-chip-trigger').textContent).toMatch(
      /OpenAI · gpt-4o-mini/,
    );
    fireEvent.click(screen.getByTestId('ask-model-chip-trigger'));
    expect(screen.getByTestId('ask-model-chip-menu')).toBeTruthy();
    fireEvent.click(screen.getByTestId('ask-model-chip-option-anthropic'));
    expect(onSelect).toHaveBeenCalledWith('anthropic');
  });

  it('empty: Add provider CTA calls onManage', () => {
    const onManage = vi.fn();
    render(
      <AskModelChip
        options={[]}
        activeProvider={null}
        activeLabel="No model"
        onSelect={vi.fn()}
        onManage={onManage}
        emptyCta="Add provider"
      />,
    );

    expect(screen.getByTestId('ask-model-chip-trigger').textContent).toMatch(/No model/);
    fireEvent.click(screen.getByTestId('ask-model-chip-empty-cta'));
    expect(onManage).toHaveBeenCalledTimes(1);
  });

  it('Manage row routes to settings', () => {
    const onManage = vi.fn();
    render(
      <AskModelChip
        options={OPTIONS}
        activeProvider="openai"
        activeLabel="OpenAI · gpt-4o-mini"
        onSelect={vi.fn()}
        onManage={onManage}
      />,
    );

    fireEvent.click(screen.getByTestId('ask-model-chip-trigger'));
    fireEvent.click(screen.getByTestId('ask-model-chip-manage'));
    expect(onManage).toHaveBeenCalledTimes(1);
  });

  it('surfaces selectError', () => {
    render(
      <AskModelChip
        options={OPTIONS}
        activeProvider="openai"
        activeLabel="OpenAI · gpt-4o-mini"
        onSelect={vi.fn()}
        onManage={vi.fn()}
        selectError="Could not switch model"
      />,
    );
    expect(screen.getByTestId('ask-model-chip-error').textContent).toMatch(
      /Could not switch model/,
    );
  });
});
