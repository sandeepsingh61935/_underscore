import React from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useParams,
  useNavigate,
} from 'react-router-dom';

import { AppProvider, useApp } from '@/core/context/AppProvider';
import { WebDataProviderAdapter } from '@/core/data/WebDataProviderAdapter';
import { ForgotPasswordView } from '@/features/auth/ForgotPasswordView';
import { WebAuthProvider } from '@/features/auth/providers/WebAuthProvider';
import { ResetPasswordView } from '@/features/auth/ResetPasswordView';
import { SignInView } from '@/features/auth/SignInView';
import { VerifyEmailView } from '@/features/auth/VerifyEmailView';
import { OAuthConsentPage } from '@/features/oauth/views/OAuthConsentPage';
import { HelpPage } from '@/pages/HelpPage';
import { InstallPage } from '@/pages/InstallPage';
import { NotFoundPage } from '@/pages/NotFoundPage';
import { PrivacyPage } from '@/pages/PrivacyPage';
import { TermsPage } from '@/pages/TermsPage';
import { GuestExtensionGate } from '@/web/guards/GuestExtensionGate';
import { WebAppShell } from '@/web/layout/WebAppShell';
import { HomePage } from '@/web/pages/HomePage';
import { LibraryPage } from '@/web/pages/LibraryPage';
import { WebSettingsPage } from '@/web/pages/WebSettingsPage';
import { AuthPageEntry } from '@/web/routing/AuthPageEntry';
import { resolveLegacyRedirect } from '@/web/routing/legacyRedirects';
import { RootEntry } from '@/web/routing/RootEntry';

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
      navigate(returnTo || '/home', { replace: true });
    }
  }, [setMode, navigate]);

  return <>{children}</>;
}

/**
 * Legacy /domain/:domain[/section/:section] → /library?domain=&section=
 */
function LegacyDomainRedirect(): React.JSX.Element {
  const params = useParams<{ domain?: string; section?: string }>();
  const pathname = window.location.pathname;
  const target =
    resolveLegacyRedirect(pathname, {
      domain: params.domain,
      section: params.section,
    }) ?? '/library';
  return <Navigate to={target} replace />;
}

export function AppRoutes() {
  const dataProvider = new WebDataProviderAdapter();

  return (
    <WebAuthProvider>
      <AppProvider dataProvider={dataProvider}>
        <BrowserRouter>
          <IntentCatcher>
            <Routes>
              {/* Public / marketing — root waits on auth boot (no Welcome flash) */}
              <Route path="/" element={<RootEntry />} />
              <Route
                path="/sign-in"
                element={
                  <AuthPageEntry>
                    <SignInView />
                  </AuthPageEntry>
                }
              />
              <Route path="/verify-email" element={<VerifyEmailView />} />
              <Route path="/forgot-password" element={<ForgotPasswordView />} />
              <Route path="/reset-password" element={<ResetPasswordView />} />
              <Route path="/oauth/consent" element={<OAuthConsentPage />} />
              <Route path="/privacy" element={<PrivacyPage />} />
              <Route path="/terms" element={<TermsPage />} />
              <Route path="/help" element={<HelpPage />} />
              <Route path="/install" element={<InstallPage />} />

              {/* Product shell — guests require extension ping (SPA gate only) */}
              <Route element={<GuestExtensionGate />}>
                <Route element={<WebAppShell />}>
                  <Route path="/home" element={<HomePage />} />
                  <Route path="/library" element={<LibraryPage />} />
                  <Route path="/settings" element={<WebSettingsPage />} />
                  <Route path="/ask" element={<Navigate to="/home" replace />} />
                  <Route path="/ask/*" element={<Navigate to="/home" replace />} />
                  <Route path="/insights" element={<Navigate to="/home" replace />} />
                  <Route path="/insights/*" element={<Navigate to="/home" replace />} />
                </Route>
              </Route>

              {/* Legacy redirects (public) */}
              <Route path="/collections" element={<Navigate to="/library" replace />} />
              <Route path="/domain/:domain" element={<LegacyDomainRedirect />} />
              <Route
                path="/domain/:domain/section/:section"
                element={<LegacyDomainRedirect />}
              />

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </IntentCatcher>
        </BrowserRouter>
      </AppProvider>
    </WebAuthProvider>
  );
}
