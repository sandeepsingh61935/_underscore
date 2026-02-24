import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { useCurrentUser } from '@/features/auth/hooks/useCurrentUser';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

const MODE_DISPLAY: Record<ModeType, string> = {
    walk: 'Focus', sprint: 'Capture', vault: 'Memory', neural: 'Neural',
};

/**
 * Settings Page — matches settings.html mockup
 * Groups: Account, Appearance, Highlighting, Data, Danger Zone
 */
export interface SettingsPageProps {
    onBack?: () => void;
}

export function SettingsPage({ onBack }: SettingsPageProps = {}) {
    const { currentMode, setMode, theme, setTheme } = useApp();
    const { user, isLoading, logout } = useCurrentUser();
    const [autoHighlight, setAutoHighlight] = useState(true);

    const exportFormats = ['PDF', 'TXT', 'JSON', 'CSV', 'MD'];

    return (
        <div
            className="w-full h-full flex flex-col items-center overflow-y-auto"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            {/* Header — centered logo, no avatar */}
            <header className="w-full max-w-[640px] flex justify-center items-center py-6 px-6 shrink-0 z-10 sticky top-0"
                style={{ backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', backgroundColor: 'var(--bg-glass, rgba(249, 249, 255, 0.8))' }}>
                <a
                    href="/collections"
                    className="no-underline"
                    onClick={e => {
                        if (onBack) {
                            e.preventDefault();
                            onBack();
                        }
                    }}
                >
                    <Logo size="md" />
                </a>
            </header>

            <div className="w-full max-w-[640px] px-6 pb-12 flex-1">
                <a
                    href="/collections"
                    className="inline-flex items-center gap-1.5 text-[13px] no-underline mb-3 transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                    onClick={e => {
                        if (onBack) {
                            e.preventDefault();
                            onBack();
                        }
                    }}
                >
                    ← Collections
                </a>

                <h1
                    className="text-[24px] font-semibold mb-8"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Settings
                </h1>

                {/* ─── Account ─── */}
                <Section title="Account">
                    <div className="flex items-center gap-3 px-5 py-4">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-[16px] font-semibold shrink-0" style={{ background: 'var(--accent)' }}>
                            {isLoading ? '...' : (user?.displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U')}
                        </div>
                        <div className="flex-1">
                            <div className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>
                                {isLoading ? 'Loading...' : (user?.displayName || 'Demo User')}
                            </div>
                            <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                                {isLoading ? 'Loading...' : (user?.email || 'demo@google.com')}
                            </div>
                        </div>
                    </div>
                </Section>

                {/* ─── Appearance ─── */}
                <Section title="Appearance">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex-1">
                            <div className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>Theme</div>
                            <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Choose your preferred color scheme</div>
                        </div>
                        <div className="flex gap-1 p-1 rounded-[var(--radius-sm)]" style={{ border: '1px solid var(--border)', background: 'var(--bg-card)' }}>
                            {(['system', 'light', 'dark'] as const).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setTheme(t)}
                                    className="px-3 py-1 rounded-[var(--radius-sm)] text-[12px] font-medium capitalize cursor-pointer transition-all duration-150 border-none"
                                    style={{
                                        background: theme === t ? 'var(--accent-soft)' : 'transparent',
                                        color: theme === t ? 'var(--accent-text)' : 'var(--text-secondary)',
                                    }}
                                >
                                    {t}
                                </button>
                            ))}
                        </div>
                    </div>
                </Section>

                {/* ─── Highlighting ─── */}
                <Section title="Highlighting">
                    <div className="flex items-center justify-between py-3">
                        <div className="flex-1 pr-4">
                            <div className="text-[14px] font-medium" style={{ color: 'var(--text-primary)' }}>Default mode</div>
                            <div className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>Mode activated when opening the extension</div>
                        </div>
                        <div className="flex gap-1 flex-wrap justify-end">
                            {(['walk', 'sprint', 'vault', 'neural'] as const).map(mode => (
                                <button
                                    key={mode}
                                    onClick={() => setMode(mode)}
                                    className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium capitalize cursor-pointer transition-all duration-150 border"
                                    style={{
                                        background: currentMode === mode ? 'var(--accent-soft)' : 'transparent',
                                        borderColor: currentMode === mode ? 'var(--accent)' : 'var(--border)',
                                        color: currentMode === mode ? 'var(--accent-text)' : 'var(--text-secondary)',
                                    }}
                                >
                                    {MODE_DISPLAY[mode]}
                                </button>
                            ))}
                        </div>
                    </div>
                    <ToggleRow
                        label="Auto-highlight code blocks"
                        description="Detect and format code in highlights"
                        checked={autoHighlight}
                        onChange={setAutoHighlight}
                    />
                    <ToggleRow
                        label="Show highlight count badge"
                        description="Display count on extension icon"
                        checked={true}
                        onChange={() => { }}
                    />
                </Section>

                {/* ─── Data ─── */}
                <Section title="Data">
                    <div className="py-3">
                        <p className="text-[14px] mb-2" style={{ color: 'var(--text-secondary)' }}>Export format</p>
                        <div className="flex gap-2">
                            {exportFormats.map(fmt => (
                                <button
                                    key={fmt}
                                    className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] cursor-pointer transition-all duration-150"
                                    style={{
                                        background: 'var(--bg-card)',
                                        border: '1px solid var(--border)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    {fmt}
                                </button>
                            ))}
                        </div>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <span className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Export all data</span>
                        <button
                            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium cursor-pointer transition-all duration-150"
                            style={{
                                background: 'transparent',
                                border: '1px solid var(--border)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            Export all
                        </button>
                    </div>
                </Section>

                {/* ─── Danger Zone ─── */}
                <Section title="Danger Zone" danger>
                    {user && (
                        <div className="flex items-center justify-between py-3">
                            <div>
                                <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Sign out</p>
                                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                                    Disconnect your account from this device
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    if (window.confirm('Warning: If you sign out, future underscores will not be saved. Are you sure you want to sign out?')) {
                                        logout();
                                    }
                                }}
                                className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium cursor-pointer transition-all duration-150 border"
                                style={{ background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderColor: 'var(--md-sys-color-error)' }}
                            >
                                Sign out
                            </button>
                        </div>
                    )}
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Clear all data</p>
                            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                                Remove all highlights and collections
                            </p>
                        </div>
                        <button
                            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium cursor-pointer transition-all duration-150 border"
                            style={{ background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderColor: 'var(--md-sys-color-error)' }}
                        >
                            Clear
                        </button>
                    </div>
                    <div className="flex items-center justify-between py-3">
                        <div>
                            <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>Delete account</p>
                            <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                                Permanently delete your account and data
                            </p>
                        </div>
                        <button
                            className="px-3 py-1.5 rounded-[var(--radius-sm)] text-[12px] font-medium cursor-pointer transition-all duration-150 border"
                            style={{ background: 'var(--md-sys-color-error-container)', color: 'var(--md-sys-color-on-error-container)', borderColor: 'var(--md-sys-color-error)' }}
                        >
                            Delete
                        </button>
                    </div>
                </Section>

                {/* Footer */}
                <div className="flex items-center justify-between mt-10 pt-4" style={{ borderTop: '1px solid var(--border)' }}>
                    <Link
                        to="/privacy"
                        className="text-[12px] no-underline"
                        style={{ color: 'var(--text-tertiary)' }}
                    >
                        Privacy Policy
                    </Link>
                    <span className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>
                        v2.0.0
                    </span>
                    <a href="#terms" className="text-[12px] no-underline" style={{ color: 'var(--text-tertiary)' }}>
                        Terms
                    </a>
                </div>
            </div>
        </div>
    );
}

