import React from 'react';

interface AppShellProps {
    children: React.ReactNode;
    className?: string;
}

export function AppShell({ children, className }: AppShellProps) {
    // Simple wrapper - let views control their own layout
    return <>{children}</>;
}
