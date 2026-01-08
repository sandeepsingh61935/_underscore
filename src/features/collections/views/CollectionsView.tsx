import React, { useState, useMemo } from 'react';
import { Logo } from '../../../ui-system/components/primitives/Logo';
import { EmptyCollectionsState } from '../components/EmptyCollectionsState';
import { AccountMenu } from '../../../ui-system/components/AccountMenu';
import { useTheme } from '../../../ui-system/hooks/useTheme';
import { Settings, User, List, Grid, ArrowRight, Lock } from 'lucide-react';

interface CollectionsViewProps {
    mode: 'focus' | 'capture' | 'memory' | 'neural';
    onModeChange: (mode: 'focus' | 'capture' | 'memory' | 'neural') => void;
    onSignInClick?: () => void;
    onCollectionClick?: (domain: string) => void;
    onLogout?: () => void;
    userEmail?: string;
    isAuthenticated?: boolean;
}

type SortOption = 'alphabetical' | 'usage' | 'recent';
type ViewMode = 'list' | 'grid';

interface Collection {
    id: string;
    domain: string;
    category: string;
    count: number;
    favicon?: string;
}

export function CollectionsView({ mode, onModeChange, onSignInClick, onCollectionClick, onLogout, userEmail, isAuthenticated = false }: CollectionsViewProps) {
    const [sortBy, setSortBy] = useState<SortOption>('alphabetical');
    const [viewMode, setViewMode] = useState<ViewMode>('list');
    const [showMenu, setShowMenu] = useState(false);
    const { theme, setTheme } = useTheme();

    // Mock collections data - TODO: Replace with actual data from useCollections hook
    const [collections] = useState<Collection[]>([
        { id: '1', domain: 'nytimes.com', category: 'News & Media', count: 24 },
        { id: '2', domain: 'wikipedia.org', category: 'Reference', count: 12 },
        { id: '3', domain: 'github.com', category: 'Development', count: 8 },
        { id: '4', domain: 'dribbble.com', category: 'Design Inspiration', count: 3 },
    ]);

    // Sort collections based on selected option
    const sortedCollections = useMemo(() => {
        const sorted = [...collections];

        switch (sortBy) {
            case 'alphabetical':
                return sorted.sort((a, b) => a.domain.localeCompare(b.domain));
            case 'usage':
                return sorted.sort((a, b) => b.count - a.count); // Descending order
            case 'recent':
                // For now, just reverse alphabetical as we don't have timestamps
                return sorted.sort((a, b) => b.domain.localeCompare(a.domain));
            default:
                return sorted;
        }
    }, [collections, sortBy]);

    const hasCollections = sortedCollections.length > 0;

    // Mode configuration
    const modes = [
        { id: 'focus' as const, label: 'Focus', requiresAuth: false },
        { id: 'capture' as const, label: 'Capture', requiresAuth: false },
        { id: 'memory' as const, label: 'Memory', requiresAuth: true },
        { id: 'neural' as const, label: 'Neural', requiresAuth: true },
    ];

    const handleModeClick = (modeId: typeof mode) => {
        const selectedMode = modes.find(m => m.id === modeId);
        if (selectedMode?.requiresAuth && !isAuthenticated) {
            // Don't switch to auth-required mode if not authenticated
            return;
        }
        onModeChange(modeId);
    };

    return (
        <div className="w-[360px] h-[600px] bg-bg-base-light dark:bg-bg-base-dark font-display flex flex-col relative">
            {/* Header */}
            <header className="w-full border-b border-border-light dark:border-border-dark bg-bg-surface-light/80 dark:bg-bg-surface-dark/80 backdrop-blur-md sticky top-0 z-50">
                <div className="px-4 h-14 flex items-center justify-between">
                    <Logo showText={true} />
                    <button
                        onClick={() => setShowMenu(!showMenu)}
                        className="h-7 w-7 rounded-full bg-primary/20 flex items-center justify-center cursor-pointer hover:ring-2 ring-primary ring-offset-2 ring-offset-bg-base-light dark:ring-offset-bg-base-dark transition-all"
                    >
                        <User size={14} className="text-primary" />
                    </button>
                </div>
            </header>

            {/* Account Menu */}
            {showMenu && (
                <AccountMenu
                    isAuthenticated={isAuthenticated}
                    userEmail={userEmail}
                    currentTheme={theme}
                    onSettingsClick={() => console.log('Settings clicked')}
                    onPrivacyClick={() => console.log('Privacy clicked')}
                    onThemeChange={setTheme}
                    onSignOut={onLogout}
                    onClose={() => setShowMenu(false)}
                />
            )}

            {/* Material Design 3 Primary Tabs - Mode Switcher */}
            <div className="w-full border-b border-outline-light dark:border-outline-dark">
                <div className="flex">
                    {modes.map((modeConfig) => {
                        const isActive = mode === modeConfig.id;
                        const isLocked = modeConfig.requiresAuth && !isAuthenticated;

                        return (
                            <button
                                key={modeConfig.id}
                                onClick={() => handleModeClick(modeConfig.id)}
                                disabled={isLocked}
                                className={`
                                    relative flex-1 h-12 flex items-center justify-center gap-1.5
                                    transition-colors duration-200
                                    ${isActive
                                        ? 'text-primary'
                                        : isLocked
                                            ? 'text-on-surface-variant-light dark:text-on-surface-variant-dark opacity-40 cursor-not-allowed'
                                            : 'text-on-surface-variant-light dark:text-on-surface-variant-dark hover:text-on-surface-light dark:hover:text-on-surface-dark'
                                    }
                                `}
                            >
                                {/* Label - Title Small (14px, weight 500) */}
                                <span className="text-title-small">
                                    {modeConfig.label}
                                </span>

                                {/* Lock icon for locked modes */}
                                {isLocked && (
                                    <Lock size={12} className="opacity-60" />
                                )}

                                {/* Active Indicator - 3dp underline */}
                                {isActive && (
                                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-primary rounded-t-sm" />
                                )}

                                {/* State layer for hover/press */}
                                {!isLocked && !isActive && (
                                    <div className="absolute inset-0 state-layer-hover" />
                                )}
                            </button>
                        );
                    })}
                </div>
            </div>

            {/* Content Area */}
            {!hasCollections ? (
                <EmptyCollectionsState />
            ) : (
                <main className="flex-1 overflow-y-auto px-4 pt-2 pb-6">
                    {/* Collections Header */}
                    <div className="mb-8 flex flex-col items-center text-center">
                        <h1 className="text-4xl font-light tracking-tight text-text-primary-light dark:text-text-primary-dark mb-2">
                            Collections
                        </h1>
                        <p className="text-text-secondary-light dark:text-text-secondary-dark text-sm font-light max-w-[280px]">
                            Securely manage your collected underscores within individual collections.
                        </p>
                    </div>

                    {/* Controls: Sorting + View Toggle */}
                    <div className="w-full flex justify-between items-center mb-6">
                        {/* Sorting Tabs */}
                        <div className="inline-flex h-10 items-center justify-center rounded-full bg-bg-alt-light dark:bg-bg-alt-dark p-1">
                            <button
                                onClick={() => setSortBy('alphabetical')}
                                className={`
                                    px-3 h-full rounded-full text-xs font-medium transition-all duration-200
                                    ${sortBy === 'alphabetical'
                                        ? 'bg-bg-surface-light dark:bg-bg-surface-dark shadow-sm text-primary'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                                    }
                                `}
                            >
                                Alphabetical
                            </button>
                            <button
                                onClick={() => setSortBy('usage')}
                                className={`
                                    px-3 h-full rounded-full text-xs font-medium transition-all duration-200
                                    ${sortBy === 'usage'
                                        ? 'bg-bg-surface-light dark:bg-bg-surface-dark shadow-sm text-primary'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                                    }
                                `}
                            >
                                By Usage
                            </button>
                            <button
                                onClick={() => setSortBy('recent')}
                                className={`
                                    px-3 h-full rounded-full text-xs font-medium transition-all duration-200
                                    ${sortBy === 'recent'
                                        ? 'bg-bg-surface-light dark:bg-bg-surface-dark shadow-sm text-primary'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                                    }
                                `}
                            >
                                Recent
                            </button>
                        </div>

                        {/* View Toggle */}
                        <div className="inline-flex items-center rounded-full bg-bg-alt-light dark:bg-bg-alt-dark p-1">
                            <button
                                onClick={() => setViewMode('list')}
                                className={`
                                    p-1.5 rounded-full transition-all
                                    ${viewMode === 'list'
                                        ? 'bg-bg-surface-light dark:bg-bg-surface-dark text-primary shadow-sm'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                                    }
                                `}
                            >
                                <List size={16} />
                            </button>
                            <button
                                onClick={() => setViewMode('grid')}
                                className={`
                                    p-1.5 rounded-full transition-all
                                    ${viewMode === 'grid'
                                        ? 'bg-bg-surface-light dark:bg-bg-surface-dark text-primary shadow-sm'
                                        : 'text-text-secondary-light dark:text-text-secondary-dark'
                                    }
                                `}
                            >
                                <Grid size={16} />
                            </button>
                        </div>
                    </div>

                    {/* Material Design 3 Filled Cards - Collections */}
                    <div className="flex flex-col gap-2">
                        {sortedCollections.map((collection) => (
                            <div
                                key={collection.id}
                                onClick={() => onCollectionClick?.(collection.domain)}
                                className="group flex items-center justify-between p-4 rounded-md bg-surface-container-highest-light dark:bg-surface-container-highest-dark hover:bg-surface-container-high-light dark:hover:bg-surface-container-high-dark transition-colors duration-200 cursor-pointer"
                            >
                                <div className="flex items-center gap-4 overflow-hidden flex-1">
                                    {/* Favicon/Icon - 40dp (same as MD3 list items) */}
                                    <div className="h-10 w-10 shrink-0 rounded-full bg-surface-container-light dark:bg-surface-container-dark flex items-center justify-center text-on-surface-variant-light dark:text-on-surface-variant-dark">
                                        <span className="text-label-large uppercase">
                                            {collection.domain.charAt(0)}
                                        </span>
                                    </div>

                                    {/* Domain Info */}
                                    <div className="flex flex-col truncate">
                                        {/* Title Large (22px) per MD3 */}
                                        <p className="text-title-large text-on-surface-light dark:text-on-surface-dark truncate">
                                            {collection.domain}
                                        </p>
                                        {/* Body Medium (14px) for category */}
                                        <span className="text-body-medium text-on-surface-variant-light dark:text-on-surface-variant-dark">
                                            {collection.category}
                                        </span>
                                    </div>
                                </div>

                                {/* Count + Arrow */}
                                <div className="flex items-center gap-4 shrink-0">
                                    {/* Label Large (14px) for count */}
                                    <p className="text-label-large text-on-surface-variant-light dark:text-on-surface-variant-dark group-hover:text-primary transition-colors">
                                        {collection.count} underscores
                                    </p>
                                    <ArrowRight
                                        size={20}
                                        className="text-on-surface-variant-light dark:text-on-surface-variant-dark group-hover:text-primary group-hover:translate-x-0.5 transition-all"
                                    />
                                </div>

                                {/* State layer */}
                                <div className="absolute inset-0 state-layer-hover pointer-events-none" />
                            </div>
                        ))}
                    </div>

                    {/* Add New Collection Button */}
                    <div className="mt-4 flex justify-center">
                        <button className="text-xs text-primary font-medium hover:text-primary-hover transition-colors flex items-center gap-1">
                            <span className="text-base">+</span>
                            Add new collection
                        </button>
                    </div>
                </main>
            )}

            {/* Footer */}
            <footer className="w-full py-4 mt-auto border-t border-border-light dark:border-border-dark">
                <p className="text-center text-xs text-text-secondary-light dark:text-text-secondary-dark">
                    © 2024 _underscore.
                </p>
            </footer>
        </div>
    );
}
