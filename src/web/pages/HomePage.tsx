import React, { useCallback, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import { useUpdateHighlightMetadata } from '@/features/collections/hooks/useUpdateHighlightMetadata';
import { webHomeEmptyInstallCopy } from '@/shared/copy/product-surface-copy';
import { formatHighlightWhen } from '@/shared/utils/format-highlight-when';
import { resolveWebCaps } from '@/web/caps/resolveWebCaps';
import { resolveWebPaidActive } from '@/web/caps/resolveWebPaidActive';
import { DomainFavicon } from '@/web/components/DomainFavicon';
import { GuestBanner } from '@/web/components/GuestBanner';
import { WebHighlightCard } from '@/web/components/WebHighlightCard';
import { useExtensionPresence } from '@/web/extension-presence-context';
import {
  useWebLibrary,
  type WebCurrentPage,
  type WebHighlight,
} from '@/web/hooks/useWebLibrary';
import { createOptimisticMetadataHandlers } from '@/web/lib/optimisticMetadataSave';
import { buildLibrarySearch } from '@/web/routing/librarySelection';

/** Denser rail cards fit more rows; keep in sync with aggregateLibrary default. */
const RECENT_CAP = 12;
const ACTIVE_PAGES_CAP = 8;

type ActivePage = {
  domain: string;
  path: string;
  lastActive: number;
  count: number;
};

function greetingFor(name: string | null): string {
  const h = new Date().getHours();
  const when = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${when}, ${name}` : when;
}

function shortPath(p: string): string {
  const parts = String(p).split('/').filter(Boolean);
  return parts.length ? parts[parts.length - 1]! : p;
}

function emailLocalPart(email: string | undefined | null): string | null {
  if (!email) return null;
  const local = email.split('@')[0]?.trim();
  return local || null;
}

function buildActivePages(
  highlights: WebHighlight[],
  currentPage: WebCurrentPage,
  opts?: { excludeCurrent?: boolean; cap?: number }
): ActivePage[] {
  const excludeCurrent = opts?.excludeCurrent ?? true;
  const cap = opts?.cap ?? ACTIVE_PAGES_CAP;
  const map = new Map<string, ActivePage>();

  for (const h of highlights) {
    const path = h.path || '/';
    const key = `${h.domain}\0${path}`;
    const prev = map.get(key);
    if (!prev || h.savedAt > prev.lastActive) {
      map.set(key, {
        domain: h.domain,
        path,
        lastActive: h.savedAt,
        count: (prev?.count ?? 0) + 1,
      });
    } else {
      prev.count += 1;
    }
  }

  let list = [...map.values()].sort(
    (a, b) => b.lastActive - a.lastActive || a.domain.localeCompare(b.domain)
  );
  if (excludeCurrent && currentPage) {
    list = list.filter(
      (p) => !(p.domain === currentPage.domain && p.path === currentPage.path)
    );
  }
  return list.slice(0, cap);
}

function highlightsOnPage(
  highlights: WebHighlight[],
  page: WebCurrentPage
): WebHighlight[] {
  if (!page) return [];
  return highlights
    .filter((h) => h.domain === page.domain && h.path === page.path)
    .sort((a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id));
}

function EmptyInline({
  title,
  body,
  action,
}: {
  title: string;
  body?: string;
  action?: { label: string; to: string; odId?: string };
}): React.ReactElement {
  return (
    <div className="state-box" style={{ minHeight: 140, padding: '28px 16px' }}>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
      {action ? (
        <div className="actions" style={{ marginTop: 12 }}>
          <Link to={action.to} className="btn primary sm" data-od-id={action.odId}>
            {action.label}
          </Link>
        </div>
      ) : null}
    </div>
  );
}

/** Root path `/` means domain-only (no section), matching OD open-page. */
export function libraryHref(domain: string, path?: string | null): string {
  const section = path && path !== '/' ? path : null;
  const search = buildLibrarySearch({ domain, section });
  return search ? `/library?${search}` : '/library';
}

/**
 * Product Home — OD viewHome parity.
 * Guest is always empty (useWebLibrary). Chat/Ask product removed.
 */
export function HomePage(): React.ReactElement {
  const { isAuthenticated, user } = useApp();
  const billing = useBillingContextOptional();
  const navigate = useNavigate();

  const isPaidActive = resolveWebPaidActive(billing?.snapshot);
  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive,
        billingStatus: billing?.snapshot.entitlement.status ?? null,
      }),
    [isAuthenticated, isPaidActive, billing?.snapshot.entitlement.status]
  );

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });
  const { updateMetadata } = useUpdateHighlightMetadata();

  const empty = lib.highlights.length === 0;
  const guest = caps.isGuest;
  const showIntegrationsCta = caps.flags.mcp;

  const patchHighlight = lib.patchHighlight;
  const highlightsRef = useRef(lib.highlights);
  highlightsRef.current = lib.highlights;

  const { handleNoteSave, handleTagsChange } = useMemo(
    () =>
      createOptimisticMetadataHandlers({
        getHighlight: (id) => highlightsRef.current.find((h) => h.id === id),
        patchHighlight,
        updateMetadata,
      }),
    [patchHighlight, updateMetadata]
  );

  const handleToggleTagFilter = useCallback(
    (tag: string) => {
      // Home has no filter state — open Library with search context via hash-free query.
      // Tag chips still filter when user is already on Library; from Home, navigate.
      void navigate(`/library?tag=${encodeURIComponent(tag)}`);
    },
    [navigate]
  );

  const name = isAuthenticated
    ? emailLocalPart(user?.email) ||
      (user?.displayName?.trim() ? user.displayName.trim() : null)
    : null;

  const title = guest ? 'Local Library' : greetingFor(name);

  const pageHls = useMemo(
    () => (empty ? [] : highlightsOnPage(lib.highlights, lib.currentPage)),
    [empty, lib.highlights, lib.currentPage]
  );

  const activePages = useMemo(
    () =>
      empty
        ? []
        : buildActivePages(lib.highlights, lib.currentPage, {
            excludeCurrent: true,
            cap: ACTIVE_PAGES_CAP,
          }),
    [empty, lib.highlights, lib.currentPage]
  );

  /** OD: pageCount includes current page (excludeCurrent: false). */
  const pageCountAll = useMemo(
    () =>
      empty
        ? 0
        : buildActivePages(lib.highlights, lib.currentPage, {
            excludeCurrent: false,
            cap: 99,
          }).length,
    [empty, lib.highlights, lib.currentPage]
  );

  const recent = lib.recent;
  const hasMoreRecent = lib.highlights.length > RECENT_CAP;
  const fmt = (n: number): string => n.toLocaleString();

  const openLibraryPage = useCallback(
    (domain: string, path?: string | null) => {
      void navigate(libraryHref(domain, path));
    },
    [navigate]
  );

  if (lib.status === 'loading') {
    return (
      <div className="home" data-od-id="home">
        <div
          className="skeleton-stage"
          data-od-id="loading-state"
          aria-busy="true"
          aria-label="Loading"
        >
          <div
            className="skeleton sk-line"
            style={{ width: '36%', height: 28, marginBottom: 10 }}
          />
          <div
            className="skeleton sk-line"
            style={{ width: '52%', height: 12, marginBottom: 22 }}
          />
          <div className="stats-groups" style={{ minHeight: 96 }}>
            {[0, 1, 2].map((i) => (
              <div className="stats-group" key={i}>
                <div
                  className="skeleton sk-line"
                  style={{ width: '40%', height: 8, marginBottom: 12 }}
                />
                <div
                  className="skeleton sk-line"
                  style={{ width: '55%', height: 18, marginBottom: 8 }}
                />
                <div className="skeleton sk-line" style={{ width: '48%', height: 18 }} />
              </div>
            ))}
          </div>
          <div className="home-cols" style={{ minHeight: 280 }}>
            <div
              className="skeleton"
              style={{ height: '100%', minHeight: 220, borderRadius: 'var(--r-lg)' }}
            />
            <div
              className="skeleton"
              style={{ height: '100%', minHeight: 220, borderRadius: 'var(--r-lg)' }}
            />
          </div>
        </div>
      </div>
    );
  }

  if (lib.status === 'error') {
    return (
      <div className="home" data-od-id="home">
        <div className="state-box" data-od-id="error-state">
          <h3>Couldn’t load home</h3>
          <p>{lib.error || 'Try again in a moment.'}</p>
          <div className="actions">
            <button
              type="button"
              className="btn primary sm"
              onClick={() => {
                void lib.refresh();
              }}
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cp = lib.currentPage;
  const firstQuote = pageHls[0] ?? null;
  const countLine =
    pageHls.length === 0
      ? 'No highlights yet'
      : pageHls.length === 1
        ? '1 highlight'
        : `${pageHls.length} highlights`;
  const pathLine =
    cp && cp.path && cp.path !== '/'
      ? cp.path
      : cp?.sectionLabel && cp.sectionLabel !== '/'
        ? cp.sectionLabel
        : '';

  const pagesBody = empty ? (
    <EmptyInline title="No page open" body="Captures from the active tab land here." />
  ) : (
    <>
      {cp ? (
        <div className="home-current" data-od-id="home-current-page">
          <button
            type="button"
            className="home-current-btn"
            data-od-id="home-current-open"
            aria-label={`Open ${cp.domain} in library`}
            onClick={() => openLibraryPage(cp.domain, cp.path)}
          >
            <p className="home-current-kicker">Current page</p>
            <div className="home-current-head">
              <h3 className="home-current-domain">{cp.domain}</h3>
              <span className="home-current-trail" aria-hidden="true">
                →
              </span>
            </div>
            <div className="home-current-meta">
              {pathLine ? (
                <>
                  <span className="home-current-path">{pathLine}</span>
                  <span className="dot" aria-hidden="true">
                    ·
                  </span>
                </>
              ) : null}
              <span>{countLine}</span>
            </div>
            {firstQuote ? (
              <div className="home-current-quote">
                <span className="qmark">“</span>
                {firstQuote.quote}
              </div>
            ) : (
              <div className="home-current-empty">No highlights on this page yet</div>
            )}
          </button>
          {showIntegrationsCta && pageHls.length > 0 && cp ? (
            <div className="home-current-actions">
              <Link
                to="/settings?tab=ai"
                className="btn-text"
                data-od-id="home-integrations"
              >
                Connect agent
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="home-active-label" data-od-id="home-active-label">
        Active pages
      </p>
      {activePages.length > 0 ? (
        activePages.map((p) => {
          const path = p.path && p.path !== '/' ? p.path : '';
          const id = `${p.domain}-${p.path || ''}`.replace(/[^a-z0-9]+/gi, '-');
          return (
            <button
              key={`${p.domain}${p.path}`}
              type="button"
              className="page-row"
              data-od-id={`page-${id}`}
              onClick={() => openLibraryPage(p.domain, p.path)}
            >
              <DomainFavicon domain={p.domain} className="page-row-ico" />
              <div className="page-row-body">
                <div className="page-row-title">{p.domain}</div>
                <div className="page-row-meta">
                  {path ? `${shortPath(path)} · ` : ''}
                  {formatHighlightWhen(p.lastActive)}
                </div>
              </div>
              <span className="page-row-count">{p.count}</span>
              <span className="page-row-trail" aria-hidden="true">
                →
              </span>
            </button>
          );
        })
      ) : (
        <EmptyInline title="No other pages" body="More sites appear as you save." />
      )}
    </>
  );

  const extPresence = useExtensionPresence();
  const extensionInstalled = extPresence === 'installed';
  const firstRun = webHomeEmptyInstallCopy({ guest, extensionInstalled });
  const recentBody = empty ? (
    <EmptyInline
      title={firstRun.title}
      body={firstRun.body}
      action={
        !extensionInstalled && firstRun.installHref && firstRun.installLabel
          ? {
              label: firstRun.installLabel,
              to: firstRun.installHref,
              odId: 'home-empty-install',
            }
          : undefined
      }
    />
  ) : (
    recent.map((h) => (
      <WebHighlightCard
        key={h.id}
        highlight={h}
        density="rail"
        showDomain
        readOnly={guest}
        onOpenPage={openLibraryPage}
        onToggleTagFilter={guest ? undefined : handleToggleTagFilter}
        onNoteSave={guest ? undefined : handleNoteSave}
        onTagsChange={guest ? undefined : handleTagsChange}
      />
    ))
  );

  return (
    <div className="home" data-od-id="home">
      <div className="page-head">
        <div>
          <h1 className="page-title" data-od-id="home-title">
            {title}
          </h1>
        </div>
      </div>

      {guest ? <GuestBanner /> : null}

      {!empty ? (
        <div className="stats-groups" data-od-id="home-stats">
          <section className="stats-group" data-od-id="stats-highlights">
            <h3 className="stats-group-title">Highlights</h3>
            <div className="g-stat" data-od-id="stat-highlights">
              <span className="g-stat-label">Total</span>
              <span className="g-stat-val">{fmt(lib.stats.highlightCount)}</span>
            </div>
            <div className="g-stat" data-od-id="stat-week">
              <span className="g-stat-label">This week</span>
              <span className="g-stat-val">{fmt(lib.stats.thisWeekCount)}</span>
            </div>
          </section>
          <section className="stats-group" data-od-id="stats-pages">
            <h3 className="stats-group-title">Pages</h3>
            <div className="g-stat" data-od-id="stat-pages">
              <span className="g-stat-label">Active</span>
              <span className="g-stat-val">{fmt(pageCountAll)}</span>
            </div>
            <div className="g-stat" data-od-id="stat-sources">
              <span className="g-stat-label">Sources</span>
              <span className="g-stat-val">{fmt(lib.domains.length)}</span>
            </div>
          </section>
          <section className="stats-group" data-od-id="stats-library">
            <h3 className="stats-group-title">Library</h3>
            <div className="g-stat" data-od-id="stat-notes">
              <span className="g-stat-label">Notes</span>
              <span className="g-stat-val">{fmt(lib.stats.notesCount)}</span>
            </div>
            <div className="g-stat" data-od-id="stat-tags">
              <span className="g-stat-label">Tags</span>
              <span className="g-stat-val">{fmt(lib.stats.tagCount)}</span>
            </div>
          </section>
        </div>
      ) : null}

      <div className="home-cols" data-od-id="home-cols">
        <section
          className="home-col home-col--pages"
          data-od-id="home-pages"
          aria-labelledby="home-pages-title"
        >
          <div className="home-col-head">
            <div className="section-copy">
              <h2 id="home-pages-title">Pages</h2>
            </div>
          </div>
          <div className="home-col-scroll" data-od-id="home-pages-scroll">
            {pagesBody}
          </div>
        </section>

        <section
          className="home-col home-col--recent"
          data-od-id="home-recent"
          aria-labelledby="home-recent-title"
        >
          <div className="home-col-head">
            <div className="section-copy">
              <h2 id="home-recent-title">Recent</h2>
            </div>
            {!empty ? (
              <Link to="/library" className="btn-text" data-od-id="home-recent-view-all">
                {hasMoreRecent ? 'View all →' : 'Library'}
              </Link>
            ) : null}
          </div>
          <div className="home-col-scroll" data-od-id="home-recent-scroll">
            {recentBody}
          </div>
        </section>
      </div>
    </div>
  );
}
