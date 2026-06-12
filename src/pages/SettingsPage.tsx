import React, { useState } from 'react';

import { useApp } from '@/core/context/AppProvider';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import { Row } from '@/ui-system/components/primitives/Row';
import { Spinner } from '@/ui-system/components/primitives/Spinner';

const TYPE_PRESETS = {
  editorial: {
    name: 'Editorial',
    note: 'Default · Serif display, serif body',
    serif: 'var(--serif)',
    sans: 'var(--sans)',
  },
  classic: {
    name: 'Classic',
    note: 'System fonts · No custom presets',
    serif: 'serif',
    sans: 'sans-serif',
  },
  modern: {
    name: 'Modern',
    note: 'Sans-only · Clean, utilitarian',
    serif: 'var(--sans)',
    sans: 'var(--sans)',
  },
} as const;

type TypePresetId = keyof typeof TYPE_PRESETS;

export interface SettingsPageProps {
  onBack?: () => void;
  onChangeMode?: () => void;
}

/**
 * Settings Page
 * Implements exactly what the Settings component in ui_kits/extension/v2/screens-nav.jsx specifies.
 */
export function SettingsPage({ onBack: _onBack, onChangeMode }: SettingsPageProps): React.ReactElement {
  const { theme, setTheme, currentMode } = useApp();
  const { user, logout } = useCurrentUser();
  const [typeId, setTypeId] = useState<TypePresetId>('editorial');
  const [isSigningOut, setIsSigningOut] = useState(false);

  // onBack is still required on the interface for callers passing it to the shell's ModeHeader
  // _onBack is intentionally unused in the body-only version

  const handleSignOut = async (): Promise<void> => {
    setIsSigningOut(true);
    try {
      await logout();
    } finally {
      setIsSigningOut(false);
    }
  };

  const handleToggleTheme = (): void => {
    const themes: ('light' | 'dark' | 'system')[] = ['light', 'dark', 'system'];
    const currentIndex = themes.indexOf(theme as 'light' | 'dark' | 'system');
    const nextTheme = themes[(currentIndex + 1) % themes.length] || 'system';
    setTheme(nextTheme);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '12px 16px 6px' }}>
        <div className="u-serif" style={{ fontSize: 'var(--step-3)', letterSpacing: '-0.02em' }}>Settings</div>
      </div>

      <div className="list-scroll" style={{ flex: 1 }}>
        <div className="u-caps" style={{ padding: '12px 16px 4px', color: 'var(--ink-3)' }}>Typography</div>
        {(Object.keys(TYPE_PRESETS) as TypePresetId[]).map((id) => {
          const p = TYPE_PRESETS[id];
          const active = id === typeId;
          return (
            <button
              key={id}
              onClick={() => setTypeId(id)}
              style={{
                all: 'unset',
                cursor: 'pointer',
                display: 'block',
                width: '100%',
                padding: '12px 16px',
                borderBottom: '1px solid var(--rule-soft)',
                background: active ? 'var(--paper-2)' : 'transparent',
                boxSizing: 'border-box'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                <div>
                  <div style={{ fontFamily: p.serif, fontSize: 'var(--step-1)', letterSpacing: '-0.01em' }}>{p.name}</div>
                  <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 3, letterSpacing: '0.04em' }}>{p.note}</div>
                </div>
                {/* eslint-disable-next-line no-restricted-syntax */}
                <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: active ? 'var(--accent)' : 'var(--ink-3)' }}>
                  {active ? '● selected' : '○'}
                </span>
              </div>
            </button>
          );
        })}
        <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-4)', padding: '6px 16px 10px', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
          Applied uniformly across the app
        </div>

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>General</div>
        <Row
          title="Theme"
          sub="Match system"
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', textTransform: 'capitalize' }}>{theme}</span>}
          onClick={handleToggleTheme}
        />
        <Row
          title="Mode"
          sub={`${currentMode.charAt(0).toUpperCase() + currentMode.slice(1)} · synced`}
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>Change</span>}
          onClick={onChangeMode}
        />
        <Row title="Density" sub="Comfortable" right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>Edit</span>} />

        <div className="u-caps" style={{ padding: '10px 16px 4px', color: 'var(--ink-3)' }}>Account</div>
        <Row
          title={user?.email || 'Guest User'}
          sub={user ? 'Signed in' : 'Local mode'}
          right={
            isSigningOut ? (
              <Spinner size="sm" />
            ) : (
              <span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>
                {user ? 'Sign out' : 'Sign in'}
              </span>
            )
          }
          onClick={user && !isSigningOut ? handleSignOut : undefined}
        />
        <Row
          title="Configure AI providers"
          sub="Opens web app"
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>↗</span>}
          onClick={() => {}}
        />
        <Row
          title="Export highlights"
          right={<span className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)' }}>→</span>}
          onClick={() => {}}
        />
      </div>
    </div>
  );
}
