import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from '@/core/context/AppProvider';
import { WelcomePage } from '@/pages/WelcomePage';
import { SignInView } from '@/features/auth/SignInView';
import { ModeSelectionView } from '@/features/modes/ModeSelectionView';
import { CollectionsView } from '@/features/collections/views/CollectionsView';
import { DomainDetailsView } from '@/features/collections/views/DomainDetailsView';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useNavigate } from 'react-router-dom';

/** Web-app wrapper — provides onNavigateToCollections using react-router */
function ModeSelectionRoute(): React.JSX.Element {
    const navigate = useNavigate();

    const handleNavigateToCollections = () => {
        navigate('/collections');
    };

    return (
        <ModeSelectionView
            onNavigateToCollections={handleNavigateToCollections}
        />
    );
}

function IntentCatcher({ children }: { children: React.ReactNode }) {
    const { setMode } = useApp();
    const navigate = useNavigate();
    
    React.useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const intendedMode = params.get('intendedMode');
        if (intendedMode === 'cloud' || intendedMode === 'ai') {
            setMode(intendedMode);
            navigate('/collections', { replace: true });
        }
    }, [setMode, navigate]);

    return <>{children}</>;
}

export function AppRoutes() {
    return (
        <AppProvider>
            <BrowserRouter>
                <IntentCatcher>
                    <Routes>
                    <Route path="/" element={<WelcomePage />} />
                    <Route path="/sign-in" element={<SignInView />} />
                    <Route path="/mode" element={<ModeSelectionRoute />} />
                    <Route path="/collections" element={<CollectionsView />} />
                    <Route path="/domain/:domain" element={<DomainDetailsView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
                </IntentCatcher>
            </BrowserRouter>
        </AppProvider>
    );
}
