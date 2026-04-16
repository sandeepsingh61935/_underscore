import { Settings, LogOut, ChevronDown } from 'lucide-react';
import React, { useState, useRef, useEffect } from 'react';

import { Text } from '../../ui-system/components/primitives/Text';
import { cn } from '../../ui-system/utils/cn';

import type { User } from './hooks/useCurrentUser';

interface UserMenuProps {
  user: User;
  onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps): React.ReactElement {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent): void => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-label={`Open user menu for ${user.name}`}
        className="flex min-h-[48px] items-center gap-2 rounded-full px-2 py-1.5 transition-colors duration-short ease-standard hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
      >
        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.name}
              className="w-full h-full rounded-full"
            />
          ) : (
            <span className="text-title-small">{user.name?.[0] || 'U'}</span>
          )}
        </div>
        <ChevronDown
          size={14}
          className={cn(
            'text-on-surface-variant transition-transform',
            isOpen && 'rotate-180'
          )}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-56 rounded-md border border-outline bg-surface-container shadow-elevation-2 p-2 animate-in fade-in slide-in-from-top-2 z-50">
          <div className="px-3 py-2 border-b border-outline mb-2">
            <Text variant="small" className="font-medium truncate">
              {user.name}
            </Text>
            <Text variant="tiny" muted className="truncate">
              {user.email}
            </Text>
          </div>

          <button
            type="button"
            className="flex min-h-[48px] w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-label-medium text-on-surface transition-colors duration-short ease-standard hover:bg-surface-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <Settings size={16} />
            Settings
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="flex min-h-[48px] w-full items-center gap-2 rounded-sm px-3 py-2 text-left text-label-medium text-error transition-colors duration-short ease-standard hover:bg-error-container focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
          >
            <LogOut size={16} />
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
