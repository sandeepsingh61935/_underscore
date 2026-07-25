/**
 * @vitest-environment jsdom
 */

import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import { describe, it, expect, vi } from 'vitest';

import { ModelPickerList, type ModelPickerListProps } from '@/features/ai/components/ModelPickerList';
import { CUSTOM_MODEL_ID } from '@/features/ai/constants/provider-setup';
import type { ProviderModelOption } from '@/shared/llm/provider-models';

const MODELS: ProviderModelOption[] = [
  { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6' },
  { id: 'claude-haiku-4-5', label: 'Claude Haiku 4.5' },
];

function baseProps(overrides: Partial<ModelPickerListProps> = {}): ModelPickerListProps {
  return {
    models: MODELS,
    selectedId: 'claude-sonnet-4-6',
    onSelect: vi.fn(),
    customModelId: '',
    onCustomModelIdChange: vi.fn(),
    ...overrides,
  };
}

describe('ModelPickerList', () => {
  it('filters models by label and id as the user types', () => {
    render(<ModelPickerList {...baseProps()} />);

    expect(screen.getByText('Claude Sonnet 4.6')).toBeInTheDocument();
    expect(screen.getByText('Claude Haiku 4.5')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'haiku' } });

    expect(screen.queryByText('Claude Sonnet 4.6')).not.toBeInTheDocument();
    expect(screen.getByText('Claude Haiku 4.5')).toBeInTheDocument();
  });

  it('shows an empty-results message when the search matches nothing', () => {
    render(<ModelPickerList {...baseProps()} />);

    fireEvent.change(screen.getByPlaceholderText('Search…'), { target: { value: 'nonexistent' } });

    expect(screen.getByText('No matches')).toBeInTheDocument();
  });

  it('does not select disabled rows', () => {
    const onSelect = vi.fn();
    render(
      <ModelPickerList
        {...baseProps({ onSelect, isModelDisabled: m => m.id === 'claude-haiku-4-5' })}
      />,
    );

    fireEvent.click(screen.getByText('Claude Haiku 4.5'));
    expect(onSelect).not.toHaveBeenCalled();

    fireEvent.click(screen.getByText('Claude Sonnet 4.6'));
    expect(onSelect).toHaveBeenCalledWith('claude-sonnet-4-6');
  });

  it('keeps the custom model ID disclosure collapsed until "Custom ID" is expanded', () => {
    render(<ModelPickerList {...baseProps()} />);

    expect(screen.queryByLabelText('Custom model ID')).not.toBeInTheDocument();

    fireEvent.click(screen.getByText('Custom ID'));
    expect(screen.getByLabelText('Custom model ID')).toBeInTheDocument();
  });

  it('selects the custom model ID once the user types a value', () => {
    const onSelect = vi.fn();
    const onCustomModelIdChange = vi.fn();
    render(<ModelPickerList {...baseProps({ onSelect, onCustomModelIdChange })} />);

    fireEvent.click(screen.getByText('Custom ID'));
    fireEvent.change(screen.getByLabelText('Custom model ID'), { target: { value: 'my-model:latest' } });

    expect(onCustomModelIdChange).toHaveBeenCalledWith('my-model:latest');
    expect(onSelect).toHaveBeenCalledWith(CUSTOM_MODEL_ID);
  });

  it('starts with the disclosure expanded when a custom model is already selected', () => {
    render(
      <ModelPickerList
        {...baseProps({ selectedId: CUSTOM_MODEL_ID, customModelId: 'saved-model' })}
      />,
    );

    expect(screen.getByLabelText('Custom model ID')).toBeInTheDocument();
    expect(screen.getByDisplayValue('saved-model')).toBeInTheDocument();
  });
});
