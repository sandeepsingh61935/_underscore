import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AppProvider, useApp } from '@/core/context/AppProvider';
import { WebAuthProvider } from '@/features/auth/providers/WebAuthProvider';
import { WebDataProviderAdapter } from '@/core/data/WebDataProviderAdapter';
import { ProtectedRoute } from '@/core/routing/ProtectedRoute';
import { WelcomePage } from '@/pages/WelcomePage';
import { SignInView } from '@/features/auth/SignInView';
import { VerifyEmailView } from '@/features/auth/VerifyEmailView';
import { ForgotPasswordView } from '@/features/auth/ForgotPasswordView';
import { ResetPasswordView } from '@/features/auth/ResetPasswordView';
import { ModeType } from '@/shared/schemas/mode-state-schemas';
import { ModeSelectionView } from '@/features/modes/ModeSelectionView';
import { CollectionsView } from '@/features/collections/views/CollectionsView';
import { DomainDetailsView } from '@/features/collections/views/DomainDetailsView';
import { SubDomainView } from '@/features/collections/views/SubDomainView';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { OAuthConsentPage } from '@/features/oauth/views/OAuthConsentPage';
import { useNavigate } from 'react-router-dom';

/** Web-app wrapper — provides onNavigateToCollections using react-router */
function ModeSelectionRoute(): React.JSX.Element {
    const navigate = useNavigate();

    const handleNavigateToCollections = () => {
        navigate('/collections');
    };

    const handleSignInClick = (modeId: ModeType) => {
        if (modeId === 'pro' || modeId === 'pro_xai') {
            navigate(`/sign-in?intendedMode=${modeId}`);
        }
    };

    return (
        <ModeSelectionView
            onNavigateToCollections={handleNavigateToCollections}
            onSignInClick={handleSignInClick}
        />
    );
}

/** Routes mid-auth-flow — must never be interrupted by IntentCatcher's redirect. */
const AUTH_PENDING_PATHS = ['/verify-email', '/forgot-password', '/reset-password'];

function IntentCatcher({ children }: { children: React.ReactNode }) {
    const { setMode } = useApp();
    const navigate = useNavigate();

    React.useEffect(() => {
        if (AUTH_PENDING_PATHS.includes(window.location.pathname)) {
            return;
        }
        const params = new URLSearchParams(window.location.search);
        const intendedMode = params.get('intendedMode');
        const returnTo = params.get('returnTo');
        if (intendedMode === 'pro' || intendedMode === 'pro_xai') {
            setMode(intendedMode);
            navigate(returnTo || '/collections', { replace: true });
        }
    }, [setMode, navigate]);

    return <>{children}</>;
}

function SettingsRoute(): React.JSX.Element {
    const navigate = useNavigate();

    return <SettingsPage onSignIn={() => navigate('/sign-in')} />;
}

export function AppRoutes() {
    const dataProvider = new WebDataProviderAdapter();

    return (
        <WebAuthProvider>
            <AppProvider dataProvider={dataProvider}>
                <BrowserRouter>
                    <IntentCatcher>
                        <Routes>
                            <Route path="/" element={<WelcomePage />} />
                            <Route path="/sign-in" element={<SignInView />} />
                            <Route path="/verify-email" element={<VerifyEmailView />} />
                            <Route path="/forgot-password" element={<ForgotPasswordView />} />
                            <Route path="/reset-password" element={<ResetPasswordView />} />
                            <Route path="/oauth/consent" element={<OAuthConsentPage />} />
                            <Route path="/mode" element={<ModeSelectionRoute />} />
                            <Route path="/collections" element={<ProtectedRoute><CollectionsView /></ProtectedRoute>} />
                            <Route path="/domain/:domain" element={<ProtectedRoute><DomainDetailsView /></ProtectedRoute>} />
                            <Route path="/domain/:domain/section/:section" element={<ProtectedRoute><SubDomainView /></ProtectedRoute>} />
                            <Route path="/settings" element={<SettingsRoute />} />
                            <Route path="/privacy" element={<PrivacyPage />} />
                            <Route path="/terms" element={<TermsPage />} />
                            <Route path="*" element={<NotFoundPage />} />
                        </Routes>
                    </IntentCatcher>
                </BrowserRouter>
            </AppProvider>
        </WebAuthProvider>
    );
}
