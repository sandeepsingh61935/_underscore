import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Settings, LogOut, CheckSquare, Moon, Sun, Monitor, Palette } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from '@/components/ui/dropdown-menu';

interface HeaderProps {
  showUserMenu?: boolean;
  onSignInClick?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ showUserMenu = true, onSignInClick }) => {
  const { isAuthenticated, user, logout, theme, setTheme } = useApp();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);

  const themes: Array<{ id: 'light' | 'dark' | 'sepia'; label: string; icon: React.ReactNode }> = [
    { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
    { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
    { id: 'sepia', label: 'Sepia', icon: <Monitor className="w-4 h-4" /> },
  ];

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <header className="w-full border-b border-border/60 bg-card sticky top-0 z-50">
      <div className="max-w-5xl mx-auto px-6 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity cursor-pointer group">
          <CheckSquare className="w-6 h-6 text-primary group-hover:rotate-12 transition-transform duration-300" />
          <h2 className="text-lg font-medium tracking-tight text-foreground group-hover:text-primary transition-colors">
            _underscore
          </h2>
        </Link>

        {/* Right Section */}
        <div className="flex items-center gap-6">
          {/* Navigation Link */}
          {isAuthenticated && (
            <button
              onClick={() => navigate('/collections')}
              className="hidden sm:flex text-sm font-medium text-muted-foreground hover:text-primary transition-colors"
            >
              Dashboard
            </button>
          )}

          {/* Divider */}
          {isAuthenticated && (
            <div className="h-4 w-px bg-border hidden sm:block"></div>
          )}

          {isAuthenticated && user ? (
            showUserMenu && (
              <DropdownMenu open={showSettings} onOpenChange={setShowSettings}>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-3 cursor-pointer outline-none focus:ring-2 ring-primary/20 rounded-full p-0.5 hover:opacity-80 transition-opacity">
                    <div className="text-right hidden md:block">
                      <span className="block text-xs font-medium text-foreground">
                        {user.displayName}
                      </span>
                    </div>
                    <div className="h-9 w-9 rounded-full bg-cover bg-center border border-border ring-1 ring-border/50 overflow-hidden">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.displayName} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                          {user.displayName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-64">
                  {/* User Identity */}
                  <div className="px-4 py-3">
                    <p className="text-xs uppercase tracking-widest text-muted-foreground font-medium truncate">
                      {user.email}
                    </p>
                  </div>

                  <DropdownMenuSeparator />

                  {/* Settings Submenu */}
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                      <Settings className="w-4 h-4" />
                      <span>Settings</span>
                    </DropdownMenuSubTrigger>
                    <DropdownMenuSubContent className="w-56">
                      {/* Theme Setting */}
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
                              className={`flex items-center gap-2 cursor-pointer ${
                                theme === t.id ? 'text-primary' : ''
                              }`}
                            >
                              {t.icon}
                              <span>{t.label}</span>
                              {theme === t.id && <span className="ml-auto text-primary">✓</span>}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>

                      {/* Brand Color (Future Enhancement) */}
                      <DropdownMenuItem className="flex items-center gap-2 cursor-pointer opacity-50 pointer-events-none">
                        <Palette className="w-4 h-4" />
                        <span>Brand Color</span>
                        <span className="ml-auto text-xs text-muted-foreground">Coming soon</span>
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuSub>

                  {/* Privacy */}
                  <DropdownMenuItem asChild>
                    <Link to="/privacy" className="flex items-center gap-2 cursor-pointer">
                      <span className="w-4 h-4">🔒</span>
                      <span>Privacy</span>
                    </Link>
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Sign Out */}
                  <DropdownMenuItem
                    onClick={handleLogout}
                    className="text-destructive cursor-pointer focus:text-destructive"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )
          ) : null}
        </div>
      </div>
    </header>
  );
};

export default Header;