/* ─── Sub-components ─── */

function Section({ title, children, danger }: { title: string; children: React.ReactNode; danger?: boolean }) {
    return (
        <div className="mb-6">
            <p
                className="text-[11px] font-medium uppercase tracking-[0.15em] mb-2"
                style={{ color: danger ? '#e05252' : 'var(--text-tertiary)' }}
            >
                {title}
            </p>
            <div
                className="rounded-[var(--radius)] overflow-hidden divide-y"
                style={{
                    background: 'var(--bg-card)',
                    border: `1px solid ${danger ? 'rgba(224,82,82,0.15)' : 'var(--border)'}`,
                    ['--tw-divide-opacity' as string]: 1,
                }}
            >
                <div className="px-4">{children}</div>
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
    description: string;
    checked: boolean;
    onChange: (v: boolean) => void;
}) {
    return (
        <div className="flex items-center justify-between py-3">
            <div>
                <p className="text-[14px]" style={{ color: 'var(--text-secondary)' }}>{label}</p>
                <p className="text-[12px]" style={{ color: 'var(--text-tertiary)' }}>{description}</p>
            </div>
            <button
                onClick={() => onChange(!checked)}
                className={`w-[44px] h-[24px] rounded-full cursor-pointer border transition-all duration-300 relative flex items-center ${checked ? 'border-transparent' : 'border-[var(--outline)]'
                    }`}
                style={{
                    background: checked ? 'var(--md-sys-color-primary)' : 'var(--md-sys-color-surface-container-highest)',
                }}
            >
                <div
                    className="rounded-full absolute transition-all duration-300 shadow-sm"
                    style={{
                        width: checked ? '20px' : '16px',
                        height: checked ? '20px' : '16px',
                        left: checked ? '22px' : '3px',
                        background: checked ? 'var(--md-sys-color-on-primary)' : 'var(--md-sys-color-outline)',
                    }}
                />
            </button>
        </div>
    );
}
