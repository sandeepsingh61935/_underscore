/**
 * @deprecated Use AppHeader from './AppHeader' instead. This header remains
 * only for legacy web SPA consumers; new code should use AppHeader.
 */
import {
  Settings,
  LogOut,
  CheckSquare,
  Moon,
  Sun,
  Palette,
  Check,
  Lock,
} from 'lucide-react';
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/ui-system/components/primitives/DropdownMenu';

interface HeaderProps {
  showUserMenu?: boolean;
  onSignInClick?: () => void;
  /** Custom logout handler for popup context */
  onLogout?: () => void;
  /** User data - if provided, uses this instead of useApp() */
  user?: {
    id: string;
    email: string;
    displayName: string;
    photoUrl?: string;
  } | null;
  /** Auth state - if provided, uses this instead of useApp() */
  isAuthenticated?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  showUserMenu = true,
  onSignInClick: _onSignInClick,
  onLogout,
  user: propUser,
  isAuthenticated: propIsAuthenticated,
}) => {
  const appContext = useApp();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const isAuthenticated = propIsAuthenticated ?? appContext.isAuthenticated;
  const user = propUser ?? appContext.user;
  const { logout, theme, setTheme } = appContext;

  const themes: Array<{
    id: 'light' | 'dark';
    label: string;
    icon: React.ReactNode;
  }> = [
    { id: 'light', label: 'Light', icon: <Sun aria-hidden="true" /> },
    { id: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" /> },
  ];

  const handleLogout = (): void => {
    if (onLogout) {
      onLogout();
    } else {
      logout();
      navigate('/');
    }
  };

  return (
    <header className="web-header">
      <div className="web-header-inner">
        <Link to="/" className="brand-link">
          <CheckSquare aria-hidden="true" />
          <h2 className="brand-name">_underscore</h2>
        </Link>

        <div className="web-nav">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="nav-link"
            >
              Dashboard
            </button>
          )}

          {isAuthenticated && <div className="nav-divider"></div>}

          {isAuthenticated && user
            ? showUserMenu && (
                <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Open account menu for ${user.displayName}`}
                      className="account-btn"
                    >
                      <div className="account-meta">
                        <span className="account-name">{user.displayName}</span>
                      </div>
                      <div className="avatar">
                        {user.photoUrl ? (
                          <img src={user.photoUrl} alt={user.displayName} />
                        ) : (
                          <div className="avatar-fallback">
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="menu-content-wide">
                    <div className="menu-head">
                      <p className="menu-email">{user.email}</p>
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger>
                        <Settings aria-hidden="true" />
                        <span>Settings</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="menu-sub-content-wide">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger>
                            <Sun aria-hidden="true" />
                            <span>Theme</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent className="menu-sub-content-wide">
                            {themes.map((t) => (
                              <DropdownMenuItem
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                              >
                                {t.icon}
                                <span>{t.label}</span>
                                {theme === t.id && (
                                  <Check
                                    className="check-inline"
                                    aria-hidden="true"
                                  />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem disabled>
                          <Palette aria-hidden="true" />
                          <span>Brand Color</span>
                          <span className="menu-note">Coming soon</span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem asChild>
                      <Link to="/privacy">
                        <Lock aria-hidden="true" />
                        <span>Privacy</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem onClick={handleLogout}>
                      <LogOut aria-hidden="true" />
                      <span>Sign out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )
            : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
