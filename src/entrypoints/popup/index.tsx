import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { Component, ErrorInfo, ReactNode } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { PopupAppProvider, useApp } from '../../core/context/PopupAppProvider';
import { AppShell } from '../../ui-system/layout/AppShell';
import { AuthView } from './views/AuthView';
import { ModeSelectionView } from '../../features/modes/ModeSelectionView';
import { CollectionsView } from '../../features/collections/views/CollectionsView';
import { DomainDetailsView } from '../../features/collections/views/DomainDetailsView';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { Spinner } from '../../ui-system/components/primitives/Spinner';
import '../../ui-system/theme/global.css';
import './base.css';

enum View {
    LOADING = 'LOADING',
    MODE_SELECTION = 'MODE_SELECTION',
    COLLECTIONS = 'COLLECTIONS',
    DOMAIN_DETAILS = 'DOMAIN_DETAILS',
    AUTH = 'AUTH',
}

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean; error: Error | null }> {
    constructor(props: { children: ReactNode }) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error) {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Popup Error:', error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="w-[400px] h-[600px] p-4 bg-surface text-on-surface flex flex-col items-center justify-center text-center">
                    <h2 className="text-xl font-bold text-error mb-2">Something went wrong</h2>
                    <p className="text-sm text-on-surface-variant mb-4">
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-4 py-2 bg-primary text-on-primary rounded-full text-sm font-medium"
                    >
                        Reload Extension
                    </button>
                </div>
            );
        }

        return this.props.children;
    }
}

function PopupApp() {
    const { user, logout, isLoading } = useApp(); // Use from context now!
    // Auth sync is now handled by PopupAppProvider via props
    // No need for manual sync effect

    const [currentView, setCurrentView] = useState<View>(View.LOADING);
    const [hasSeenModeSelection, setHasSeenModeSelection] = useState(false);
    const [selectedMode, setSelectedMode] = useState<'focus' | 'capture' | 'memory' | 'neural'>('focus');
    const [selectedDomain, setSelectedDomain] = useState<string>('');


    useEffect(() => {
        if (isLoading) return;

        // Check if user has seen mode selection (stored in localStorage)
        const seenModeSelection = localStorage.getItem('underscore_seen_mode_selection') === 'true';
        setHasSeenModeSelection(seenModeSelection);

        if (!seenModeSelection) {
            setCurrentView(View.MODE_SELECTION);
        } else if (!user) {
            setCurrentView(View.AUTH);
        } else {
            // Authenticated users go straight to Collections
            setCurrentView(View.COLLECTIONS);
        }
    }, [user, isLoading]);

    const handleModeSelect = (modeId: string) => {
        console.log('[PopupApp] Mode selected:', modeId);

        // Mark mode selection as seen
        localStorage.setItem('underscore_seen_mode_selection', 'true');
        setHasSeenModeSelection(true);

        // Set selected mode and navigate to collections
        const validModes = ['focus', 'capture', 'memory', 'neural'] as const;
        const mode = validModes.includes(modeId as any) ? (modeId as typeof validModes[number]) : 'focus';
        setSelectedMode(mode);
        setCurrentView(View.COLLECTIONS);
    };

    const handleModeChange = (newMode: 'focus' | 'capture' | 'memory' | 'neural') => {
        setSelectedMode(newMode);
    };

    const handleSignInClick = () => {
        localStorage.setItem('underscore_seen_mode_selection', 'true');
        setHasSeenModeSelection(true);
        setCurrentView(View.AUTH);
    };

    const handleLoginSuccess = () => {
        setCurrentView(View.COLLECTIONS);
    };

    const handleLogout = async () => {
        await logout();
        setCurrentView(View.MODE_SELECTION);
    };

    const handleBackToModeSelection = () => {
        setCurrentView(View.MODE_SELECTION);
    };

    const handleCollectionClick = (domain: string) => {
        setSelectedDomain(domain);
        setCurrentView(View.DOMAIN_DETAILS);
    };

    const handleBackToCollections = () => {
        setCurrentView(View.COLLECTIONS);
    };

    if (currentView === View.LOADING) {
        return (
            <div className="w-[400px] h-[600px] flex items-center justify-center bg-surface">
                <Spinner size={32} />
            </div>
        );
    }

    return (
        <AppShell>
            {currentView === View.MODE_SELECTION && (
                <ModeSelectionView
                    onModeSelect={handleModeSelect}
                    onSignInClick={handleSignInClick}
                />
            )}
            {currentView === View.COLLECTIONS && (
                <CollectionsView
                    mode={selectedMode}
                    onModeChange={handleModeChange as any}
                    onSignInClick={user ? undefined : handleSignInClick}
                    onCollectionClick={handleCollectionClick}
                    onLogout={handleLogout}
                    user={user}
                    isAuthenticated={!!user}
                />
            )}
            {currentView === View.DOMAIN_DETAILS && (
                <DomainDetailsView
                    domain={selectedDomain}
                    onBack={handleBackToCollections}
                />
            )}
            {currentView === View.AUTH && (
                <AuthView
                    onLoginSuccess={handleLoginSuccess}
                    onBackToModeSelection={handleBackToModeSelection}
                />
            )}
        </AppShell>
    );
}

const container = document.getElementById('app');
if (container) {
    const root = createRoot(container);
    root.render(
        <React.StrictMode>
            <ErrorBoundary>
                <MemoryRouter>
                    <PopupAppWithProviders />
                </MemoryRouter>
            </ErrorBoundary>
        </React.StrictMode>
    );
} else {
    console.error('Failed to find #app container');
}

function PopupAppWithProviders() {
    const { user, isLoading, logout } = useCurrentUser();

    if (isLoading) {
        return (
            <div className="w-[400px] h-[600px] flex items-center justify-center bg-surface">
                <Spinner size={32} />
            </div>
        );
    }

    return (
        <PopupAppProvider
            user={user ? {
                id: user.id,
                email: user.email,
                displayName: user.displayName || user.name || 'User',
                photoUrl: user.photoUrl || user.avatarUrl,
                // provider field removed as it does not exist on User interface
            } : null}
            isAuthenticated={!!user}
            onLogout={logout}
        >
            <PopupApp />
        </PopupAppProvider>
    );
}
