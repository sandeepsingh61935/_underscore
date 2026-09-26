import { Analytics } from '@vercel/analytics/react';
import { SpeedInsights } from '@vercel/speed-insights/react';
import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import ReactDOM from 'react-dom/client';

import { AppRoutes } from './core/routing/AppRoutes';
import { newErrorId } from './shared/utils/error-id';
import { LoggerFactory, LogLevel } from './shared/utils/logger';
import './ui-system/theme/global.css';
import './web/theme/web-app.css';
import './web/theme/public-pages.css';

// Production consoles are user-readable: warnings and errors only.
if (import.meta.env.PROD) {
  LoggerFactory.setGlobalLevel(LogLevel.WARN);
}

const webLogger = LoggerFactory.getLogger('web/root');

/** Prevent a single route crash from blanking the entire SPA. */
class RootErrorBoundary extends Component<
  { children: ReactNode },
  { error: Error | null; errorId: string | null }
> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { error: null, errorId: null };
  }

  static getDerivedStateFromError(error: Error): { error: Error; errorId: string } {
    return { error, errorId: newErrorId() };
  }

  override componentDidCatch(error: Error, info: ErrorInfo): void {
    // Full detail to the logger only — never rendered into the DOM.
    webLogger.error('Uncaught render error', error, {
      errorId: this.state.errorId,
      componentStack: info.componentStack,
    });
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
            share this reference with support.
          </p>
          <pre
            style={{
              fontSize: 12,
              background: '#f4f4f5',
              padding: 12,
              overflow: 'auto',
            }}
          >
            {this.state.errorId ?? 'err_unavailable'}
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
const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);

root.render(
  <React.StrictMode>
    <RootErrorBoundary>
      <AppRoutes />
      <Analytics />
      <SpeedInsights />
    </RootErrorBoundary>
  </React.StrictMode>
);
