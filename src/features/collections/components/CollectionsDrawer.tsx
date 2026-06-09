import React from 'react';
import { Drawer } from 'vaul';

interface CollectionsDrawerProps {
  trigger: React.ReactNode;
  children: React.ReactNode;
  title?: string;
}

/**
 * Pull-up drawer for quick collection preview in popup context.
 * Web app uses standard navigation — this component is popup-only.
 */
export function CollectionsDrawer({
  trigger,
  children,
  title = 'Collections',
}: CollectionsDrawerProps): React.JSX.Element {
  return (
    <Drawer.Root shouldScaleBackground>
      <Drawer.Trigger asChild>
        {trigger}
      </Drawer.Trigger>
      <Drawer.Portal>
        <Drawer.Overlay style={{ position: 'fixed', inset: 0, background: 'var(--utility-overlay-40)', zIndex: 40 }} />
        <Drawer.Content
          style={{
            position: 'fixed',
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 50,
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '85vh',
            background: 'var(--paper)',
            borderRadius: 'var(--radius) var(--radius) 0 0',
            border: '1px solid var(--rule)',
            borderBottom: 'none',
          }}
        >
          {/* Drag handle */}
          <div style={{
            margin: '12px auto 4px',
            height: 4,
            width: 40,
            borderRadius: 9999,
            background: 'var(--rule)',
            flexShrink: 0,
          }} />

          {/* Drawer title */}
          <Drawer.Title
            className="u-kicker"
            style={{ padding: '12px 16px 12px', flexShrink: 0, color: 'var(--ink-3)' }}
          >
            {title}
          </Drawer.Title>

          {/* Scrollable content */}
          <div style={{ overflowY: 'auto', flex: 1, padding: '0 16px 24px' }}>
            {children}
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}
