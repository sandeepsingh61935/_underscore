import React, { useEffect, useMemo, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Settings, Sun } from 'lucide-react';
import { Toaster } from 'sonner';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import { useExtensionNoticeChrome } from '@/web/hooks/useExtensionNoticeChrome';
import { useMobileWebViewport } from '@/web/lib/is-mobile-web-viewport';
import { applyWebPrefs, readWebPrefs } from '@/web/lib/webPrefs';
import { takeOauthReturnTo } from '@/web/routing/oauth-return-to';
import { resolveSafeReturnTo } from '@/web/routing/safe-return-to';

type ProductRoute = 'home' | 'library' | 'groups' | 'settings';

const ROUTE_META: Record<ProductRoute, { label: string; path: string }> = {
  home: {
    label: 'Home',
    path: '/home',
  },
  library: {
    label: 'Library',
    path: '/library',
  },
  groups: {
    label: 'Groups',
    path: '/groups',
  },
  settings: {
    label: 'Settings',
    path: '/settings',
  },
};

function routeFromPathname(pathname: string): ProductRoute {
  if (pathname.startsWith('/groups')) return 'groups';
  if (pathname.startsWith('/library')) return 'library';
  if (pathname.startsWith('/settings')) return 'settings';
  return 'home';
}

function initialsFromEmail(email: string | undefined | null): string {
  if (!email) return 'G';
  const local = email.split('@')[0] ?? email;
  const parts = local.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return local.slice(0, 2).toUpperCase() || 'U';
}

const IconHome = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    aria-hidden="true"
  >
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
  </svg>
);

const IconLibrary = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    aria-hidden="true"
  >
    <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
  </svg>
);

const IconGroups = () => (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.75"
    aria-hidden="true"
  >
    <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
  </svg>
);

const IconSettings = () => (
  <Settings size={18} strokeWidth={1.75} aria-hidden="true" />
);

const NAV_ITEMS: Array<{
  route: ProductRoute;
  odId: string;
  icon: React.ReactNode;
}> = [
  { route: 'home', odId: 'nav-home', icon: <IconHome /> },
  { route: 'library', odId: 'nav-library', icon: <IconLibrary /> },
  { route: 'groups', odId: 'nav-groups', icon: <IconGroups /> },
  { route: 'settings', odId: 'nav-settings', icon: <IconSettings /> },
];

/**
 * Product chrome shell: sidebar (248→72), mobile tabbar, guest-aware foot.
 * No product topbar — page titles live in each route body.
 * Outlet renders product pages. Public auth routes stay outside this layout.
 */
