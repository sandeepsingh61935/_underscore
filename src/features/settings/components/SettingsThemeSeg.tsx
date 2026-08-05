/**
 * Appearance / Theme segments — Open Design Settings mockup.
 */
import React from 'react';

export type ThemePref = 'light' | 'dark' | 'system';

export interface SettingsThemeSegProps {
  theme: ThemePref | string;
  onChange: (theme: ThemePref) => void;
}

const OPTIONS: ThemePref[] = ['light', 'dark', 'system'];

export function SettingsThemeSeg({
  theme,
  onChange,
}: SettingsThemeSegProps): React.ReactElement {
  const value = (OPTIONS.includes(theme as ThemePref) ? theme : 'system') as ThemePref;

  return (
    <div data-testid="settings-section-appearance">
      <div
        className="u-caps"
        style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}
      >
        Appearance
      </div>
      <div style={{ padding: '8px 16px 12px' }} data-testid="settings-theme">
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            marginBottom: 8,
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>Theme</div>
          <span
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: 'var(--ink-3)',
              textTransform: 'capitalize',
            }}
          >
            {value}
          </span>
        </div>
        <div className="seg" role="radiogroup" aria-label="Theme">
          {OPTIONS.map((t) => (
            <button
              key={t}
              type="button"
              role="radio"
              aria-checked={value === t}
              className={value === t ? 'active' : ''}
              data-testid={`settings-theme-${t}`}
              onClick={() => onChange(t)}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
