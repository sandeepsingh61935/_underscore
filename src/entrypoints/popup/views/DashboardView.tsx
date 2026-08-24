/**
 * Home — locked product cleanup:
 * 2×2 stats · This page line · 50/50 Active | Recent columns (compact rows).
 */
import React, { useMemo, useState } from 'react';

import { useApp } from '@/core/context/PopupAppProvider';
import { useDashboardData } from '@/features/collections/hooks/useDashboardData';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import {
  buildActivePages,
  buildPopupHomeModel,
  type PopupHomeStats,
} from '@/shared/home/home-model';
import { highlightActivityMs } from '@/shared/utils/highlight-activity';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import { getSectionKey } from '@/shared/utils/section-key';
import { FirstRunEmpty } from '@/ui-system/components/empty-states/FirstRunEmpty';
import { useCurrentTabContext } from '@/ui-system/hooks/useCurrentTabContext';

const RECENT_COLLAPSE_COUNT = 8;
const ACTIVE_PAGES_CAP = 8;
const COLUMN_VISIBLE_HINT = 5;

export interface DashboardViewProps {
  onLogout?: () => void;
  onSectionClick?: (domain: string, section: string) => void;
  onSignIn?: () => void;
}

function formatPath(path: string | null | undefined): string {
  if (!path || path === '/') return '/';
  return path;
}

const STAT_CELLS: Array<{ key: keyof PopupHomeStats; label: string }> = [
  { key: 'highlightCount', label: 'Highlights' },
  { key: 'domainCount', label: 'Domains' },
  { key: 'thisWeekCount', label: 'This week' },
  { key: 'todayCount', label: 'Today' },
];

