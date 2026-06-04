import { AnimatePresence, motion } from 'framer-motion';
import type { ErrorInfo, ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster } from 'sonner';

import { PopupAppProvider, useApp } from '../../core/context/PopupAppProvider';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { CollectionsView } from '../../features/collections/views/CollectionsView';
import { DomainDetailsView } from '../../features/collections/views/DomainDetailsView';
import { ModeSelectionView } from '../../features/modes/ModeSelectionView';
import { SettingsPage } from '../../pages/SettingsPage';
import { WelcomePage } from '../../pages/WelcomePage';
import type { ModeType } from '../../shared/schemas/mode-state-schemas';
import { Spinner } from '../../ui-system/components/primitives/Spinner';
import { AppShell } from '../../ui-system/layout/AppShell';

import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';

import { springs } from '@/ui-system/motion/springs';
import '../../ui-system/theme/global.css';
import './base.css';

enum View {
  LOADING = 'LOADING',
  WELCOME = 'WELCOME',
  MODE_SELECTION = 'MODE_SELECTION',
  COLLECTIONS = 'COLLECTIONS',
  DOMAIN_DETAILS = 'DOMAIN_DETAILS',
  AUTH = 'AUTH',
  SETTINGS = 'SETTINGS',
  DASHBOARD = 'DASHBOARD',
}

const screenVariants = {
  initial: { opacity: 0, y: 10,  scale: 0.984 },
  animate: { opacity: 1, y: 0,   scale: 1     },
  exit:    { opacity: 0, y: -6,  scale: 1.012 },
} as const;

