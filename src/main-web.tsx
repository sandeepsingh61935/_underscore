import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';
import { AppRoutes } from './core/routing/AppRoutes';
import './ui-system/theme/global.css';
import './web/theme/web-app.css';
import './web/theme/public-pages.css';

/** Prevent a single route crash from blanking the entire SPA. */
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error): { error: Error } {
    return { error };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('[web] uncaught render error', error, info.componentStack);
  }

  override render(): ReactNode {
    if (this.state.error) {
      return (
        <div
          style={{
            fontFamily: 'system-ui, sans-serif',
            padding: 24,
            maxWidth: 480,
            margin: '40px auto',
            color: '#111',
          }}
        >
          <h1 style={{ fontSize: 18, marginBottom: 8 }}>Something went wrong</h1>
          <p style={{ fontSize: 14, lineHeight: 1.5, marginBottom: 16 }}>
            The app hit an unexpected error. Try reloading. If it keeps happening,
            open the browser console and share the error message.
          </p>
          <pre
            style={{
              fontSize: 12,
              background: '#f4f4f5',
              padding: 12,
              overflow: 'auto',
            }}
          >
            {this.state.error.message}
          </pre>
          <button
            type="button"
            style={{ marginTop: 16, padding: '8px 14px', cursor: 'pointer' }}
            onClick={() => window.location.reload()}
          >
            Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// Web app entry point
const root = ReactDOM.createRoot(
    document.getElementById('root') as HTMLElement
);

root.render(
    <React.StrictMode>
        <RootErrorBoundary>
          <AppRoutes />
        </RootErrorBoundary>
    </React.StrictMode>
);
