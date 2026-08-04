/**
 * Home — Anchor + Stream (v3).
 * Layout: optional status → Current page band → Recent stream.
 * No stats hero / Resume / Needs twin rows.
 * Wireframe: ui_kits/extension/v3/screens-home.jsx
 */
import React, { useMemo, useState } from 'react';

import { useApp } from '@/core/context/PopupAppProvider';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import { getSectionKey } from '@/shared/utils/section-key';
import { FirstRunEmpty } from '@/ui-system/components/empty-states/FirstRunEmpty';
import { HighlightMarkdownBody } from '@/ui-system/components/primitives/HighlightMarkdownBody';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';
import type { HighlightPresentation } from '@/shared/utils/highlight-presentation';

/** Default collapsed Recent length (v3 mock HomeGuest). */
const RECENT_COLLAPSE_COUNT = 3;

export interface DashboardViewProps {
  onLogout?: () => void;
  /** Open domain section (popup view state — not React Router). */
  onSectionClick?: (domain: string, section: string) => void;
  onSignIn?: () => void;
  /** Navigate to Ask scoped to current page (Paid only). */
  onAskPage?: () => void;
  /** Paid entitlement active — gates Ask affordance on current page. */
  isPaidActive?: boolean;
}

function openSourceUrl(url: string): void {
  if (!url) return;
  try {
    if (typeof chrome !== 'undefined' && chrome.tabs?.create) {
      void chrome.tabs.create({ url });
      return;
    }
  } catch {
    // fall through
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}

function formatPath(path: string | null | undefined): string {
  if (!path || path === '/') return '/';
  return path;
}

function StatusLine({
  guest,
  displayName,
  totalHighlights,
  totalDomains,
}: {
  guest: boolean;
  displayName?: string | null;
  totalHighlights: number;
  totalDomains: number;
}): React.ReactElement {
  const who = guest ? 'Local only' : (displayName?.split(' ')[0] || 'Account');
  return (
    <div style={{ padding: '10px 16px 9px' }}>
      <p
        className="u-mono"
        style={{
          margin: 0,
          fontSize: 'var(--step--2)',
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color: 'var(--ink-3)',
          lineHeight: 1.45,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {who}
        <span style={{ margin: '0 0.35em', color: 'var(--ink-4)', letterSpacing: 0 }} aria-hidden>
          ·
        </span>
        <span style={{ color: 'var(--ink-2)' }}>{totalHighlights}</span>
        {' highlights'}
        <span style={{ margin: '0 0.35em', color: 'var(--ink-4)', letterSpacing: 0 }} aria-hidden>
          ·
        </span>
        <span style={{ color: 'var(--ink-2)' }}>{totalDomains}</span>
        {' domains'}
      </p>
    </div>
  );
}

function CurrentPageBand({
  domain,
  path,
  count,
  canOpen,
  showAsk,
  onOpen,
  onAsk,
}: {
  domain: string | null;
  path: string;
  count: number;
  canOpen: boolean;
  showAsk: boolean;
  onOpen?: () => void;
  onAsk?: () => void;
}): React.ReactElement {
  const empty = !domain;

  return (
    <div
      style={{
        background: 'var(--paper-2)',
        borderTop: '1px solid var(--rule-soft)',
        borderBottom: '1px solid var(--rule)',
      }}
    >
      {/* Visually hidden section label for a11y / tests */}
      <div
        className="u-caps"
        style={{
          position: 'absolute',
          width: 1,
          height: 1,
          padding: 0,
          margin: -1,
          overflow: 'hidden',
          clip: 'rect(0, 0, 0, 0)',
          whiteSpace: 'nowrap',
          border: 0,
        }}
      >
        Current page
      </div>
      {empty ? (
        <div style={{ padding: '14px 16px', cursor: 'default' }}>
          <h2
            className="u-serif"
            style={{
              fontSize: 'var(--step-2)',
              lineHeight: 1.2,
              letterSpacing: '-0.015em',
              margin: 0,
              color: 'var(--ink)',
            }}
          >
            No page open
          </h2>
          <div
            className="u-mono"
            style={{
              marginTop: 5,
              fontSize: 'var(--step--2)',
              color: 'var(--ink-4)',
              letterSpacing: '0.06em',
            }}
          >
            Open a page with highlights to pin it
          </div>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={canOpen ? onOpen : undefined}
            disabled={!canOpen}
            style={{
              all: 'unset',
              cursor: canOpen ? 'pointer' : 'default',
              display: 'block',
              width: '100%',
              boxSizing: 'border-box',
              padding: '14px 16px',
              textAlign: 'left',
              background: 'transparent',
            }}
            aria-label={`Open ${domain}${path !== '/' ? path : ''}`}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: 10,
                minWidth: 0,
              }}
            >
              <h2
                className="u-serif"
                style={{
                  fontSize: 'var(--step-2)',
                  lineHeight: 1.2,
                  letterSpacing: '-0.015em',
                  margin: 0,
                  color: 'var(--ink)',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  flex: 1,
                }}
              >
                {domain}
              </h2>
              {canOpen ? (
                <span
                  className="u-mono"
                  style={{
                    fontSize: 'var(--step--1)',
                    letterSpacing: '0.04em',
                    color: 'var(--accent)',
                    flexShrink: 0,
                    lineHeight: 1.2,
                  }}
                >
                  Open →
                </span>
              ) : null}
            </div>
            <div
              className="u-mono"
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                marginTop: 5,
                fontSize: 'var(--step--2)',
                color: 'var(--ink-3)',
                letterSpacing: '0.04em',
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                  minWidth: 0,
                  maxWidth: '100%',
                }}
              >
                {path}
              </span>
              <span style={{ margin: '0 0.45em', color: 'var(--ink-4)' }} aria-hidden>
                ·
              </span>
              <span>
                {count} on this page
              </span>
            </div>
          </button>
          {showAsk && onAsk ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                padding: '0 16px 12px',
                marginTop: -2,
              }}
            >
              <button
                type="button"
                onClick={onAsk}
                className="u-mono"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  minHeight: 28,
                  fontSize: 'var(--step--2)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-2)',
                  textDecoration: 'underline',
                  textUnderlineOffset: 2,
                }}
              >
                Ask about this page
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

