/**
 * @vitest-environment jsdom
 */
import { render, act, fireEvent, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, it, expect } from 'vitest';
import { AnimatePresence, motion } from 'framer-motion';

enum View {
  LOADING = 'LOADING',
  COLLECTIONS = 'COLLECTIONS',
  DOMAIN_DETAILS = 'DOMAIN_DETAILS',
  SETTINGS = 'SETTINGS',
  DASHBOARD = 'DASHBOARD',
}

const ROOT_TAB_VIEWS: ReadonlySet<View> = new Set([
  View.DASHBOARD,
  View.COLLECTIONS,
  View.SETTINGS,
]);

const screenVariants = {
  initial: { opacity: 0, y: 10, scale: 0.984 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 1.012 },
} as const;

const MOTION_STYLE = {
  position: 'absolute' as const,
  inset: 0,
  display: 'flex',
  flexDirection: 'column' as const,
  pointerEvents: 'auto' as const,
  backgroundColor: 'var(--paper)',
};

function MockPopupHarness() {
  const [currentView, setCurrentView] = useState<View>(View.DASHBOARD);

  const handleTabChange = (tab: 'home' | 'collections' | 'settings') => {
    switch (tab) {
      case 'home':
        setCurrentView(View.DASHBOARD);
        break;
      case 'collections':
        setCurrentView(View.COLLECTIONS);
        break;
      case 'settings':
        setCurrentView(View.SETTINGS);
        break;
    }
  };

  const isRootTab = ROOT_TAB_VIEWS.has(currentView);

  let viewContent: React.ReactNode = null;
  switch (currentView) {
    case View.DASHBOARD:
      viewContent = <div data-testid="view-dashboard">DASHBOARD CONTENT</div>;
      break;
    case View.COLLECTIONS:
      viewContent = (
        <div data-testid="view-collections">
          COLLECTIONS CONTENT
          <button
            data-testid="drill-down-btn"
            onClick={() => setCurrentView(View.DOMAIN_DETAILS)}
          >
            Open Domain
          </button>
        </div>
      );
      break;
    case View.DOMAIN_DETAILS:
      viewContent = (
        <div data-testid="view-domain-details">
          DOMAIN DETAILS
          <button
            data-testid="back-to-collections-btn"
            onClick={() => setCurrentView(View.COLLECTIONS)}
          >
            Back
          </button>
        </div>
      );
      break;
    case View.SETTINGS:
      viewContent = <div data-testid="view-settings">SETTINGS CONTENT</div>;
      break;
  }

  return (
    <div>
      <nav>
        <button data-testid="tab-home" onClick={() => handleTabChange('home')}>
          Home
        </button>
        <button
          data-testid="tab-collections"
          onClick={() => handleTabChange('collections')}
        >
          Library
        </button>
        <button
          data-testid="tab-settings"
          onClick={() => handleTabChange('settings')}
        >
          Settings
        </button>
      </nav>
      <div style={{ position: 'relative', width: 400, height: 600 }}>
        {isRootTab ? (
          <div key={currentView} style={MOTION_STYLE}>
            {viewContent}
          </div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={currentView}
              variants={screenVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.0 }}
              style={MOTION_STYLE}
            >
              {viewContent}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}

describe('Tab Instant Transition', () => {
  it('swaps immediately between root tabs without keeping past page in DOM', async () => {
    const { container } = render(<MockPopupHarness />);

    expect(screen.getByTestId('view-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('view-collections')).not.toBeInTheDocument();

    // Click Library tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-collections'));
    });

    // In the very next tick, the past page (Dashboard) must be unmounted and Library must be mounted
    expect(screen.getByTestId('view-collections')).toBeInTheDocument();
    expect(screen.queryByTestId('view-dashboard')).not.toBeInTheDocument();

    // Only 1 page should exist in the DOM
    const views = container.querySelectorAll('[data-testid^="view-"]');
    expect(views.length).toBe(1);
  });

  it('swaps immediately between Library and Settings', async () => {
    render(<MockPopupHarness />);

    // Go to Library
    act(() => {
      fireEvent.click(screen.getByTestId('tab-collections'));
    });
    expect(screen.getByTestId('view-collections')).toBeInTheDocument();

    // Go to Settings
    act(() => {
      fireEvent.click(screen.getByTestId('tab-settings'));
    });
    expect(screen.getByTestId('view-settings')).toBeInTheDocument();
    expect(screen.queryByTestId('view-collections')).not.toBeInTheDocument();
  });

  it('swaps immediately when clicking a tab from a nested view', async () => {
    render(<MockPopupHarness />);

    // Go to Library
    act(() => {
      fireEvent.click(screen.getByTestId('tab-collections'));
    });
    // Drill down to Domain Details
    act(() => {
      fireEvent.click(screen.getByTestId('drill-down-btn'));
    });
    expect(screen.getByTestId('view-domain-details')).toBeInTheDocument();

    // Click Home tab
    act(() => {
      fireEvent.click(screen.getByTestId('tab-home'));
    });
    expect(screen.getByTestId('view-dashboard')).toBeInTheDocument();
    expect(screen.queryByTestId('view-domain-details')).not.toBeInTheDocument();
  });

  it('navigates back from domain details to collections cleanly', async () => {
    render(<MockPopupHarness />);

    // Go to Library
    act(() => {
      fireEvent.click(screen.getByTestId('tab-collections'));
    });
    // Drill down
    act(() => {
      fireEvent.click(screen.getByTestId('drill-down-btn'));
    });
    expect(screen.getByTestId('view-domain-details')).toBeInTheDocument();

    // Back to collections
    act(() => {
      fireEvent.click(screen.getByTestId('back-to-collections-btn'));
    });
    expect(screen.getByTestId('view-collections')).toBeInTheDocument();
  });
});
