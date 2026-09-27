import { Settings, LogOut, Moon, Sun, Palette, Check, Lock } from 'lucide-react';
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
import { cn } from '@/ui-system/utils/cn';

export interface UserMenuUser {
  id: string;
  email: string;
  displayName: string;
  photoUrl?: string;
}

export type ThemeOption = 'light' | 'dark';

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
  { id: 'light', label: 'Light', icon: <Sun aria-hidden="true" /> },
  { id: 'dark', label: 'Dark', icon: <Moon aria-hidden="true" /> },
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
          className={cn('account-btn', className)}
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

      <DropdownMenuContent align={align} className="menu-content-wide">
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
            {onThemeChange && (
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Sun aria-hidden="true" />
                  <span>Theme</span>
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="menu-sub-content-wide">
                  {themes.map((t) => (
                    <DropdownMenuItem
                      key={t.id}
                      onClick={() => onThemeChange(t.id)}
                    >
                      {t.icon}
                      <span>{t.label}</span>
                      {currentTheme === t.id && (
                        <Check className="check-inline" aria-hidden="true" />
                      )}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            )}

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

        <DropdownMenuItem onClick={onLogout}>
          <LogOut aria-hidden="true" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
