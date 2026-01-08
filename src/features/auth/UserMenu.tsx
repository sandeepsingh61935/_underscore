import React, { useState, useRef, useEffect } from 'react';
import { Settings, LogOut, ChevronDown } from 'lucide-react';
import { cn } from '../../ui-system/utils/cn';
import { Text } from '../../ui-system/components/primitives/Text';
import { User } from './hooks/useCurrentUser';

interface UserMenuProps {
    user: User;
    onLogout: () => void;
}

export function UserMenu({ user, onLogout }: UserMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
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
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 p-1.5 rounded-full hover:bg-bg-alt-light dark:hover:bg-bg-alt-dark transition-colors"
            >
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                    {user.avatarUrl ? (
                        <img src={user.avatarUrl} alt={user.name} className="w-full h-full rounded-full" />
                    ) : (
                        <span className="font-medium text-sm">{user.name?.[0] || 'U'}</span>
                    )}
                </div>
                <ChevronDown size={14} className={cn("text-text-secondary-light transition-transform", isOpen && "rotate-180")} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 rounded-lg border border-border-light dark:border-border-dark bg-bg-surface-light dark:bg-bg-surface-dark shadow-card-light dark:shadow-card-dark p-2 animate-in fade-in slide-in-from-top-2 z-50">
                    <div className="px-3 py-2 border-b border-border-light dark:border-border-dark mb-2">
                        <Text variant="small" className="font-medium truncate">{user.name}</Text>
                        <Text variant="tiny" muted className="truncate">{user.email}</Text>
                    </div>

                    <button className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-bg-alt-light dark:hover:bg-bg-alt-dark text-left">
                        <Settings size={16} />
                        Settings
                    </button>

                    <button
                        onClick={onLogout}
                        className="flex items-center gap-2 w-full px-3 py-2 rounded-md text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/10 text-left"
                    >
                        <LogOut size={16} />
                        Sign Out
                    </button>
                </div>
            )}
        </div>
    );
}