interface RecentItem {
  id: string;
  text: string;
  url: string;
  path: string;
  domain: string;
  notes?: string;
  tags?: string[];
  sourceKind?: 'code';
  language?: string;
  presentation?: HighlightPresentation;
}

function HomeRecentCard({
  item,
  onSectionClick,
}: {
  item: RecentItem;
  onSectionClick?: (domain: string, section: string) => void;
}): React.ReactElement {
  const notes = (item.notes ?? '').trim();
  const tags = item.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const tagOverflow = Math.max(0, tags.length - 2);
  const pathLabel = !item.path || item.path === '/' ? '' : item.path;
  const sectionKey = getSectionKey({ url: item.url, path: item.path || '/' });

  const actionStyle: React.CSSProperties = {
    all: 'unset',
    cursor: 'pointer',
    fontFamily: 'var(--mono)',
    fontSize: 'var(--step--2)',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--ink-3)',
    padding: '6px 8px',
    minHeight: 32,
    display: 'inline-flex',
    alignItems: 'center',
  };

  return (
    <article
      style={{
        padding: '14px 16px',
        borderBottom: '1px solid var(--rule-soft)',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      <div style={{ display: 'flex', gap: 6 }}>
        <span
          aria-hidden
          style={{
            fontFamily: 'var(--serif)',
            fontSize: 'var(--step-1)',
            lineHeight: 1.2,
            color: 'var(--ink-4)',
            flexShrink: 0,
          }}
        >
          &ldquo;
        </span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <HighlightMarkdownBody
            source={item.text}
            clamp
            sourceKind={item.sourceKind}
            language={item.language}
            presentation={item.presentation}
          />
        </div>
      </div>

      {notes ? (
        <div
          style={{
            fontSize: 'var(--step--1)',
            fontStyle: 'italic',
            color: 'var(--ink-3)',
            marginTop: 6,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {notes}
        </div>
      ) : null}

      {tags.length > 0 ? (
        <div
          aria-label="Tags"
          style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginTop: 8 }}
        >
          {visibleTags.map((t) => (
            <span
              key={t}
              className="u-mono"
              style={{
                display: 'inline-flex',
                height: 18,
                padding: '0 6px',
                alignItems: 'center',
                border: '1px solid var(--rule-soft)',
                borderRadius: 99,
                fontSize: 9,
                letterSpacing: '0.04em',
                color: 'var(--ink-3)',
              }}
            >
              {t}
            </span>
          ))}
          {tagOverflow > 0 ? (
            <span className="u-mono" style={{ fontSize: 9, color: 'var(--ink-4)' }}>
              +{tagOverflow}
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginTop: 10,
          paddingTop: 8,
          borderTop: '1px solid var(--rule-soft)',
        }}
      >
        {onSectionClick ? (
          <button
            type="button"
            onClick={() => onSectionClick(item.domain, sectionKey)}
            className="u-mono"
            style={{
              all: 'unset',
              cursor: 'pointer',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.04em',
              color: 'var(--ink-3)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.domain}
            {pathLabel}
          </button>
        ) : (
          <span
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              letterSpacing: '0.04em',
              color: 'var(--ink-3)',
              minWidth: 0,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {item.domain}
            {pathLabel}
          </span>
        )}
        <div style={{ display: 'flex', gap: 2, flexShrink: 0 }}>
          {item.text ? (
            <button
              type="button"
              className="u-mono"
              aria-label="Copy highlight text"
              onClick={() => {
                void copyHighlightPlainText(item.text);
              }}
              style={actionStyle}
            >
              Copy
            </button>
          ) : null}
          {item.url ? (
            <button
              type="button"
              className="u-mono"
              aria-label="Open highlight source"
              onClick={() => openSourceUrl(item.url)}
              style={actionStyle}
            >
              Open
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export function DashboardView({
  onLogout: _onLogout,
  onSectionClick,
  onSignIn,
  onAskPage,
  isPaidActive = false,
}: DashboardViewProps): React.ReactElement {
  const { currentMode, user, isAuthenticated } = useApp();
  const tabContext = useCurrentTabContext();
  const mode = currentMode || DEFAULT_MODE;
  const { data: dashboardData } = useDashboardData(mode, isAuthenticated);
  const { highlights: currentDomainHighlights } = useHighlightsByDomain(
    tabContext.domain || undefined,
    isAuthenticated,
  );
  const [recentExpanded, setRecentExpanded] = useState(false);

  const currentSectionKey = useMemo(() => {
    if (!tabContext.url && !tabContext.path) return '/';
    return getSectionKey({
      url: tabContext.url ?? `https://${tabContext.domain ?? 'local'}${tabContext.path ?? '/'}`,
      path: tabContext.path ?? '/',
    });
  }, [tabContext.url, tabContext.path, tabContext.domain]);

  const currentPageHighlightsCount = useMemo(() => {
    return currentDomainHighlights.filter((h) => {
      const key = getSectionKey({ url: h.url, path: h.path });
      return key === currentSectionKey;
    }).length;
  }, [currentDomainHighlights, currentSectionKey]);

  const totalHighlights = dashboardData?.totalHighlights ?? 0;
  const totalDomains = dashboardData?.totalDomains ?? 0;
  const recentHighlights = dashboardData?.recentHighlights ?? [];
  const libraryAccess = resolveLibraryAccess(isAuthenticated, totalHighlights);
  const isGuest = !isAuthenticated || mode === 'basic';
  const isFirstRun = totalHighlights === 0 && recentHighlights.length === 0;

  const pathDisplay = formatPath(tabContext.path);
  const canOpenSection = Boolean(tabContext.domain && onSectionClick);
  const showAsk = Boolean(isPaidActive && tabContext.domain && onAskPage);

  const openCurrentPage = (): void => {
    if (!tabContext.domain || !onSectionClick) return;
    onSectionClick(tabContext.domain, currentSectionKey);
  };

  // First-run: calm empty only (no status / anchor inventing a page).
  if (isFirstRun) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <FirstRunEmpty
          guest={isGuest || libraryAccess.showSignInPrompt}
          onSignIn={onSignIn}
        />
      </div>
    );
  }

  const visibleRecent = recentExpanded
    ? recentHighlights
    : recentHighlights.slice(0, RECENT_COLLAPSE_COUNT);
  const hiddenCount = Math.max(0, recentHighlights.length - RECENT_COLLAPSE_COUNT);
  const showRecentToggle = hiddenCount > 0;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minHeight: 0,
        background: 'var(--paper)',
      }}
    >
      <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <StatusLine
          guest={isGuest}
          displayName={user?.displayName}
          totalHighlights={totalHighlights}
          totalDomains={totalDomains}
        />
        <CurrentPageBand
          domain={tabContext.domain}
          path={pathDisplay}
          count={currentPageHighlightsCount}
          canOpen={canOpenSection}
          showAsk={showAsk}
          onOpen={openCurrentPage}
          onAsk={onAskPage}
        />
      </div>

      <div
        className="list-scroll"
        style={{
          flex: '1 1 0',
          minHeight: 0,
          overflowY: 'auto',
          overflowX: 'hidden',
          background: 'var(--paper)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'baseline',
            justifyContent: 'space-between',
            gap: 12,
            padding: '12px 16px 8px',
            position: 'sticky',
            top: 0,
            zIndex: 1,
            background: 'var(--paper)',
          }}
        >
          <span
            className="u-mono"
            style={{
              fontSize: 9,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
            }}
          >
            Recent
          </span>
          <span
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: 'var(--ink-4)',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: '0.04em',
            }}
          >
            {totalHighlights}
          </span>
        </div>

        {visibleRecent.map((hl) => (
          <HomeRecentCard
            key={hl.id}
            item={{
              id: hl.id,
              text: hl.text,
              url: hl.url,
              path: hl.path,
              domain: hl.domain,
              notes: hl.notes,
              tags: hl.tags,
              sourceKind: hl.sourceKind,
              language: hl.language,
              presentation: hl.presentation,
            }}
            onSectionClick={onSectionClick}
          />
        ))}

        {showRecentToggle ? (
          <button
            type="button"
            onClick={() => setRecentExpanded((v) => !v)}
            className="u-mono"
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '100%',
              boxSizing: 'border-box',
              minHeight: 44,
              padding: '12px 16px',
              fontSize: 'var(--step--2)',
              letterSpacing: '0.1em',
              textTransform: 'uppercase',
              color: 'var(--ink-3)',
              borderTop: '1px solid var(--rule-soft)',
            }}
          >
            {recentExpanded ? 'Show less' : `Show more · ${hiddenCount}`}
          </button>
        ) : null}
      </div>
    </div>
  );
}
