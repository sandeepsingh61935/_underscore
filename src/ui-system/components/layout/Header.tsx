/**
 * @deprecated Use AppHeader from './AppHeader' instead. This header remains
 * only for legacy web SPA consumers; new code should use AppHeader.
 */
import { Settings, LogOut, CheckSquare, Moon, Sun, Palette, Check, Lock } from 'lucide-react';
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
    { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
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
    <header
      className="w-full sticky top-0 z-50"
      style={{
        backgroundColor: 'var(--paper)',
        borderBottom: '1px solid var(--rule-soft)',
      }}
    >
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link
          to="/"
          className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group"
        >
          <CheckSquare
            className="w-6 h-6 transition-transform duration-step-0 ease-standard"
            style={{ color: 'var(--ink-2)' }}
          />
          <h2
            className="tracking-tight"
            style={{ fontSize: 'var(--step-1)', color: 'var(--ink)' }}
          >
            _underscore
          </h2>
        </Link>

        <div className="flex items-center gap-6">
          {isAuthenticated && (
            <button
              type="button"
              onClick={() => navigate('/library')}
              className="hidden sm:inline-flex min-h-[44px] items-center rounded px-3 transition-colors duration-step-0 ease-standard hover:text-[color:var(--accent)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
              style={{ fontSize: 'var(--step-0)', color: 'var(--ink-3)' }}
            >
              Dashboard
            </button>
          )}

          {isAuthenticated && (
            <div
              className="h-4 w-px hidden sm:block"
              style={{ backgroundColor: 'var(--rule-soft)' }}
            ></div>
          )}

          {isAuthenticated && user
            ? showUserMenu && (
                <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      aria-label={`Open account menu for ${user.displayName}`}
                      className="flex min-h-[44px] min-w-[44px] items-center gap-3 cursor-pointer rounded-full p-1.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2"
                    >
                      <div className="text-right hidden md:block">
                        <span
                          className="block"
                          style={{ fontSize: 'var(--step--1)', color: 'var(--ink)' }}
                        >
                          {user.displayName}
                        </span>
                      </div>
                      <div
                        className="h-9 w-9 rounded-full bg-cover bg-center border overflow-hidden"
                        style={{ borderColor: 'var(--rule-soft)' }}
                      >
                        {user.photoUrl ? (
                          <img
                            src={user.photoUrl}
                            alt={user.displayName}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div
                            className="w-full h-full flex items-center justify-center"
                            style={{
                              backgroundColor: 'var(--accent)',
                              color: 'var(--accent-ink)',
                              fontSize: 'var(--step-0)',
                            }}
                          >
                            {user.displayName.charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <div className="px-4 py-3">
                      <p
                        className="uppercase truncate"
                        style={{
                          fontSize: 'var(--step--1)',
                          color: 'var(--ink-3)',
                          letterSpacing: '0.15em',
                        }}
                      >
                        {user.email}
                      </p>
                    </div>

                    <DropdownMenuSeparator />

                    <DropdownMenuSub>
                      <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                        <Settings className="w-4 h-4" />
                        <span>Settings</span>
                      </DropdownMenuSubTrigger>
                      <DropdownMenuSubContent className="w-56">
                        <DropdownMenuSub>
                          <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                            <Sun className="w-4 h-4" />
                            <span>Theme</span>
                          </DropdownMenuSubTrigger>
                          <DropdownMenuSubContent>
                            {themes.map((t) => (
                              <DropdownMenuItem
                                key={t.id}
                                onClick={() => setTheme(t.id)}
                                className="flex items-center gap-2 cursor-pointer"
                              >
                                {t.icon}
                                <span>{t.label}</span>
                                {theme === t.id && (
                                  <Check
                                    className="ml-auto w-4 h-4"
                                    style={{ color: 'var(--accent)' }}
                                  />
                                )}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuSubContent>
                        </DropdownMenuSub>

                        <DropdownMenuItem className="flex items-center gap-2 cursor-pointer opacity-50 pointer-events-none">
                          <Palette className="w-4 h-4" />
                          <span>Brand Color</span>
                          <span
                            className="ml-auto"
                            style={{ fontSize: 'var(--step--1)', color: 'var(--ink-3)' }}
                          >
                            Coming soon
                          </span>
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuSub>

                    <DropdownMenuItem asChild>
                      <Link
                        to="/privacy"
                        className="flex items-center gap-2 cursor-pointer"
                      >
                        <Lock className="w-4 h-4" />
                        <span>Privacy</span>
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuSeparator />

                    <DropdownMenuItem
                      onClick={handleLogout}
                      className="cursor-pointer"
                      style={{ color: 'var(--ink)' }}
                    >
                      <LogOut className="w-4 h-4" />
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
