import { Settings, LogOut, Moon, Sun, Monitor, Palette, Check, Lock } from 'lucide-react';
import React from 'react';
import { Link } from 'react-router-dom';

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

export interface UserMenuUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export type ThemeOption = 'light' | 'dark' | 'sepia';

export interface UserMenuProps {
  user: UserMenuUser;
  currentTheme?: ThemeOption;
  onThemeChange?: (theme: ThemeOption) => void;
  onLogout: () => void;
  onSettings?: () => void;
  /** Controls open state externally */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Align dropdown to start or end */
  align?: 'start' | 'center' | 'end';
  className?: string;
}

const themes: Array<{ id: ThemeOption; label: string; icon: React.ReactNode }> = [
  { id: 'light', label: 'Light', icon: <Sun className="w-4 h-4" /> },
  { id: 'dark', label: 'Dark', icon: <Moon className="w-4 h-4" /> },
  { id: 'sepia', label: 'Sepia', icon: <Monitor className="w-4 h-4" /> },
];

export function UserMenu({
  user,
  currentTheme = 'light',
  onThemeChange,
  onLogout,
  onSettings: _onSettings,
  open,
  onOpenChange,
  align = 'end',
  className,
}: UserMenuProps): React.ReactElement {
  return (
    <DropdownMenu open={open} onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Open account menu for ${user.displayName}`}
          className={`flex min-h-[44px] min-w-[44px] items-center gap-3 cursor-pointer rounded-full p-1.5 transition-opacity hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--accent)] focus-visible:ring-offset-2 ${className || ''}`}
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

      <DropdownMenuContent align={align} className="w-64">
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
            {onThemeChange && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="flex items-center gap-2 cursor-pointer">
                  <Sun className="w-4 h-4" />
                  <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  {themes.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                      className="flex items-center gap-2 cursor-pointer"
                    >
                      {t.icon}
                      <span>{t.label}</span>
                      {currentTheme === t.id && (
                        <Check
                          className="ml-auto w-4 h-4"
                          style={{ color: 'var(--accent)' }}
                        />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

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
          <Link to="/privacy" className="flex items-center gap-2 cursor-pointer">
            <Lock className="w-4 h-4" />
            <span>Privacy</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={onLogout}
          className="cursor-pointer"
          style={{ color: 'var(--ink)' }}
        >
          <LogOut className="w-4 h-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
