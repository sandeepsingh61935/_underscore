import React from 'react';
import { Link } from 'react-router-dom';
import { Settings, LogOut, Moon, Sun, Monitor, Palette } from 'lucide-react';
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
    onSettings,
    open,
    onOpenChange,
    align = 'end',
    className,
}: UserMenuProps) {
    return (
        <DropdownMenu open={open} onOpenChange={onOpenChange}>
            <DropdownMenuTrigger asChild>
                <button
                    className={`flex items-center gap-3 cursor-pointer outline-none focus:ring-2 ring-primary/20 rounded-full p-0.5 hover:opacity-80 transition-opacity ${className || ''}`}
                >
                    {/* Display name (hidden on small screens) */}
                    <div className="text-right hidden md:block">
                        <span className="block text-xs font-medium text-foreground">
                            {user.displayName}
                        </span>
                    </div>

                    {/* Avatar */}
                    <div className="h-9 w-9 rounded-full bg-cover bg-center border border-border ring-1 ring-border/50 overflow-hidden">
                        {user.photoUrl ? (
                            <img
                                src={user.photoUrl}
                                alt={user.displayName}
                                className="w-full h-full object-cover"
                            />
                        ) : (
                            <div className="w-full h-full bg-primary flex items-center justify-center text-primary-foreground font-semibold text-sm">
                                {user.displayName.charAt(0).toUpperCase()}
                            </div>
                        )}
                    </div>
                </button>
            </DropdownMenuTrigger>

            <DropdownMenuContent align={align} className="w-64">
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
                                            className={`flex items-center gap-2 cursor-pointer ${currentTheme === t.id ? 'text-primary' : ''
                                                }`}
                                        >
                                            {t.icon}
                                            <span>{t.label}</span>
                                            {currentTheme === t.id && (
                                                <span className="ml-auto text-primary">✓</span>
                                            )}
                                        </DropdownMenuItem>
                                    ))}
                                </DropdownMenuSubContent>
                            </DropdownMenuSub>
                        )}

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
                    onClick={onLogout}
                    className="text-destructive cursor-pointer focus:text-destructive"
                >
                    <LogOut className="w-4 h-4" />
                    <span>Sign out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
