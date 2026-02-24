import React from 'react';

/**
 * 404 Not Found Page
 * Displayed when user navigates to an unknown route
 */
export function NotFoundPage() {
    return (
        <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
            <div className="text-center">
                <h1 className="text-6xl font-bold mb-4">404</h1>
                <p className="text-xl text-muted-foreground">Page not found</p>
            </div>
        </div>
    );
}
