import { ChevronLeft } from 'lucide-react';
import React, { useState } from 'react';
import { Link } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { Separator } from '@/ui-system/components/primitives/Separator';
import { cn } from '@/ui-system/utils/cn';
import {
  tonalPillActiveClass,
  tonalPillBaseClass,
  tonalPillDisabledClass,
  tonalPillInactiveClass,
  tonalPillShellClass,
  tonalPillStandaloneClass,
} from '@/ui-system/utils/tonalPill';

const MODE_DISPLAY: Record<ModeType, string> = {
  walk: 'Focus',
  sprint: 'Capture',
  vault: 'Memory',
  neural: 'Neural',
};

const THEME_OPTIONS = ['system', 'light', 'dark'] as const;
const MODE_OPTIONS = ['walk', 'sprint', 'vault', 'neural'] as const;
const EXPORT_FORMATS = ['PDF', 'TXT', 'JSON', 'CSV', 'MD'] as const;

export interface SettingsPageProps {
  onBack?: () => void;
  onChangeMode?: () => void;
}

/**
 * Settings Page
 * Groups: Account, Appearance, Highlighting, Data, Danger Zone
 */
export function SettingsPage({ onBack }: SettingsPageProps = {}): React.JSX.Element {
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
      className="inline-flex min-h-[48px] cursor-pointer items-center gap-1.5 rounded-md border-0 bg-transparent px-2 -mx-2 text-body-small text-outline transition-colors duration-short ease-standard hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label="Go back to collections"
    >
      <ChevronLeft size={13} />
      Collections
    </button>
  ) : (
    <Link
      to="/collections"
      className="inline-flex min-h-[48px] items-center gap-1.5 rounded-md px-2 -mx-2 text-body-small text-outline no-underline transition-colors duration-short ease-standard hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <ChevronLeft size={13} />
      Collections
    </Link>
  );

  const logoControl = onBack ? (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      aria-label="Return to collections"
    >
      <Logo size="md" />
    </button>
  ) : (
    <Link
      to="/collections"
      className="inline-flex min-h-[48px] min-w-[48px] items-center justify-center rounded-full no-underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Logo size="md" />
    </Link>
  );

  return (
    <div className="h-full w-full overflow-y-auto bg-surface text-on-surface">
      <div className="flex min-h-full flex-col items-center">
        <header
          className="sticky top-0 z-10 flex w-full max-w-[640px] justify-center px-6 py-6 backdrop-blur-md"
          style={{
            backgroundColor:
              'color-mix(in srgb, var(--md-sys-color-surface) 80%, transparent)',
          }}
        >
          {logoControl}
        </header>

        <main className="w-full max-w-[640px] flex-1 px-6 pb-12">
          <div className="mb-8 flex flex-col gap-3">
            {backControl}
            <h1 className="text-headline-small text-on-surface">Settings</h1>
          </div>

          <Section title="Account">
            <div className="flex items-center gap-3 py-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary text-title-small font-semibold text-on-primary">
                {isLoading
                  ? '...'
                  : user?.displayName?.[0]?.toUpperCase() ||
                    user?.email?.[0]?.toUpperCase() ||
                    'U'}
              </div>

              <div className="min-w-0 flex-1">
                <p className="truncate text-body-medium text-on-surface">
                  {isLoading ? 'Loading...' : user?.displayName || 'Demo User'}
                </p>
                <p className="truncate text-body-small text-outline">
                  {isLoading ? 'Loading...' : user?.email || 'demo@google.com'}
                </p>
              </div>
            </div>
          </Section>

          <Section title="Appearance">
            <div className="flex flex-col gap-4 py-4">
              <div className="space-y-1">
                <p className="text-body-medium text-on-surface">Theme</p>
                <p className="text-body-small text-outline">
                  Choose your preferred color scheme
                </p>
              </div>

              <div className={tonalPillShellClass}>
                {THEME_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setTheme(option)}
                    aria-pressed={theme === option}
                    className={cn(
                      tonalPillBaseClass,
                      'px-3 py-1.5 text-label-medium capitalize',
                      theme === option
                        ? tonalPillActiveClass
                        : tonalPillInactiveClass
                    )}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </Section>

          <Section title="Mode">
            <div className="flex flex-col gap-4 py-4">
              <div className="space-y-1">
                <p className="text-body-medium text-on-surface">Default mode</p>
                <p className="text-body-small text-outline">
                  Mode activated when opening the extension
                </p>
              </div>

              <div className={tonalPillShellClass}>
                {MODE_OPTIONS.map((mode) => {
                  const isAvailable = availableModes.includes(mode);

                  return (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => setMode(mode)}
                      disabled={!isAvailable}
                      title={isAvailable ? undefined : 'Sign in to unlock'}
                      aria-pressed={currentMode === mode}
                      className={cn(
                        tonalPillBaseClass,
                        'px-3 py-1.5 text-label-medium',
                        currentMode === mode
                          ? tonalPillActiveClass
                          : tonalPillInactiveClass,
                        !isAvailable && tonalPillDisabledClass
                      )}
                    >
                      {MODE_DISPLAY[mode]}
                    </button>
                  );
                })}
              </div>

              {hasLockedModes && (
                <p className="text-body-small text-outline">
                  Sign in to unlock Memory and Neural.
                </p>
              )}
            </div>
          </Section>

          <Section title="Highlighting">
            <ToggleRow
              label="Auto-highlight code blocks"
              description="Detect and format code in highlights"
              checked={autoHighlight}
              onChange={setAutoHighlight}
            />

            <ToggleRow
              label="Show highlight count badge"
              description="Display count on extension icon"
              checked={showHighlightCount}
              onChange={setShowHighlightCount}
            />
          </Section>

          <Section title="Data">
            <div className="flex flex-col gap-3 py-4">
              <p className="text-body-medium text-on-surface">Export format</p>
              <div className="flex flex-wrap gap-2">
                {EXPORT_FORMATS.map((format) => (
                  <button
                    key={format}
                    type="button"
                    onClick={() => setSelectedExportFormat(format)}
                    aria-pressed={selectedExportFormat === format}
                    className={cn(
                      tonalPillBaseClass,
                      tonalPillStandaloneClass,
                      'px-3 py-1.5 text-label-medium',
                      selectedExportFormat === format
                        ? tonalPillActiveClass
                        : cn(tonalPillInactiveClass, 'hover:border-outline')
                    )}
                  >
                    {format}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 py-4">
              <span className="text-body-medium text-on-surface-variant">
                Export all data
              </span>
              <Button
                type="button"
                variant="outlined"
                className="border-outline-variant px-4 text-on-surface hover:border-outline"
              >
                Export {selectedExportFormat}
              </Button>
            </div>
          </Section>

          <Section title="Danger Zone" danger>
            {user && (
              <DangerRow
                label="Sign out"
                description="Disconnect your account from this device"
                actionLabel="Sign out"
                onAction={handleSignOut}
              />
            )}

            <DangerRow
              label="Clear all data"
              description="Remove all highlights and collections"
              actionLabel="Clear"
            />

            <DangerRow
              label="Delete account"
              description="Permanently delete your account and data"
              actionLabel="Delete"
            />
          </Section>

          <div className="mt-10">
            <Separator />
            <footer className="flex items-center justify-between gap-3 py-4">
              <Link
                to="/privacy"
                className="inline-flex min-h-[48px] items-center rounded-md px-2 -mx-2 text-body-small text-outline no-underline transition-colors duration-short ease-standard hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Privacy Policy
              </Link>

              <span className="text-body-small text-outline">v2.0.0</span>

              <a
                href="#terms"
                className="inline-flex min-h-[48px] items-center rounded-md px-2 -mx-2 text-body-small text-outline no-underline transition-colors duration-short ease-standard hover:text-on-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                Terms
              </a>
            </footer>
          </div>
        </main>
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
    <section className="mb-6">
      <p
        className={cn(
          'mb-2 text-label-small uppercase tracking-[0.15em]',
          danger ? 'text-error' : 'text-outline'
        )}
      >
        {title}
      </p>

      <div className="overflow-hidden rounded-md border border-outline-variant bg-surface-container-lowest">
        <div className="divide-y divide-outline-variant px-4">{children}</div>
      </div>
    </section>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onChange,
}: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (value: boolean) => void;
}): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-4 py-4">
      <div className="min-w-0 flex-1">
        <p className="text-body-medium text-on-surface">{label}</p>
        <p className="text-body-small text-outline">{description}</p>
      </div>

      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          'inline-flex h-12 w-[52px] shrink-0 items-center rounded-full border px-1.5 transition-all duration-short ease-standard',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2',
          checked ? 'border-primary bg-primary' : 'border-outline-variant bg-outline'
        )}
      >
        <span
          className={cn(
            'h-5 w-5 rounded-full shadow-elevation-1 transition-all duration-short ease-standard',
            checked
              ? 'translate-x-5 bg-on-primary'
              : 'translate-x-0 bg-surface-container-highest'
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
    <div className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="text-body-medium text-on-surface-variant">{label}</p>
        <p className="text-body-small text-outline">{description}</p>
      </div>

      <Button
        type="button"
        variant="outlined"
        onClick={onAction}
        className="border-error px-4 text-error hover:bg-[color-mix(in_srgb,var(--md-sys-color-error)_8%,transparent)] active:bg-[color-mix(in_srgb,var(--md-sys-color-error)_12%,transparent)]"
      >
        {actionLabel}
      </Button>
    </div>
  );
}
