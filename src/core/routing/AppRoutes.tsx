import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider } from '@/core/context/AppProvider';
import { WelcomePage } from '@/pages/WelcomePage';
import { SignInView } from '@/features/auth/SignInView';
import { ModeSelectionView } from '@/features/modes/ModeSelectionView';
import { CollectionsView } from '@/features/collections/views/CollectionsView';
import { DomainDetailsView } from '@/features/collections/views/DomainDetailsView';

// Simple NotFound component
function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="text-center">
                <h1 className="text-6xl font-bold mb-4">404</h1>
                <p className="text-xl text-muted-foreground">Page not found</p>
            </div>
        </div>
    );
}

// Simple Privacy page
function PrivacyPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
            <div className="max-w-2xl">
                <h1 className="text-4xl font-bold mb-4">Privacy Policy</h1>
                <p className="text-muted-foreground">Your privacy is important to us.</p>
            </div>
        </div>
    );
}

// Simple Settings page
function SettingsPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground p-8">
            <div className="max-w-2xl">
                <h1 className="text-4xl font-bold mb-4">Settings</h1>
                <p className="text-muted-foreground">Configure your preferences.</p>
            </div>
        </div>
    );
}

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
