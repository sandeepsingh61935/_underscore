import React, { useMemo, useState } from 'react';

import type { ProviderModelOption } from '@/shared/llm/provider-models';
import { CUSTOM_MODEL_ID } from '@/features/ai/constants/provider-setup';

export interface ModelPickerListProps {
  models: ProviderModelOption[];
  selectedId: string;
  onSelect: (id: string) => void;
  customModelId: string;
  onCustomModelIdChange: (value: string) => void;
  customPlaceholder?: string;
  loading?: boolean;
  emptyMessage?: string;
  /** When true, custom model row cannot be selected. */
  customDisabled?: boolean;
  /** Return true when a catalog model cannot be selected yet. */
  isModelDisabled?: (model: ProviderModelOption) => boolean;
}

export function ModelPickerList({
  models,
  selectedId,
  onSelect,
  customModelId,
  onCustomModelIdChange,
  customPlaceholder,
  loading = false,
  emptyMessage = 'No models match your search',
  customDisabled = false,
  isModelDisabled,
}: ModelPickerListProps): React.ReactElement {
  const [query, setQuery] = useState('');
  const usingCustom = selectedId === CUSTOM_MODEL_ID;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return models;
    return models.filter(
      m => m.label.toLowerCase().includes(q) || m.id.toLowerCase().includes(q),
    );
  }, [models, query]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minHeight: 0 }}>
      <input
        type="search"
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search models…"
        aria-label="Search models"
        disabled={loading}
      />

      <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {loading ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: '12px 0' }}>
            Loading models…
          </p>
        ) : filtered.length === 0 ? (
          <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', margin: '12px 0' }}>
            {emptyMessage}
          </p>
        ) : (
          filtered.map(m => {
            const selected = !usingCustom && m.id === selectedId;
            const disabled = isModelDisabled?.(m) ?? false;
            return (
              <button
                key={m.id}
                type="button"
                disabled={disabled}
                onClick={() => { if (!disabled) onSelect(m.id); }}
                style={{
                  all: 'unset',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  opacity: disabled ? 0.45 : 1,
                  display: 'grid',
                  gridTemplateColumns: 'auto 1fr auto',
                  gap: 10,
                  alignItems: 'center',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px 4px',
                  minHeight: 44,
                  borderBottom: '1px solid var(--rule-soft)',
                  background: selected ? 'var(--paper-2)' : 'transparent',
                }}
              >
                <span className="u-mono" style={{ fontSize: 10, color: selected ? 'var(--accent)' : 'var(--ink-3)', width: 14, textAlign: 'center' }}>
                  {selected ? '●' : '○'}
                </span>
                <div style={{ minWidth: 0, textAlign: 'left' }}>
                  <div style={{ fontSize: 'var(--step-0)', color: 'var(--ink)', fontWeight: selected ? 600 : 500 }}>
                    {m.label}
                  </div>
                  <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 2 }}>
                    {m.id}
                  </div>
                </div>
                {m.hint ? (
                  <span className="u-mono" style={{ fontSize: 9, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {m.hint}
                  </span>
                ) : null}
              </button>
            );
          })
        )}

        <button
          type="button"
          disabled={customDisabled}
          onClick={() => { if (!customDisabled) onSelect(CUSTOM_MODEL_ID); }}
          style={{
            all: 'unset',
            cursor: customDisabled ? 'not-allowed' : 'pointer',
            opacity: customDisabled ? 0.45 : 1,
            display: 'grid',
            gridTemplateColumns: 'auto 1fr',
            gap: 10,
            alignItems: 'center',
            width: '100%',
            boxSizing: 'border-box',
            padding: '10px 4px',
            minHeight: 44,
            borderBottom: '1px solid var(--rule-soft)',
            background: usingCustom ? 'var(--paper-2)' : 'transparent',
          }}
        >
          <span className="u-mono" style={{ fontSize: 10, color: usingCustom ? 'var(--accent)' : 'var(--ink-3)', width: 14, textAlign: 'center' }}>
            {usingCustom ? '●' : '○'}
          </span>
          <div style={{ fontSize: 'var(--step-0)', color: 'var(--ink)' }}>Custom model ID…</div>
        </button>

        {usingCustom ? (
          <div style={{ padding: '8px 4px 0' }}>
            <label className="u-kicker" htmlFor="custom-model-id">Custom model ID</label>
            <input
              id="custom-model-id"
              type="text"
              value={customModelId}
              onChange={e => onCustomModelIdChange(e.target.value)}
              placeholder={customPlaceholder}
            />
          </div>
        ) : null}
      </div>
    </div>
  );
}
