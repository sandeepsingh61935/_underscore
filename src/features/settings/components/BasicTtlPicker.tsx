import React, { useState } from 'react';

import {
  BASIC_TTL_PRESETS,
  BASIC_TTL_UNITS,
  configsEqual,
  formatBasicTtlConfig,
  setBasicTtlConfig,
  validateCustomTtl,
  type BasicTtlConfig,
  type BasicTtlPresetId,
  type BasicTtlUnit,
} from '@/shared/constants/basic-ttl';

export interface BasicTtlPickerProps {
  value: BasicTtlConfig;
  onChange?: (config: BasicTtlConfig) => void;
}

export function BasicTtlPicker({ value, onChange }: BasicTtlPickerProps): React.ReactElement {
  const [customAmount, setCustomAmount] = useState(() =>
    value.kind === 'custom' ? String(value.amount) : '45'
  );
  const [customUnit, setCustomUnit] = useState<BasicTtlUnit>(() =>
    value.kind === 'custom' ? value.unit : 'minutes'
  );
  const [customError, setCustomError] = useState<string | null>(null);

  const apply = async (config: BasicTtlConfig): Promise<void> => {
    await setBasicTtlConfig(config);
    onChange?.(config);
  };

  const handlePreset = (preset: BasicTtlPresetId): void => {
    void apply({ kind: 'preset', preset });
  };

  const handleForever = (): void => {
    void apply({ kind: 'forever' });
  };

  const handleApplyCustom = (): void => {
    const amount = Number.parseInt(customAmount, 10);
    const result = validateCustomTtl(amount, customUnit);
    if (!result.valid) {
      setCustomError(result.error);
      return;
    }
    setCustomError(null);
    void apply({ kind: 'custom', amount, unit: customUnit });
  };

  const isPresetActive = (preset: BasicTtlPresetId): boolean =>
    value.kind === 'preset' && value.preset === preset;

  const isForeverActive = value.kind === 'forever';

  const isCustomActive = value.kind === 'custom';

  return (
    <div
      style={{
        padding: '12px 16px 16px',
        borderBottom: '1px solid var(--rule-soft)',
        background: 'var(--paper-2)',
      }}
    >
      <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginBottom: 10 }}>
        Current: {formatBasicTtlConfig(value)}
      </div>

      <div className="u-caps" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginBottom: 6 }}>
        Presets
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 14 }}>
        {BASIC_TTL_PRESETS.map((p) => (
          <button
            key={p.preset}
            type="button"
            onClick={() => handlePreset(p.preset)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              padding: '6px 10px',
              border: `1px solid ${isPresetActive(p.preset) ? 'var(--accent)' : 'var(--rule)'}`,
              background: isPresetActive(p.preset) ? 'var(--paper)' : 'transparent',
              fontFamily: 'var(--mono)',
              fontSize: 'var(--step--2)',
              color: isPresetActive(p.preset) ? 'var(--accent)' : 'var(--ink-2)',
            }}
          >
            {p.label}
          </button>
        ))}
        <button
          type="button"
          onClick={handleForever}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '6px 10px',
            border: `1px solid ${isForeverActive ? 'var(--accent)' : 'var(--rule)'}`,
            background: isForeverActive ? 'var(--paper)' : 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: 'var(--step--2)',
            color: isForeverActive ? 'var(--accent)' : 'var(--ink-2)',
          }}
        >
          Forever
        </button>
      </div>

      <div className="u-caps" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginBottom: 6 }}>
        Custom
      </div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        <input
          type="number"
          min={1}
          value={customAmount}
          onChange={(e) => setCustomAmount(e.target.value)}
          aria-label="Custom TTL amount"
          style={{
            width: 72,
            padding: '6px 8px',
            border: `1px solid ${isCustomActive ? 'var(--accent)' : 'var(--rule)'}`,
            background: 'var(--paper)',
            fontFamily: 'var(--mono)',
            fontSize: 'var(--step--1)',
            color: 'var(--ink)',
          }}
        />
        <select
          value={customUnit}
          onChange={(e) => setCustomUnit(e.target.value as BasicTtlUnit)}
          aria-label="Custom TTL unit"
          style={{
            padding: '6px 8px',
            border: `1px solid ${isCustomActive ? 'var(--accent)' : 'var(--rule)'}`,
            background: 'var(--paper)',
            fontFamily: 'var(--mono)',
            fontSize: 'var(--step--1)',
            color: 'var(--ink)',
          }}
        >
          {BASIC_TTL_UNITS.map((u) => (
            <option key={u.id} value={u.id}>{u.label}</option>
          ))}
        </select>
        <button
          type="button"
          onClick={handleApplyCustom}
          style={{
            all: 'unset',
            cursor: 'pointer',
            padding: '6px 12px',
            border: '1px solid var(--accent)',
            background: isCustomActive ? 'var(--accent)' : 'transparent',
            fontFamily: 'var(--mono)',
            fontSize: 'var(--step--2)',
            color: isCustomActive ? 'var(--paper)' : 'var(--accent)',
          }}
        >
          Apply
        </button>
      </div>
      {customError && (
        <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ttl-low)', marginTop: 6 }}>
          {customError}
        </div>
      )}
      {isCustomActive && value.kind === 'custom' && !configsEqual(value, { kind: 'custom', amount: Number.parseInt(customAmount, 10) || 0, unit: customUnit }) && (
        <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 6 }}>
          Press Apply to save changes
        </div>
      )}
    </div>
  );
}
