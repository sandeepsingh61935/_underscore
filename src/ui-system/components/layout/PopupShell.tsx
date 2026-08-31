import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React, { type ReactNode } from 'react';

import type { PopupChrome } from '../../../entrypoints/popup/chrome';

import { ModeHeader } from './ModeHeader';
import { TabBar } from './TabBar';

const screenVariants = {
  initial: { opacity: 0, y: 10, scale: 0.984 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -6, scale: 1.012 },
} as const;

/** Instant swap when prefers-reduced-motion is set (story 76). */
const reducedScreenVariants = {
  initial: { opacity: 1, y: 0, scale: 1 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 1, y: 0, scale: 1 },
} as const;

export interface PopupShellProps {
  chrome: PopupChrome;
  /** Current view key, used as the AnimatePresence motion key */
  viewKey: string;
  children: ReactNode;
  dark?: boolean;
}

/** Brand center + place extreme-left (grid 1fr auto 1fr keeps brand optically centered). */
function PopupTitleStrip({
  brand,
  place,
}: {
  brand: string;
  place?: string;
}): React.ReactElement {
  return (
    <div
      data-testid="popup-title-strip"
      style={{
        background: 'var(--paper-2)',
        borderLeft: '1px solid var(--rule)',
        borderTop: '1px solid var(--rule)',
        padding: '8px 14px',
        display: 'grid',
        gridTemplateColumns: '1fr auto 1fr',
        alignItems: 'center',
        gap: '8px',
        fontFamily: 'var(--mono)',
        fontSize: 'var(--step--2)',
        letterSpacing: '0.08em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
      }}
    >
      <span
        style={{
          justifySelf: 'start',
          textAlign: 'left',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
        }}
      >
        {place ? `· ${place}` : ''}
      </span>
      <span style={{ justifySelf: 'center', color: 'var(--ink)' }}>{brand}</span>
      <span aria-hidden style={{ justifySelf: 'end' }} />
    </div>
  );
}

export function PopupShell({
  chrome,
  viewKey,
  children,
  dark = false,
}: PopupShellProps): React.ReactElement {
  const reduceMotion = useReducedMotion();
  const variants = reduceMotion ? reducedScreenVariants : screenVariants;
  const transition = reduceMotion
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 120, damping: 20, mass: 1.0 };

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
        <PopupTitleStrip brand={chrome.brand} place={chrome.place} />
      )}
      <div
        className="popup"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          width: 'var(--pop-w)',
          maxWidth: 'var(--pop-w)',
          boxSizing: 'border-box',
          margin: 0,
          padding: 0,
          borderTop: chrome.showTitleStrip ? 'none' : '1px solid var(--rule)',
          overflow: 'hidden',
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
          style={{
            flex: 1,
            position: 'relative',
            minHeight: 0,
            overflow: 'hidden',
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={viewKey}
              variants={variants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={transition}
              style={{
                position: 'absolute',
                inset: 0,
                display: 'flex',
                flexDirection: 'column',
                pointerEvents: 'auto',
              }}
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
