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
    <div
      style={{ padding: '8px 16px 12px' }}
      data-testid="settings-theme"
      data-od-id="settings-theme"
    >
      <div style={{ marginBottom: 8, fontSize: 14, fontWeight: 500, color: 'var(--ink)' }}>
        Theme
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
            data-action="set-theme"
            data-theme={t}
            onClick={() => onChange(t)}
          >
            {t}
          </button>
        ))}
      </div>
    </div>
  );
}