export function WebAppShell(): React.ReactElement {
  const app = useApp();
  const isAuthenticated = app?.isAuthenticated ?? false;
  const user = app?.user ?? null;
  const appTheme = app?.theme ?? 'light';
  const setTheme = app?.setTheme;

  const [isDark, setIsDark] = useState<boolean>(() => {
    if (typeof document !== 'undefined') {
      return document.documentElement.classList.contains('dark');
    }
    return appTheme === 'dark';
  });

  useEffect(() => {
    const syncTheme = () => {
      if (typeof document !== 'undefined') {
        setIsDark(document.documentElement.classList.contains('dark'));
      }
    };
    syncTheme();

    if (typeof document === 'undefined' || typeof MutationObserver === 'undefined') {
      return undefined;
    }

    const observer = new MutationObserver(syncTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [appTheme]);

  const handleToggleTheme = () => {
    const nextTheme = isDark ? 'light' : 'dark';
    setIsDark(!isDark);
    setTheme?.(nextTheme);
  };

  const billing = useBillingContextOptional();
  const location = useLocation();
  const navigate = useNavigate();
  const { strip: extNoticeStrip, remnant: extNoticeRemnant } = useExtensionNoticeChrome();
  const phoneLayout = useMobileWebViewport();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Density (and future prefs) on shell mount — not only when Appearance tab opens.
  useEffect(() => {
    applyWebPrefs(readWebPrefs());
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    const stashed = takeOauthReturnTo();
    if (!stashed) return;
    const target = resolveSafeReturnTo(stashed, '/home');
    if (target === `${location.pathname}${location.search}`) return;
    navigate(target, { replace: true });
  }, [isAuthenticated, location.pathname, location.search, navigate]);

  const isPaidActive = resolveWebPaidActive(billing?.snapshot);
  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: billing?.snapshot.entitlement.status ?? null,
      }),
    [isAuthenticated, isPaidActive, billing?.snapshot.entitlement.status]
  );

  const activeRoute = routeFromPathname(location.pathname);

  /** Phone is a full-bleed stack. Desktop library and groups stay flush; home and settings keep the page inset. */
  const workspaceFlush = phoneLayout || activeRoute === 'library' || activeRoute === 'groups';

  const displayName = isAuthenticated
    ? user?.displayName || user?.email || 'Signed in'
    : 'Guest';
  const avatarText = isAuthenticated ? initialsFromEmail(user?.email) : 'G';

  const shellClass = ['app', sidebarCollapsed ? 'sidebar-collapsed' : '']
    .filter(Boolean)
    .join(' ');

  const workspaceClass = ['workspace', workspaceFlush ? 'is-flush' : '']
    .filter(Boolean)
    .join(' ');

  const navClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'nav-item active' : 'nav-item';

  const tabClass = ({ isActive }: { isActive: boolean }) =>
    isActive ? 'active' : undefined;

  return (
    <>
      <div className={shellClass} data-od-id="app-shell">
        <aside className="sidebar" data-od-id="sidebar" aria-label="Primary">
          <div className="sb-top">
            <div className="logo" data-od-id="brand">
              <div
                className="welcome__logo-mark"
                aria-hidden="true"
                style={{
                  width: 32,
                  height: 32,
                  position: 'relative',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '22%',
                  overflow: 'hidden',
                  backgroundColor: 'var(--ink)',
                  boxShadow: '0 0 0 1px color-mix(in srgb, var(--ink) 12%, transparent)',
                  flexShrink: 0,
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    bottom: 0,
                    left: '10%',
                    right: '10%',
                    height: '28%',
                    borderRadius: 9999,
                    backgroundColor: 'color-mix(in srgb, var(--paper) 8%, transparent)',
                    pointerEvents: 'none',
                    zIndex: 1,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    bottom: '22%',
                    left: '18%',
                    right: '18%',
                    height: '13%',
                    borderRadius: 9999,
                    backgroundColor: 'var(--paper)',
                    zIndex: 2,
                  }}
                />
              </div>
              <div className="logo-text">underscore</div>
            </div>
            <button
              type="button"
              className="sb-collapse"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                aria-hidden="true"
              >
                <path
                  d="M10 3L5 8l5 5"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>

          <nav className="sb-nav" data-od-id="primary-nav">
            <div className="nav-label">Workspace</div>
            {NAV_ITEMS.filter((n) => n.route !== 'settings').map((item) => (
              <NavLink
                key={item.route}
                to={ROUTE_META[item.route].path}
                className={navClass}
                data-od-id={item.odId}
                title={sidebarCollapsed ? ROUTE_META[item.route].label : undefined}
              >
                <span className="nav-ico" aria-hidden="true">
                  {item.icon}
                </span>
                <span className="label">{ROUTE_META[item.route].label}</span>
              </NavLink>
            ))}
            <div className="nav-label">Account</div>
            <NavLink
              to={ROUTE_META.settings.path}
              className={navClass}
              data-od-id="nav-settings"
              title={sidebarCollapsed ? 'Settings' : undefined}
            >
              <span className="nav-ico" aria-hidden="true">
                <IconSettings />
              </span>
              <span className="label">Settings</span>
            </NavLink>
          </nav>

          <div className="sb-foot">
            {extNoticeRemnant}
            <button
              type="button"
              className="sb-theme-toggle"
              data-od-id="theme-toggle"
              aria-label={isDark ? 'Switch to light theme' : 'Switch to dark theme'}
              title={sidebarCollapsed ? (isDark ? 'Switch to light theme' : 'Switch to dark theme') : undefined}
              onClick={handleToggleTheme}
            >
              <span className="nav-ico" aria-hidden="true">
                {isDark ? (
                  <Sun size={18} strokeWidth={1.75} aria-hidden="true" />
                ) : (
                  <Moon size={18} strokeWidth={1.75} aria-hidden="true" />
                )}
              </span>
              <span className="label">{isDark ? 'Light theme' : 'Dark theme'}</span>
            </button>
            <button
              type="button"
              className="sb-user"
              data-od-id="sidebar-user"
              title={sidebarCollapsed ? displayName : undefined}
              onClick={() => {
                void navigate('/settings');
              }}
            >
              <div className="avatar" aria-hidden="true">
                {avatarText}
              </div>
              <div className="sb-user-meta">
                <div className="sb-user-name">{displayName}</div>
                <div className="sb-user-plan">
                  <span className="plan-dot" aria-hidden="true" />
                  <span>{caps.planLabel}</span>
                </div>
              </div>
            </button>
          </div>
        </aside>

        <div className="main">
          {!phoneLayout && extNoticeStrip}
          <main className={workspaceClass} data-od-id="workspace">
            <div className="workspace-inner">
              <Outlet />
            </div>
          </main>

          <nav className="tabbar" data-od-id="mobile-tabbar" aria-label="Mobile">
            {NAV_ITEMS.map((item) => (
              <NavLink
                key={item.route}
                to={ROUTE_META[item.route].path}
                className={tabClass}
              >
                {item.icon}
                {ROUTE_META[item.route].label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <Toaster
        position="bottom-center"
        theme="light"
        richColors
        closeButton
        toastOptions={{
          style: {
            fontFamily: 'var(--sans)',
            background: 'var(--paper)',
            color: 'var(--ink)',
            border: '1px solid var(--rule-soft)',
          },
        }}
      />
    </>
  );
}
