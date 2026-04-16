import React from 'react';

interface AppShellProps {
    children: React.ReactNode;
    className?: string;
    /** Whether to show the header (default: true) */
    showHeader?: boolean;
    /** Whether to remove padding from content area (default: false) */
    noPadding?: boolean;
}

export function AppShell({ children }: AppShellProps): React.JSX.Element {
    // Global container establishing safe areas so UI never touches window edges
    return (
        <div className="w-full h-full flex flex-col items-center overflow-hidden relative">
            {children}
        </div>
    );
}
