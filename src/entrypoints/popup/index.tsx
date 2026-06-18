import { motion } from 'framer-motion';
import type { ErrorInfo, ReactNode } from 'react';
import React, { useState, useEffect } from 'react';
import { Component } from 'react';
import { createRoot } from 'react-dom/client';
import { MemoryRouter } from 'react-router-dom';
import { Toaster, toast } from 'sonner';

import { PopupAppProvider, useApp } from '../../core/context/PopupAppProvider';
import { useCurrentUser } from '../../features/auth/hooks/useCurrentUser';
import { useUnlockVault } from '../../features/auth/hooks/useUnlockVault';
import { CollectionsView } from '../../features/collections/views/CollectionsView';
import { DomainDetailsView } from '../../features/collections/views/DomainDetailsView';
import { SubDomainView } from '../../features/collections/views/SubDomainView';
import { ModeSelectionView } from '../../features/modes/ModeSelectionView';
import { SettingsPage } from '../../pages/SettingsPage';
import { WelcomePage } from '../../pages/WelcomePage';
import type { ModeType } from '../../shared/schemas/mode-state-schemas';
import { PopupShell } from '../../ui-system/components/layout/PopupShell';
import { Spinner } from '../../ui-system/components/primitives/Spinner';

import { buildChrome, type ActiveTab, type ChromeHandlers, type ViewKey } from './chrome';
import { AuthView } from './views/AuthView';
import { DashboardView } from './views/DashboardView';
import { UnlockVaultView } from './views/UnlockVaultView';

import { EventBus } from '@/shared/utils/event-bus';
import { ConsoleLogger, LogLevel } from '@/shared/utils/logger';
import { ChromeMessageBus } from '@/shared/services/chrome-message-bus';
import { MessageBusProvider } from '@/shared/contexts/MessageBusContext';
import { ExtensionDataProviderAdapter } from '@/core/data/ExtensionDataProviderAdapter';
import { springs } from '@/ui-system/motion/springs';
import '../../ui-system/theme/global.css';
import './base.css';

