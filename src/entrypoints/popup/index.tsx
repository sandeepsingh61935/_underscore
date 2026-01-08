import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell } from '../../ui-system/layout/AppShell';
import { AuthView } from './views/AuthView';
import { ModeSelectionView } from '../../features/modes/ModeSelectionView';
import { CollectionsView } from '../../features/collections/views/CollectionsView';
import { DomainDetailsView } from '../../features/collections/views/DomainDetailsView';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { Spinner } from '../../ui-system/components/primitives/Spinner';
import '../../ui-system/theme/global.css';

enum View {
    LOADING = 'LOADING',
    MODE_SELECTION = 'MODE_SELECTION',
    COLLECTIONS = 'COLLECTIONS',
    DOMAIN_DETAILS = 'DOMAIN_DETAILS',
    AUTH = 'AUTH',
}

function PopupApp() {
    const { user, isLoading } = useCurrentUser();
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

    const handleLogout = () => {
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
            <div className="w-[360px] h-[600px] flex items-center justify-center bg-bg-base-light dark:bg-bg-base-dark">
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
                    onModeChange={handleModeChange}
                    onSignInClick={user ? undefined : handleSignInClick}
                    onCollectionClick={handleCollectionClick}
                    onLogout={handleLogout}
                    userEmail={user?.email}
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
            <PopupApp />
        </React.StrictMode>
    );
} else {
    console.error('Failed to find #app container');
}
