import React from 'react';

interface AppShellProps {
    children: React.ReactNode;
    className?: string;
}

export function AppShell({ children }: AppShellProps) {
    // Global container establishing safe areas so UI never touches window edges
    return (
        <div className="w-full h-full flex flex-col items-center overflow-hidden relative">
            {children}
        </div>
    );
}
