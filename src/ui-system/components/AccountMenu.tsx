import React, { useState } from 'react';
import { Settings, ShieldCheck, Palette, LogOut, Check } from 'lucide-react';

interface AccountMenuProps {
    isAuthenticated: boolean;
    userEmail?: string;
    currentTheme: 'light' | 'dark' | 'system';
    onSettingsClick?: () => void;
    onPrivacyClick?: () => void;
    onThemeChange?: (theme: 'light' | 'dark' | 'system') => void;
    onSignOut?: () => void;
    onClose: () => void;
}

export function AccountMenu({
    isAuthenticated,
    userEmail,
    currentTheme,
    onSettingsClick,
    onPrivacyClick,
    onThemeChange,
    onSignOut,
    onClose,
}: AccountMenuProps) {
    const [showThemeSubmenu, setShowThemeSubmenu] = useState(false);

    const handleMenuClick = (callback?: () => void) => {
        callback?.();
        onClose();
    };

    const handleThemeSelect = (theme: 'light' | 'dark' | 'system') => {
        onThemeChange?.(theme);
        setShowThemeSubmenu(false);
        onClose();
    };

    return (
        <>
            {/* Backdrop with blur */}
            <div
                className="fixed inset-0 bg-black/10 dark:bg-black/30 backdrop-blur-sm z-40"
                onClick={onClose}
            />

            {/* Material Design 3 Navigation Menu */}
            <div className="absolute right-4 top-16 w-64 bg-surface-container-light dark:bg-surface-container-dark rounded-md shadow-elevation-2 z-50 overflow-hidden">
                {isAuthenticated ? (
                    <>
                        {/* User Email Header */}
                        {userEmail && (
                            <>
                                <div className="px-4 py-4">
                                    <p className="text-label-small uppercase text-on-surface-variant-light dark:text-on-surface-variant-dark truncate select-none">
                                        {userEmail}
                                    </p>
                                </div>
                                <div className="h-px w-full bg-outline-variant-light dark:bg-outline-variant-dark" />
                            </>
                        )}

                        {/* Navigation List Items - MD3 Specs: 56dp height */}
                        <nav className="py-2">
                            {/* Settings - 56dp height, 24dp icon, Label Large */}
                            <button
                                onClick={() => handleMenuClick(onSettingsClick)}
                                className="relative w-full h-14 flex items-center gap-4 px-4 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 transition-colors outline-none"
                            >
                                <Settings size={24} className="text-on-surface-variant-light dark:text-on-surface-variant-dark flex-shrink-0" />
                                <span>Settings</span>
                            </button>

                            {/* Privacy */}
                            <button
                                onClick={() => handleMenuClick(onPrivacyClick)}
                                className="relative w-full h-14 flex items-center gap-4 px-4 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 transition-colors outline-none"
                            >
                                <ShieldCheck size={24} className="text-on-surface-variant-light dark:text-on-surface-variant-dark flex-shrink-0" />
                                <span>Privacy</span>
                            </button>

                            {/* Theme - Expandable */}
                            {!showThemeSubmenu ? (
                                <button
                                    onClick={() => setShowThemeSubmenu(true)}
                                    className="relative w-full h-14 flex items-center gap-4 px-4 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 transition-colors outline-none"
                                >
                                    <Palette size={24} className="text-on-surface-variant-light dark:text-on-surface-variant-dark flex-shrink-0" />
                                    <span>Theme</span>
                                </button>
                            ) : (
                                <div className="px-4 py-2">
                                    <div className="flex flex-col gap-0.5">
                                        {/* Theme options - 48dp height per MD3 */}
                                        <button
                                            onClick={() => handleThemeSelect('light')}
                                            className="relative h-12 flex items-center justify-between px-3 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 rounded-sm transition-colors"
                                        >
                                            <span>Light</span>
                                            {currentTheme === 'light' && <Check size={18} className="text-primary" />}
                                        </button>
                                        <button
                                            onClick={() => handleThemeSelect('dark')}
                                            className="relative h-12 flex items-center justify-between px-3 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 rounded-sm transition-colors"
                                        >
                                            <span>Dark</span>
                                            {currentTheme === 'dark' && <Check size={18} className="text-primary" />}
                                        </button>
                                        <button
                                            onClick={() => handleThemeSelect('system')}
                                            className="relative h-12 flex items-center justify-between px-3 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 rounded-sm transition-colors"
                                        >
                                            <span>System</span>
                                            {currentTheme === 'system' && <Check size={18} className="text-primary" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </nav>

                        {/* Divider */}
                        <div className="h-px w-full bg-outline-variant-light dark:bg-outline-variant-dark" />

                        {/* Sign Out - MD3: 56dp height */}
                        <div className="py-2">
                            <button
                                onClick={() => handleMenuClick(onSignOut)}
                                className="relative w-full h-14 flex items-center gap-4 px-4 text-label-large text-red-500 hover:bg-red-500/8 dark:hover:bg-red-500/8 transition-colors outline-none"
                            >
                                <LogOut size={24} className="flex-shrink-0" />
                                <span>Sign out</span>
                            </button>
                        </div>
                    </>
                ) : (
                    <>
                        {/* Unauthenticated Menu Items */}
                        <nav className="py-2">
                            <button
                                onClick={() => handleMenuClick(onPrivacyClick)}
                                className="relative w-full h-14 flex items-center gap-4 px-4 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 transition-colors outline-none"
                            >
                                <ShieldCheck size={24} className="text-on-surface-variant-light dark:text-on-surface-variant-dark flex-shrink-0" />
                                <span>Privacy</span>
                            </button>

                            {/* Theme */}
                            {!showThemeSubmenu ? (
                                <button
                                    onClick={() => setShowThemeSubmenu(true)}
                                    className="relative w-full h-14 flex items-center gap-4 px-4 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 transition-colors outline-none"
                                >
                                    <Palette size={24} className="text-on-surface-variant-light dark:text-on-surface-variant-dark flex-shrink-0" />
                                    <span>Theme</span>
                                </button>
                            ) : (
                                <div className="px-4 py-2">
                                    <div className="flex flex-col gap-0.5">
                                        <button
                                            onClick={() => handleThemeSelect('light')}
                                            className="relative h-12 flex items-center justify-between px-3 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 rounded-sm transition-colors"
                                        >
                                            <span>Light</span>
                                            {currentTheme === 'light' && <Check size={18} className="text-primary" />}
                                        </button>
                                        <button
                                            onClick={() => handleThemeSelect('dark')}
                                            className="relative h-12 flex items-center justify-between px-3 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 rounded-sm transition-colors"
                                        >
                                            <span>Dark</span>
                                            {currentTheme === 'dark' && <Check size={18} className="text-primary" />}
                                        </button>
                                        <button
                                            onClick={() => handleThemeSelect('system')}
                                            className="relative h-12 flex items-center justify-between px-3 text-label-large text-on-surface-light dark:text-on-surface-dark hover:bg-on-surface-light/8 dark:hover:bg-on-surface-dark/8 rounded-sm transition-colors"
                                        >
                                            <span>System</span>
                                            {currentTheme === 'system' && <Check size={18} className="text-primary" />}
                                        </button>
                                    </div>
                                </div>
                            )}
                        </nav>
                    </>
                )}
            </div>
        </>
    );
}