enum View {
  LOADING = 'LOADING',
  WELCOME = 'WELCOME',
  MODE_SELECTION = 'MODE_SELECTION',
  COLLECTIONS = 'COLLECTIONS',
  DOMAIN_DETAILS = 'DOMAIN_DETAILS',
  SUB_DOMAIN = 'SUB_DOMAIN',
  AUTH = 'AUTH',
  UNLOCK_VAULT = 'UNLOCK_VAULT',
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
        <div style={{ width: 400, height: 600, padding: 16, backgroundColor: 'var(--paper)', color: 'var(--ink)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
          <h2 className="u-serif" style={{ fontSize: 22, color: 'var(--accent)', marginBottom: 8 }}>Something went wrong</h2>
          <p className="u-sans" style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
            {this.state.error?.message || 'Unknown error'}
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="btn"
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
  const { user, logout, isLoading, setMode, currentMode } = useApp(); // Use from context now!
  const { unlock: unlockVault, isUnlocking: isUnlockingVault } = useUnlockVault();
  // Auth sync is now handled by PopupAppProvider via props

  const [currentView, setCurrentView] = useState<View>(View.LOADING);
  const [previousView, setPreviousView] = useState<View | null>(null);
  const [selectedDomain, setSelectedDomain] = useState<string>('');
  const [selectedSection, setSelectedSection] = useState<string>('');
  const [isStorageReady, setIsStorageReady] = useState(false);
  const [pendingMode, setPendingMode] = useState<ModeType | null>(null);
  const [prevUser, setPrevUser] = useState<typeof user | undefined>(undefined);

  // Authentication & Mode Notification / Swapping Effect
  useEffect(() => {
    if (isLoading || !isStorageReady) return;

    if (prevUser !== undefined) {
      if (user && !prevUser) {
        const name = user.displayName || user.email || 'User';
        toast.success(`Welcome, ${name}!`);
      } else if (!user && prevUser) {
        toast.success('Signed out · Switched to Ephemeral mode');
      }
    }
    setPrevUser(user);
  }, [user, prevUser, isLoading, isStorageReady]);

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
      currentView === View.DOMAIN_DETAILS ||
      currentView === View.SUB_DOMAIN
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

  const handleSignInClick = async (modeId: ModeType): Promise<void> => {
    setPendingMode(modeId);
    await browser.storage.local.set({ underscore_seen_mode_selection: 'true' });
    setCurrentView(View.AUTH);
  };

  const handleLoginSuccess = (): void => {
    const targetMode = pendingMode || 'cloud';
    setMode(targetMode);
    setPendingMode(null);
    if (targetMode === 'cloud' || targetMode === 'ai') {
      setCurrentView(View.UNLOCK_VAULT);
      return;
    }
    setCurrentView(View.COLLECTIONS);
  };

  const handleUnlockSuccess = (): void => {
    setCurrentView(View.COLLECTIONS);
  };

  const handleUnlockCancel = (): void => {
    setCurrentView(View.MODE_SELECTION);
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

  const handleSectionClick = (domain: string, section: string): void => {
    setSelectedDomain(domain);
    setSelectedSection(section);
    setCurrentView(View.SUB_DOMAIN);
  };

  const handleBackToDomain = (): void => {
    setCurrentView(View.DOMAIN_DETAILS);
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

  const handleBackFromSettings = (): void => {
    if (previousView && previousView !== View.SETTINGS) {
      setCurrentView(previousView);
    } else {
      setCurrentView(View.COLLECTIONS);
    }
  };

  const handleTabChange = (tab: ActiveTab): void => {
    switch (tab) {
      case 'home':        setCurrentView(View.DASHBOARD); break;
      case 'collections': setCurrentView(View.COLLECTIONS); break;
      case 'settings':    handleSettingsClick(); break;
    }
  };

  const chromeHandlers: ChromeHandlers = {
    onTabChange: handleTabChange,
    onSwitch: handleSettingsChangeMode,
    onBackToCollections: handleBackToCollections,
    onBackToDomain: handleBackToDomain,
    onBackFromSettings: handleBackFromSettings,
    subDomainBackLabel: () => selectedDomain,
    getModeId: () => (typeof currentMode === 'string' ? currentMode : 'local'),
  };
  const chrome = buildChrome(chromeHandlers);

  if (currentView === View.LOADING || !isStorageReady) {
    return (
      <PopupShell chrome={chrome[View.LOADING]} viewKey={View.LOADING}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Spinner size="lg" />
        </div>
      </PopupShell>
    );
  }

  return (
    <PopupShell chrome={chrome[currentView as ViewKey]} viewKey={currentView}>
      {currentView === View.WELCOME && (
        <motion.div
          key="welcome"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springs.gentle}
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
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
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <ModeSelectionView
            onModeSelect={handleModeSelect}
            onSignInClick={handleSignInClick}
            onBack={previousView ? handleModeSelectionBack : undefined}
            onNavigateToCollections={() => setCurrentView(View.COLLECTIONS)}
            initialMode={currentMode}
            isAuthenticated={!!user}
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
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <CollectionsView
            onCollectionClick={handleCollectionClick}
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
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <DomainDetailsView
            domain={selectedDomain}
            onBack={handleBackToCollections}
            onSectionClick={handleSectionClick}
          />
        </motion.div>
      )}
      {currentView === View.SUB_DOMAIN && (
        <motion.div
          key="sub-domain"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springs.gentle}
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <SubDomainView
            domain={selectedDomain}
            section={selectedSection}
            onBack={handleBackToDomain}
          />
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
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <AuthView
            onLoginSuccess={handleLoginSuccess}
            onBackToModeSelection={handleBackToModeSelection}
          />
        </motion.div>
      )}
      {currentView === View.UNLOCK_VAULT && (
        <motion.div
          key="unlock-vault"
          variants={screenVariants}
          initial="initial"
          animate="animate"
          exit="exit"
          transition={springs.gentle}
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <UnlockVaultView
            onUnlock={unlockVault}
            onUnlockSuccess={handleUnlockSuccess}
            onCancel={handleUnlockCancel}
            isUnlocking={isUnlockingVault}
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
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
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
          style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100%' }}
        >
          <DashboardView
            onLogout={handleLogout}
            onSectionClick={handleSectionClick}
          />
        </motion.div>
      )}
    </PopupShell>
  );
}

const popupEventBus = new EventBus(new ConsoleLogger('PopupData', LogLevel.WARN));
const popupDataProvider = new ExtensionDataProviderAdapter(popupEventBus);
const popupMessageBus = new ChromeMessageBus(new ConsoleLogger('PopupMessageBus', LogLevel.WARN));

const container = document.getElementById('app');
if (container) {
  const root = createRoot(container);
  root.render(
    <React.StrictMode>
      <ErrorBoundary>
        <MessageBusProvider messageBus={popupMessageBus}>
          <MemoryRouter>
            <PopupAppWithProviders />
          </MemoryRouter>
        </MessageBusProvider>
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
      <div style={{ width: 400, height: 600, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--paper)' }}>
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
      dataProvider={popupDataProvider}
    >
      <PopupApp />
      <Toaster
        position="bottom-center"
        toastOptions={{
          style: {
            background: 'var(--paper-2)',
            border: '1px solid var(--rule)',
            color: 'var(--ink)',
            fontFamily: 'var(--sans)',
            fontSize: '13px',
            borderRadius: 'var(--radius)',
          },
        }}
      />
    </PopupAppProvider>
  );
}
