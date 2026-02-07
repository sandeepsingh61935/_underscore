import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/core/context/AppProvider';
import { WelcomePage } from '@/pages/WelcomePage';
import { SignInView } from '@/features/auth/SignInView';
import { ModeSelectionView } from '@/features/modes/ModeSelectionView';
import { CollectionsView } from '@/features/collections/views/CollectionsView';
import { DomainDetailsView } from '@/features/collections/views/DomainDetailsView';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { SettingsPage } from '@/pages/SettingsPage';

export function AppRoutes() {
    return (
        <AppProvider>
            <BrowserRouter>
                <Routes>
                    <Route path="/" element={<WelcomePage />} />
                    <Route path="/sign-in" element={<SignInView />} />
                    <Route path="/mode" element={<ModeSelectionView />} />
                    <Route path="/collections" element={<CollectionsView />} />
                    <Route path="/domain/:domain" element={<DomainDetailsView />} />
                    <Route path="/settings" element={<SettingsPage />} />
                    <Route path="/privacy" element={<PrivacyPage />} />
                    {/* Catch-all */}
                    <Route path="*" element={<NotFoundPage />} />
                </Routes>
            </BrowserRouter>
        </AppProvider>
    );
}

