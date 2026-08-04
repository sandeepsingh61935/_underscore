import { AnimatePresence, motion } from 'framer-motion';
import React, { type ReactNode } from 'react';

import type { PopupChrome } from '../../../entrypoints/popup/chrome';

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

function PopupTitleStrip({
  place,
  brand,
  accountPill,
  onAccountPillClick,
}: {
  place: string;
  brand: string;
  accountPill?: string | null;
  onAccountPillClick?: () => void;
}): React.ReactElement {
  return (
    <div
      style={{
        background: 'var(--paper-2)',
        borderLeft: '1px solid var(--rule)',
        borderRight: '1px solid var(--rule)',
        borderTop: '1px solid var(--rule)',
        padding: '8px 14px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        fontFamily: 'var(--mono)',
        fontSize: 10,
        letterSpacing: '0.14em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}
    >
      <span style={{ justifySelf: 'start' }}>{place}</span>
      <span style={{ justifySelf: 'center', color: 'var(--ink)' }}>{brand}</span>
      <span style={{ justifySelf: 'end' }}>
        {accountPill ? (
          <button
            type="button"
            onClick={onAccountPillClick}
            aria-label={accountPill}
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontFamily: 'var(--mono)',
              fontSize: 10,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-2)',
            }}
          >
            {accountPill}
          </button>
        ) : null}
      </span>
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
      {chrome.showTitleStrip && (
        <PopupTitleStrip
          place={chrome.place}
          brand={chrome.brand}
          accountPill={chrome.accountPill}
          onAccountPillClick={chrome.onAccountPillClick}
        />
      )}
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
            modeId={chrome.modeId ?? 'basic'}
            onBack={chrome.onBack}
            backLabel={chrome.backLabel}
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
              style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', pointerEvents: 'auto' }}
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
