import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Link,
  NavLink,
  Outlet,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import { PlanPill } from '@/web/components/PlanPill';
import { applyWebPrefs, readWebPrefs } from '@/web/lib/webPrefs';

type ProductRoute = 'home' | 'library' | 'settings';

const ROUTE_META: Record<
  ProductRoute,
  { label: string; hint: string; path: string }
> = {
  home: {
    label: 'Home',
    hint: 'Current page · Active pages · Recent',
    path: '/home',
  },
  library: {
    label: 'Library',
    hint: 'Search & filter highlights',
    path: '/library',
  },
  settings: {
    label: 'Settings',
    hint: 'Account · plan · type · data · Integrations',
    path: '/settings',
  },
};

function routeFromPathname(pathname: string): ProductRoute {
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
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5z" />
  </svg>
);

const IconLibrary = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <path d="M4 5h7v14H4zM13 5h7v14h-7z" />
  </svg>
);

const IconSettings = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden="true">
    <circle cx="12" cy="12" r="3" />
    <path d="M12 3v2M12 19v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M3 12h2M19 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
  </svg>
);

const NAV_ITEMS: Array<{
  route: ProductRoute;
  odId: string;
  icon: React.ReactNode;
}> = [
  { route: 'home', odId: 'nav-home', icon: <IconHome /> },
  { route: 'library', odId: 'nav-library', icon: <IconLibrary /> },
  { route: 'settings', odId: 'nav-settings', icon: <IconSettings /> },
];

/**
 * Product chrome shell: sidebar (248→72), topbar, mobile tabbar, guest-aware foot.
 * Outlet renders product pages. Public auth routes stay outside this layout.
 */
export function WebAppShell(): React.ReactElement {
  const { isAuthenticated, user } = useApp();
  const billing = useBillingContextOptional();
  const location = useLocation();
  const navigate = useNavigate();

  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Density (and future prefs) on shell mount — not only when Appearance tab opens.
  useEffect(() => {
    applyWebPrefs(readWebPrefs());
  }, []);

  const isPaidActive = resolveWebPaidActive(billing?.snapshot);
  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: billing?.snapshot.entitlement.status ?? null,
      }),
    [isAuthenticated, isPaidActive, billing?.snapshot.entitlement.status],
  );

  const activeRoute = routeFromPathname(location.pathname);
  const meta = ROUTE_META[activeRoute];

  /** OD: library always flush. */
  const workspaceFlush = activeRoute === 'library';

  const displayName = isAuthenticated
    ? user?.displayName || user?.email || 'Signed in'
    : 'Guest';
  const avatarText = isAuthenticated
    ? initialsFromEmail(user?.email)
    : 'G';

  const closeMobileSidebar = useCallback(() => setSidebarOpen(false), []);

  const primaryCta = useMemo(() => {
    if (caps.isGuest) {
      return { label: 'Sign in', to: '/sign-in' as const };
    }
    if (caps.isPaidActive) {
      return null;
    }
    // Free window: no aggressive Upgrade CTA for unpaid signed-in users.
    if (caps.freeWindow && !caps.isPastDue) {
      return null;
    }
    return { label: 'Upgrade', to: '/settings?tab=plan' as const };
  }, [caps.isGuest, caps.isPaidActive, caps.freeWindow, caps.isPastDue]);

  const shellClass = [
    'app',
    sidebarCollapsed ? 'sidebar-collapsed' : '',
  ]
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
        <aside
          className={sidebarOpen ? 'sidebar open' : 'sidebar'}
          data-od-id="sidebar"
          aria-label="Primary"
        >
          <div className="sb-top">
            <div className="logo" data-od-id="brand">
              <div className="logo-mark" aria-hidden="true">
                _
              </div>
              <div>
                <div className="logo-text">underscore</div>
                <div className="logo-sub">Read · save · ask</div>
              </div>
            </div>
            <button
              type="button"
              className="sb-collapse"
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand' : 'Collapse'}
              onClick={() => setSidebarCollapsed((c) => !c)}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
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
                onClick={closeMobileSidebar}
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
              onClick={closeMobileSidebar}
            >
              <span className="nav-ico" aria-hidden="true">
                <IconSettings />
              </span>
              <span className="label">Settings</span>
            </NavLink>
          </nav>

          <div className="sb-foot">
            <button
              type="button"
              className="sb-user"
              data-od-id="sidebar-user"
              onClick={() => {
                closeMobileSidebar();
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
          <header className="topbar" data-od-id="topbar">
            <button
              type="button"
              className="mobile-menu"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
                <path
                  d="M3 5h12M3 9h12M3 13h12"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                />
              </svg>
            </button>
            <div className="topbar-context" data-od-id="topbar-context">
              <span className="topbar-route">{meta.label}</span>
              <span className="topbar-hint">{meta.hint}</span>
            </div>
            <div className="top-actions">
              <PlanPill label={caps.planLabel} />
              {primaryCta ? (
                <Link
                  to={primaryCta.to}
                  className="btn sm primary"
                  data-od-id="top-cta"
                >
                  {primaryCta.label}
                </Link>
              ) : (
                <span data-od-id="top-cta" hidden />
              )}
            </div>
          </header>

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
                onClick={closeMobileSidebar}
              >
                {item.icon}
                {ROUTE_META[item.route].label}
              </NavLink>
            ))}
          </nav>
        </div>
      </div>

      <div
        className={sidebarOpen ? 'overlay-side open' : 'overlay-side'}
        role="presentation"
        onClick={closeMobileSidebar}
        onKeyDown={(e) => {
          if (e.key === 'Escape') closeMobileSidebar();
        }}
      />
    </>
  );
}
