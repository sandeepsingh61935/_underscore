import React, { type ReactNode } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

import type { PopupChrome } from '../../../entrypoints/popup/chrome';
import { modeRegistry } from '../../../features/modes/registry';

import { ModeHeader } from './ModeHeader';
import { TabBar } from './TabBar';

const screenVariants = {
  initial: { opacity: 0, y: 10, scale: 0.984 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 1.012 },
} as const;

export interface PopupShellProps {
  chrome: PopupChrome;
  /** Current view key, used as the AnimatePresence motion key */
  viewKey: string;
  children: ReactNode;
  dark?: boolean;
}

function PopupTitleStrip({ title, modeId }: { title: string; modeId?: string }): React.ReactElement {
  const m = modeId ? modeRegistry.get(modeId) : null;
  return (
    <div
      style={{
        background: 'var(--paper-2)',
        borderLeft: '1px solid var(--rule)',
        borderRight: '1px solid var(--rule)',
        borderTop: '1px solid var(--rule)',
        padding: '8px 14px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}
    >
      <span>{title}</span>
      {m && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <span
            style={{
              width: 6,
              height: 6,
              borderRadius: 99,
              background: m.accent,
              display: 'inline-block',
            }}
          />
          {m.name}
        </span>
      )}
    </div>
  );
}

export function PopupShell({ chrome, viewKey, children, dark = false }: PopupShellProps): React.ReactElement {
  return (
    <div
      className={`ue ${dark ? 'dark' : ''}`}
      style={{
        width: '100%',
        height: '100%',
        background: 'var(--paper)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {chrome.showTitleStrip && <PopupTitleStrip title={chrome.title} modeId={chrome.modeId} />}
      <div
        className="popup"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          borderTop: chrome.showTitleStrip ? 'none' : '1px solid var(--rule)',
        }}
      >
        {chrome.showModeHeader && (
          <ModeHeader
            modeId={chrome.modeId ?? 'local'}
            onBack={chrome.onBack}
            backLabel={chrome.backLabel}
            onSwitch={chrome.onSwitch}
          />
        )}
        <div
          className="body-slot"
          style={{ flex: 1, position: 'relative', minHeight: 0, overflow: 'hidden' }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              variants={screenVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{ type: 'spring', stiffness: 120, damping: 20, mass: 1.0 }}
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </div>
        {chrome.showTabBar && chrome.activeTab && chrome.onTabChange && (
          <TabBar active={chrome.activeTab} onChange={chrome.onTabChange} />
        )}
      </div>
    </div>
  );
}