class ErrorBoundary extends Component<
  { children: ReactNode },
  { hasError: boolean; error: Error | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): {
    hasError: boolean;
    error: Error | null;
  } {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    console.error('Popup Error:', error, errorInfo);
  }

  override render(): ReactNode {
    if (this.state.hasError) {
      return (
        <div className="w-[400px] h-[600px] p-4 bg-surface text-on-surface flex flex-col items-center justify-center text-center">
          <h2 className="text-title-large text-error mb-2">Something went wrong</h2>
          <p className="text-body-small text-on-surface-variant mb-4">
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex min-h-[48px] items-center justify-center rounded-full bg-primary px-4 py-2 text-label-large text-on-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            Reload Extension
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}

function PopupApp(): React.ReactElement {
  const { user, logout, isLoading, setMode } = useApp(); // Use from context now!
  // Auth sync is now handled by PopupAppProvider via props

  const [currentView, setCurrentView] = useState<View>(View.LOADING);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [activeTab, setActiveTab] = useState<'home' | 'collections' | 'search' | 'settings'>('home');

  // Initialization
  useEffect(() => {
    if (isLoading) return;

    async function initStorage(): Promise<void> {
      try {
        const data = await browser.storage.local.get([
          'underscore_seen_welcome',
          'underscore_seen_mode_selection',
          'underscore_last_popup_view',
          'underscore_last_selected_domain',
        ]);
        const hasSeenWelcome = data['underscore_seen_welcome'] === 'true';
        const hasSeenModeSelection = data['underscore_seen_mode_selection'] === 'true';
        const lastView = data['underscore_last_popup_view'] as View;
        const lastDomain = (data['underscore_last_selected_domain'] as string) || '';

        if (!hasSeenWelcome) {
          setCurrentView(View.WELCOME);
          return;
        }

        if (user) {
          // If user is already logged in, skip mode selection and prefer collections/details/settings
          if (lastView === View.DOMAIN_DETAILS || lastView === View.SETTINGS) {
            if (lastView === View.DOMAIN_DETAILS && lastDomain) setSelectedDomain(lastDomain);
            setCurrentView(lastView);
          } else {
            setCurrentView(View.COLLECTIONS);
          }
        } else if (!hasSeenModeSelection) {
          setCurrentView(View.MODE_SELECTION);
        } else {
          // Not logged in but already chose a mode — go to collections, not mode selection again
          if (lastView === View.AUTH || lastView === View.SETTINGS) {
            setCurrentView(lastView);
          } else if (lastView === View.DOMAIN_DETAILS) {
            if (lastDomain) setSelectedDomain(lastDomain);
            setCurrentView(View.DOMAIN_DETAILS);
          } else {
            setCurrentView(View.COLLECTIONS);
          }
        }
      } catch (err) {
        console.error('Storage load failed', err);
        setCurrentView(View.WELCOME);
      } finally {
        setIsStorageReady(true);
      }
    }

    initStorage();
  }, [isLoading]);

  // Persist View State
  useEffect(() => {
    if (!isStorageReady) return;

    if (
      currentView === View.COLLECTIONS ||
      currentView === View.MODE_SELECTION ||
      currentView === View.DOMAIN_DETAILS
    ) {
      browser.storage.local
        .set({ underscore_last_popup_view: currentView })
        .catch(console.error);
    }
  }, [currentView, isStorageReady]);

  const handleStartWelcome = async (): Promise<void> => {
    await browser.storage.local.set({ underscore_seen_welcome: 'true' });
    setCurrentView(View.MODE_SELECTION);
  };

  const handleModeSelect = async (modeId: string): Promise<void> => {
    // Mark mode selection as seen
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });

    // Update global mode state
    setMode(modeId as ModeType);

    // Note: Mode gets set via contexts/hooks within the view or globally
    setCurrentView(View.COLLECTIONS);
  };

  const handleSignInClick = async (): Promise<void> => {
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });
    setCurrentView(View.AUTH);
  };

  const handleLoginSuccess = (): void => {
    setCurrentView(View.COLLECTIONS);
  };

  const handleLogout = async (): Promise<void> => {
    await logout();
    setCurrentView(View.MODE_SELECTION);
  };

  const handleBackToModeSelection = (): void => {
    setCurrentView(View.MODE_SELECTION);
  };

  const handleCollectionClick = (domain: string): void => {
    setSelectedDomain(domain);
    void browser.storage.local.set({ underscore_last_selected_domain: domain });
    setCurrentView(View.DOMAIN_DETAILS);
  };

  const handleBackToCollections = (): void => {
    void browser.storage.local.remove('underscore_last_selected_domain');
    setCurrentView(View.COLLECTIONS);
  };

  const handleSettingsClick = (): void => {
    setPreviousView(currentView);
    setCurrentView(View.SETTINGS);
  };

  const handleSettingsChangeMode = (): void => {
    setPreviousView(currentView);
    setCurrentView(View.MODE_SELECTION);
  };

  const handleModeSelectionBack = (): void => {
    if (previousView && previousView !== View.MODE_SELECTION) {
      setCurrentView(previousView);
      setPreviousView(null);
    } else {
      setCurrentView(View.COLLECTIONS);
    }
  };

  if (currentView === View.LOADING || !isStorageReady) {
    return (
      <div className="w-[400px] h-[600px] flex items-center justify-center bg-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  const handleTabChange = (tab: typeof activeTab): void => {
    setActiveTab(tab);
    switch (tab) {
      case 'home':        setCurrentView(View.DASHBOARD); break;
      case 'collections': setCurrentView(View.COLLECTIONS); break;
      case 'search':      /* future — noop */ break;
      case 'settings':    handleSettingsClick(); break;
    }
  };

  return (
    <AppShell>
      <AnimatePresence mode="wait">
        {currentView === View.WELCOME && (
          <motion.div
            key="welcome"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <WelcomePage onStartClick={handleStartWelcome} />
          </motion.div>
        )}
        {currentView === View.MODE_SELECTION && (
          <motion.div
            key="mode-selection"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <ModeSelectionView
              onModeSelect={handleModeSelect}
              onSignInClick={handleSignInClick}
              onBack={previousView ? handleModeSelectionBack : undefined}
              onNavigateToCollections={() => setCurrentView(View.COLLECTIONS)}
            />
          </motion.div>
        )}
        {currentView === View.COLLECTIONS && (
          <motion.div
            key="collections"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <CollectionsView
              onSignInClick={user ? undefined : handleSignInClick}
              onCollectionClick={handleCollectionClick}
              onLogout={handleLogout}
              onSettingsClick={handleSettingsClick}
              user={user}
              isAuthenticated={!!user}
            />
          </motion.div>
        )}
        {currentView === View.DOMAIN_DETAILS && (
          <motion.div
            key="domain-details"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <DomainDetailsView domain={selectedDomain} onBack={handleBackToCollections} />
          </motion.div>
        )}
        {currentView === View.AUTH && (
          <motion.div
            key="auth"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <AuthView
              onLoginSuccess={handleLoginSuccess}
              onBackToModeSelection={handleBackToModeSelection}
            />
          </motion.div>
        )}
        {currentView === View.SETTINGS && (
          <motion.div
            key="settings"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <SettingsPage
              onBack={handleBackToCollections}
              onChangeMode={handleSettingsChangeMode}
            />
          </motion.div>
        )}
        {currentView === View.DASHBOARD && (
          <motion.div
            key="dashboard"
            variants={screenVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            transition={springs.gentle}
            style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
          >
            <DashboardView
              onLogout={handleLogout}
              activeTab={activeTab}
              onTabChange={handleTabChange}
            />
          </motion.div>
        )}
      </AnimatePresence>
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

function PopupAppWithProviders(): React.ReactElement {
  const { user, isLoading, logout } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="w-[400px] h-[600px] flex items-center justify-center bg-surface">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <PopupAppProvider
      user={
        user
          ? {
              id: user.id,
              email: user.email,
              displayName: user.displayName || user.name || 'User',
              photoUrl: user.photoUrl || user.avatarUrl,
              // provider field removed as it does not exist on User interface
            }
          : null
      }
      isAuthenticated={!!user}
      onLogout={logout}
    >
      <PopupApp />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--md-sys-color-surface-container)',
            border: '1px solid var(--md-sys-color-outline-variant)',
            color: 'var(--md-sys-color-on-surface)',
            fontFamily: 'var(--font-body, DM Sans, sans-serif)',
            fontSize: '12px',
            borderRadius: '10px',
          },
        }}
      />
    </PopupAppProvider>
  );
}