function HomeHeader({
  stats,
}: {
  stats: PopupHomeStats;
}): React.ReactElement {
  return (
    <div data-testid="home-status" style={{ padding: '12px 16px 10px' }}>
      <div
        data-testid="home-stats"
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 0,
          border: '1px solid var(--rule-soft)',
        }}
      >
        {STAT_CELLS.map((cell, i) => (
          <div
            key={cell.key}
            data-testid={`home-stat-${cell.key}`}
            style={{
              padding: '10px 12px',
              borderRight: i % 2 === 0 ? '1px solid var(--rule-soft)' : undefined,
              borderBottom: i < 2 ? '1px solid var(--rule-soft)' : undefined,
              minWidth: 0,
            }}
          >
            <div
              className="u-mono"
              style={{
                fontSize: 'var(--step--2)',
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                color: 'var(--ink-4)',
              }}
            >
              {cell.label}
            </div>
            <div
              className="u-serif"
              style={{
                fontSize: 'var(--step-2)',
                color: 'var(--ink)',
                marginTop: 2,
                fontVariantNumeric: 'tabular-nums',
              }}
            >
              {stats[cell.key]}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ThisPageLine({
  domain,
  path,
  count,
  canOpen,
  onOpen,
}: {
  domain: string | null;
  path: string;
  count: number;
  canOpen: boolean;
  onOpen?: () => void;
}): React.ReactElement {
  const empty = !domain;
  const label = empty
    ? 'This page · none open'
    : `This page · ${domain}${path !== '/' ? path : ''} · ${count}`;

  const inner = (
    <span
      className="u-mono"
      data-testid="home-this-page"
      style={{
        display: 'block',
        padding: '8px 16px',
        fontSize: 'var(--step--2)',
        letterSpacing: '0.06em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        fontVariantNumeric: 'tabular-nums',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap',
        borderTop: '1px solid var(--rule-soft)',
        borderBottom: '1px solid var(--rule)',
        background: 'var(--paper-2)',
      }}
    >
      {label}
      {canOpen && !empty ? (
        <span style={{ color: 'var(--accent)', marginLeft: 8 }}>Open</span>
      ) : null}
    </span>
  );

  if (!canOpen || empty) return inner;

  return (
    <button
      type="button"
      onClick={onOpen}
      aria-label={`Open ${domain}${path !== '/' ? path : ''}`}
      style={{
        all: 'unset',
        cursor: 'pointer',
        display: 'block',
        width: '100%',
        boxSizing: 'border-box',
      }}
    >
      {inner}
    </button>
  );
}

function ColumnHeader({ label }: { label: string }): React.ReactElement {
  return (
    <div
      className="u-mono"
      style={{
        fontSize: 'var(--step--2)',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
        color: 'var(--ink-3)',
        padding: '8px 10px 6px',
        borderBottom: '1px solid var(--rule-soft)',
        position: 'sticky',
        top: 0,
        background: 'var(--paper)',
        zIndex: 1,
      }}
    >
      {label}
    </div>
  );
}

function CompactRow({
  primary,
  meta,
  onClick,
  disabled,
}: {
  primary: string;
  meta: string;
  onClick?: () => void;
  disabled?: boolean;
}): React.ReactElement {
  const body = (
    <>
      <span
        className="u-sans"
        style={{
          display: 'block',
          fontSize: 'var(--step--1)',
          color: 'var(--ink)',
          lineHeight: 1.35,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {primary}
      </span>
      <span
        className="u-mono"
        style={{
          display: 'block',
          marginTop: 2,
          fontSize: 'var(--step--2)',
          letterSpacing: '0.04em',
          color: 'var(--ink-4)',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {meta}
      </span>
    </>
  );

  const style: React.CSSProperties = {
    all: 'unset',
    display: 'block',
    width: '100%',
    boxSizing: 'border-box',
    padding: '8px 10px',
    borderBottom: '1px solid var(--rule-soft)',
    cursor: onClick && !disabled ? 'pointer' : 'default',
    minWidth: 0,
  };

  if (onClick && !disabled) {
    return (
      <button type="button" onClick={onClick} style={style}>
        {body}
      </button>
    );
  }
  return <div style={style}>{body}</div>;
}

export function DashboardView({
  onLogout: _onLogout,
  onSectionClick,
  onSignIn,
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
  const thisWeekCount = dashboardData?.thisWeekCount ?? 0;
  const todayCount = dashboardData?.todayCount ?? 0;
  const recentHighlights = dashboardData?.recentHighlights ?? [];
  const libraryAccess = resolveLibraryAccess(isAuthenticated, totalHighlights);
  const isGuest = !isAuthenticated || mode === 'basic';

  const displayName =
    user?.displayName?.trim()?.split(/\s+/)[0] ||
    user?.email?.split('@')[0] ||
    null;

  const homeModel = buildPopupHomeModel({
    isAuthenticated: Boolean(isAuthenticated) && mode !== 'basic',
    displayName,
    totalHighlights,
    totalDomains,
    thisWeekCount,
    todayCount,
    tabDomain: tabContext.domain,
    tabPath: tabContext.path,
    currentPageHighlightCount: currentPageHighlightsCount,
    recentCount: recentHighlights.length,
  });

  const activePages = useMemo(() => {
    const rows = recentHighlights.map((h) => ({
      id: h.id,
      domain: h.domain,
      path: h.path || '/',
      savedAt: highlightActivityMs({
        updatedAt: h.updatedAt,
        createdAt: h.createdAt,
      }),
    }));
    const current = tabContext.domain
      ? { domain: tabContext.domain, path: currentSectionKey }
      : null;
    return buildActivePages(rows, current, {
      excludeCurrent: true,
      cap: ACTIVE_PAGES_CAP,
    });
  }, [recentHighlights, tabContext.domain, currentSectionKey]);

  const pathDisplay = formatPath(tabContext.path);
  const canOpenSection = Boolean(tabContext.domain && onSectionClick);

  const openCurrentPage = (): void => {
    if (!tabContext.domain || !onSectionClick) return;
    onSectionClick(tabContext.domain, currentSectionKey);
  };

  if (homeModel.emptyKind === 'first_run') {
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
      <div style={{ flexShrink: 0 }}>
        <HomeHeader stats={homeModel.stats} />
        <ThisPageLine
          domain={tabContext.domain}
          path={pathDisplay}
          count={currentPageHighlightsCount}
          canOpen={canOpenSection}
          onOpen={openCurrentPage}
        />
      </div>

      <div
        data-testid="home-two-col"
        style={{
          flex: '1 1 0',
          minHeight: 0,
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          borderTop: '1px solid var(--rule-soft)',
        }}
      >
        <section
          data-testid="home-active-pages"
          style={{
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
            borderRight: '1px solid var(--rule)',
          }}
        >
          <ColumnHeader label="Active" />
          <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {activePages.length === 0 ? (
              <div
                style={{
                  padding: '28px 14px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 'var(--step-1)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    color: 'var(--ink)',
                    margin: 0,
                  }}
                >
                  No other pages
                </p>
                <p
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--step-0)',
                    color: 'var(--ink-3)',
                    lineHeight: 1.45,
                    maxWidth: '22ch',
                    margin: 0,
                  }}
                >
                  More sites appear as you save.
                </p>
              </div>
            ) : (
              activePages.map((p) => {
                const sectionKey = p.path || '/';
                const primary = `${p.domain}${p.path && p.path !== '/' ? p.path : ''}`;
                return (
                  <CompactRow
                    key={`${p.domain}\0${p.path}`}
                    primary={primary}
                    meta={`${p.count}`}
                    disabled={!onSectionClick}
                    onClick={
                      onSectionClick
                        ? () => onSectionClick(p.domain, sectionKey)
                        : undefined
                    }
                  />
                );
              })
            )}
          </div>
        </section>

        <section
          data-testid="home-recent"
          style={{
            minWidth: 0,
            minHeight: 0,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <ColumnHeader label="Recent" />
          <div className="list-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto' }}>
            {visibleRecent.map((hl) => {
              const sectionKey = getSectionKey({ url: hl.url, path: hl.path || '/' });
              const pathLabel = !hl.path || hl.path === '/' ? '' : hl.path;
              const quote =
                hl.text.length > 72 ? `${hl.text.slice(0, 72).trimEnd()}…` : hl.text;
              return (
                <CompactRow
                  key={hl.id}
                  primary={quote || '(empty)'}
                  meta={`${hl.domain}${pathLabel}`}
                  onClick={
                    onSectionClick
                      ? () => onSectionClick(hl.domain, sectionKey)
                      : undefined
                  }
                />
              );
            })}
            {showRecentToggle ? (
              <button
                type="button"
                onClick={() => setRecentExpanded((v) => !v)}
                className="u-mono"
                style={{
                  all: 'unset',
                  cursor: 'pointer',
                  display: 'block',
                  width: '100%',
                  boxSizing: 'border-box',
                  padding: '10px',
                  fontSize: 'var(--step--2)',
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                  textAlign: 'center',
                }}
              >
                {recentExpanded ? 'Show less' : `Show more · ${hiddenCount}`}
              </button>
            ) : null}
            {visibleRecent.length === 0 ? (
              <div
                style={{
                  padding: '28px 14px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: 6,
                }}
              >
                <p
                  style={{
                    fontFamily: 'var(--serif)',
                    fontSize: 'var(--step-1)',
                    fontWeight: 500,
                    letterSpacing: '-0.02em',
                    lineHeight: 1.25,
                    color: 'var(--ink)',
                    margin: 0,
                  }}
                >
                  No highlights yet
                </p>
                <p
                  style={{
                    fontFamily: 'var(--sans)',
                    fontSize: 'var(--step-0)',
                    color: 'var(--ink-3)',
                    lineHeight: 1.45,
                    maxWidth: '22ch',
                    margin: 0,
                  }}
                >
                  Select text on any page and save a highlight.
                </p>
              </div>
            ) : null}
            {/* density hint for layout tests / future virtualization */}
            <span data-testid="home-col-hint" hidden>
              {COLUMN_VISIBLE_HINT}
            </span>
          </div>
        </section>
      </div>
    </div>
  );
}
