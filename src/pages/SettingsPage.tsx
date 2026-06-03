import { ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { SegmentedControl } from '@/ui-system/components/primitives/SegmentedControl';
import { cn } from '@/ui-system/utils/cn';

const MODE_DISPLAY: Record<ModeType, string> = {
  ephemeral: 'Ephemeral',
  local: 'Local',
  cloud: 'Cloud',
  ai: 'AI',
};

const THEME_OPTIONS = ['system', 'light', 'dark'] as const;
const MODE_OPTIONS = ['ephemeral', 'local', 'cloud', 'ai'] as const;
const EXPORT_FORMATS = ['PDF', 'TXT', 'JSON', 'CSV', 'MD'] as const;

export interface SettingsPageProps {
  onBack?: () => void;
  onChangeMode?: () => void;
}

/**
 * Settings Page
 * Groups: Account, Appearance, Mode, Highlighting, Data, Danger Zone
 */
// eslint-disable-next-line @typescript-eslint/explicit-function-return-type -- JSX return type inferred
export function SettingsPage({ onBack }: SettingsPageProps = {}) {
  const { availableModes, currentMode, setMode, theme, setTheme } = useApp();
  const { user, isLoading, logout } = useCurrentUser();
  const [autoHighlight, setAutoHighlight] = useState(true);
  const [showHighlightCount, setShowHighlightCount] = useState(true);
  const [selectedExportFormat, setSelectedExportFormat] = useState('PDF');
  const hasLockedModes = availableModes.length < MODE_OPTIONS.length;

  const handleSignOut = (): void => {
    if (
      window.confirm(
        'Warning: If you sign out, future underscores will not be saved. Are you sure you want to sign out?'
      )
    ) {
      void logout();
    }
  };

  const backControl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      aria-label="Go back to collections"
      className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 text-[12px] text-outline hover:text-primary transition-colors duration-[180ms] bg-transparent border-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md whitespace-nowrap"
    >
      <ChevronLeft size={13} />
      Collections
    </button>
  ) : (
    <Link
      to="/collections"
      className="inline-flex items-center gap-1.5 min-h-[44px] px-2 -mx-2 text-[12px] text-outline hover:text-primary transition-colors duration-[180ms] no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-md whitespace-nowrap"
    >
      <ChevronLeft size={13} />
      Collections
    </Link>
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-surface text-on-surface">

      {/* Compact sticky header */}
      <header
        className="flex items-center justify-between px-4 py-3 sticky top-0 z-10"
        style={{
          backgroundColor: 'color-mix(in srgb, var(--md-sys-color-surface) 88%, transparent)',
          backdropFilter: 'blur(12px)',
        }}
      >
        {backControl}
        <h1 className="text-[15px] font-semibold text-on-surface">Settings</h1>
        <div className="w-[80px]" />
      </header>

      {/* Body — display:block, NOT flex column */}
      <div className="w-full max-w-[640px] mx-auto px-4 py-4 pb-12">

        {/* Account */}
        <Section title="Account">
          <div className="flex items-center gap-3 py-4 px-4">
            <div
              className="w-10 h-10 shrink-0 rounded-full flex items-center justify-center text-[15px] font-semibold"
              style={{
                background: 'linear-gradient(135deg, color-mix(in srgb, var(--ink-mode) 30%, var(--md-sys-color-surface-container)) 0%, var(--md-sys-color-surface-container-high) 100%)',
                color: 'var(--ink-mode)',
              }}
            >
              {isLoading ? '\u00B7' : (user?.displayName?.[0]?.toUpperCase() ?? user?.email?.[0]?.toUpperCase() ?? 'U')}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] font-medium text-on-surface">
                {isLoading ? 'Loading...' : user?.displayName ?? 'Demo User'}
              </p>
              <p className="truncate text-[11px] text-on-surface-variant">
                {isLoading ? '' : user?.email ?? 'demo@example.com'}
              </p>
            </div>
          </div>
        </Section>

        {/* Appearance */}
        <Section title="Appearance">
          <div className="flex flex-col gap-4 py-4 px-4">
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-on-surface">Theme</p>
              <p className="text-[11px] text-on-surface-variant">Choose your preferred color scheme</p>
            </div>
            <SegmentedControl
              options={THEME_OPTIONS}
              value={theme}
              onChange={(v) => setTheme(v as typeof THEME_OPTIONS[number])}
              layoutId="theme"
            />
          </div>
        </Section>

        {/* Mode */}
        <Section title="Mode">
          <div className="flex flex-col gap-4 py-4 px-4">
            <div className="space-y-1">
              <p className="text-[13px] font-medium text-on-surface">Default mode</p>
              <p className="text-[11px] text-on-surface-variant">Mode activated when opening the extension</p>
            </div>
            <SegmentedControl
              options={MODE_OPTIONS.map((m) => MODE_DISPLAY[m])}
              value={MODE_DISPLAY[currentMode ?? 'ephemeral']}
              onChange={(label) => {
                const mode = MODE_OPTIONS.find((m) => MODE_DISPLAY[m] === label);
                if (mode && availableModes.includes(mode)) setMode(mode);
              }}
              layoutId="mode"
              modeColors
            />
            {hasLockedModes && (
              <p className="text-[11px] text-on-surface-variant">Sign in to unlock Cloud and AI modes.</p>
            )}
          </div>
        </Section>

        {/* Highlighting */}
        <Section title="Highlighting">
          <ToggleRow
            label="Auto-highlight code blocks"
            description="Detect and format code in highlights"
            checked={autoHighlight}
            onChange={setAutoHighlight}
          />
          <div className="h-px bg-outline-variant mx-4" />
          <ToggleRow
            label="Show highlight count badge"
            description="Display count on extension icon"
            checked={showHighlightCount}
            onChange={setShowHighlightCount}
          />
        </Section>

        {/* Data */}
        <Section title="Data">
          <div className="py-3 px-4 flex flex-col gap-3">
            <p className="text-[13px] font-medium text-on-surface">Export format</p>
            <div className="flex flex-wrap gap-1.5">
              {EXPORT_FORMATS.map((format) => (
                <button
                  key={format}
                  type="button"
                  onClick={() => setSelectedExportFormat(format)}
                  aria-pressed={selectedExportFormat === format}
                  className={cn(
                    'appearance-none px-3 py-[5px] rounded-full text-label-small border',
                    'transition-all duration-short ease-standard cursor-pointer',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
                    selectedExportFormat === format
                      ? 'border-primary bg-primary text-on-primary shadow-elevation-1'
                      : 'border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_72%,transparent)] bg-[color-mix(in_srgb,var(--md-sys-color-surface-container-low)_92%,var(--md-sys-color-surface))] text-on-surface-variant hover:border-outline hover:text-on-surface',
                  )}
                >
                  {format}
                </button>
              ))}
            </div>
          </div>
          <div className="h-px bg-outline-variant" />
          <div className="flex items-center justify-between gap-3 py-3 px-4">
            <span className="text-[13px] text-on-surface-variant">Export all data</span>
            <button
              type="button"
              className={cn(
                'px-4 py-[6px] rounded-full text-label-small',
                'border border-outline-variant bg-transparent text-on-surface',
                'transition-all duration-short ease-standard cursor-pointer',
                'hover:border-outline hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-surface)_8%,transparent)] hover:-translate-y-[1px]',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary',
              )}
            >
              Export {selectedExportFormat}
            </button>
          </div>
        </Section>

        {/* Danger Zone */}
        <Section title="Danger Zone" danger>
          {user && (
            <>
              <DangerRow
                label="Sign out"
                description="Disconnect your account from this device"
                actionLabel="Sign out"
                onAction={handleSignOut}
              />
              <div className="h-px bg-[color-mix(in_srgb,var(--md-sys-color-error)_15%,var(--md-sys-color-outline-variant))]" />
            </>
          )}
          <DangerRow
            label="Clear all data"
            description="Remove all highlights and collections"
            actionLabel="Clear"
          />
          <div className="h-px bg-[color-mix(in_srgb,var(--md-sys-color-error)_15%,var(--md-sys-color-outline-variant))]" />
          <DangerRow
            label="Delete account"
            description="Permanently delete your account and data"
            actionLabel="Delete"
          />
        </Section>

        {/* Footer */}
        <div className="flex items-center justify-center gap-6 py-5 mt-2">
          <a href="#privacy" className="text-[11px] text-outline hover:text-on-surface-variant transition-colors duration-[180ms] no-underline">Privacy</a>
          <span className="text-[11px] text-outline">v2.0.0</span>
          <a href="#terms" className="text-[11px] text-outline hover:text-on-surface-variant transition-colors duration-[180ms] no-underline">Terms</a>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
  danger = false,
}: {
  title: string;
  children: React.ReactNode;
  danger?: boolean;
}): React.JSX.Element {
  return (
    <div className="mb-5">
      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-outline mb-2 px-1">
        {title}
      </p>
      <div className={cn(
        'rounded-[12px] border overflow-hidden',
        danger
          ? [
              'border-[color-mix(in_srgb,var(--md-sys-color-error)_18%,transparent)]',
              'bg-[color-mix(in_srgb,var(--md-sys-color-error)_3%,var(--md-sys-color-surface-container-lowest))]',
            ]
          : 'border-[color-mix(in_srgb,var(--md-sys-color-outline-variant)_55%,transparent)] bg-surface-container-lowest',
      )}>
        {children}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-on-surface">{label}</p>
        {description && (
          <p className="text-[11px] text-on-surface-variant mt-[1px]">{description}</p>
        )}
      </div>
      {/* MD3 Switch */}
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative shrink-0 w-[52px] h-[32px] rounded-full border-2',
          'transition-all duration-short ease-standard cursor-pointer',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          checked ? 'bg-primary border-primary' : 'bg-transparent border-outline',
        )}
      >
        <span
          className={cn(
            'absolute top-1/2 left-[4px] -translate-y-1/2 rounded-full shadow-elevation-1',
            'transition-all duration-short ease-standard',
            checked
              ? 'w-[24px] h-[24px] translate-x-[16px] bg-on-primary'
              : 'w-[16px] h-[16px] translate-x-0 bg-outline',
          )}
        />
      </button>
    </div>
  );
}

function DangerRow({
  label,
  description,
  actionLabel,
  onAction,
}: {
  label: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-3 px-4">
      <div className="flex-1 min-w-0">
        <p className="text-[13px] font-medium text-on-surface">{label}</p>
        {description && (
          <p className="text-[11px] text-on-surface-variant mt-[1px]">{description}</p>
        )}
      </div>
      <button
        type="button"
        onClick={onAction}
        className={cn(
          'shrink-0 px-3 py-[5px] rounded-full text-[11px] font-medium',
          'border border-[color-mix(in_srgb,var(--md-sys-color-error)_30%,transparent)]',
          'bg-[color-mix(in_srgb,var(--md-sys-color-error)_6%,transparent)]',
          'text-error cursor-pointer transition-all duration-[180ms]',
          'hover:border-[color-mix(in_srgb,var(--md-sys-color-error)_50%,transparent)]',
          'hover:bg-[color-mix(in_srgb,var(--md-sys-color-error)_10%,transparent)]',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error',
        )}
      >
        {actionLabel}
      </button>
    </div>
  );
}
