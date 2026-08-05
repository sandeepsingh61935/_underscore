import React, { useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { useBillingContextOptional } from '@/features/billing/BillingProvider';
import {
  resolveWebCaps,
  type WebPlanLabel,
} from '@/web/caps/resolveWebCaps';
import { GuestBanner } from '@/web/components/GuestBanner';
import {
  useWebLibrary,
  type WebCurrentPage,
  type WebHighlight,
} from '@/web/hooks/useWebLibrary';
import { buildLibrarySearch } from '@/web/routing/librarySelection';

const RECENT_CAP = 6;
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

function homeLede(opts: {
  isGuest: boolean;
  empty: boolean;
  ai: boolean;
}): string {
  if (opts.isGuest) {
    return opts.empty
      ? 'Extension captures stay here until you sign in.'
      : 'Local library — sign in to sync and export.';
  }
  if (opts.empty) {
    return 'Highlight text with the extension; it shows up here.';
  }
  if (opts.ai) {
    return 'Resume a page, or Ask from what you’ve saved.';
  }
  return 'Current page and recent saves — search lives in Library.';
}

function planPersistence(label: WebPlanLabel): string {
  switch (label) {
    case 'Guest':
      return 'This browser only';
    case 'Paid':
      return 'Synced · Ask on';
    case 'Past due':
    case 'Free':
    default:
      return 'Synced devices';
  }
}

function relativeTime(ts: number, now = Date.now()): string {
  const d = now - ts;
  if (d < 3600e3) return `${Math.max(1, Math.round(d / 60e3))}m ago`;
  if (d < 86400e3) return `${Math.round(d / 3600e3)}h ago`;
  return `${Math.round(d / 86400e3)}d ago`;
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
  opts?: { excludeCurrent?: boolean; cap?: number },
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
    (a, b) => b.lastActive - a.lastActive || a.domain.localeCompare(b.domain),
  );
  if (excludeCurrent && currentPage) {
    list = list.filter(
      (p) => !(p.domain === currentPage.domain && p.path === currentPage.path),
    );
  }
  return list.slice(0, cap);
}

function highlightsOnPage(
  highlights: WebHighlight[],
  page: WebCurrentPage,
): WebHighlight[] {
  if (!page) return [];
  return highlights
    .filter((h) => h.domain === page.domain && h.path === page.path)
    .sort((a, b) => b.savedAt - a.savedAt || a.id.localeCompare(b.id));
}

function EmptyInline({
  title,
  body,
}: {
  title: string;
  body?: string;
}): React.ReactElement {
  return (
    <div className="state-box" style={{ minHeight: 140, padding: '28px 16px' }}>
      <h3>{title}</h3>
      {body ? <p>{body}</p> : null}
    </div>
  );
}

function libraryHref(domain: string, path?: string | null): string {
  const search = buildLibrarySearch({
    domain,
    section: path ?? null,
  });
  return search ? `/library?${search}` : '/library';
}

/**
 * Product Home — OD viewHome parity.
 * Guest is always empty (useWebLibrary); Ask CTAs only when caps.ai.
 */
export function HomePage(): React.ReactElement {
  const { isAuthenticated, user } = useApp();
  const billing = useBillingContextOptional();
  const navigate = useNavigate();

  const caps = useMemo(
    () =>
      resolveWebCaps({
        isAuthenticated,
        isPaidActive: billing?.snapshot.isPaidActive ?? false,
        billingStatus: billing?.snapshot.entitlement.status ?? null,
      }),
    [
      isAuthenticated,
      billing?.snapshot.isPaidActive,
      billing?.snapshot.entitlement.status,
    ],
  );

  const lib = useWebLibrary({
    isAuthenticated,
    planLabel: caps.planLabel,
  });

  const empty = lib.highlights.length === 0;
  const ai = caps.flags.ai;

  const name = isAuthenticated
    ? emailLocalPart(user?.email) ||
      (user?.displayName?.trim() ? user.displayName.trim() : null)
    : null;

  const title = caps.isGuest ? 'Your local library' : greetingFor(name);
  const lede = homeLede({ isGuest: caps.isGuest, empty, ai });

  const pageHls = useMemo(
    () => (empty ? [] : highlightsOnPage(lib.highlights, lib.currentPage)),
    [empty, lib.highlights, lib.currentPage],
  );

  const activePages = useMemo(
    () =>
      empty
        ? []
        : buildActivePages(lib.highlights, lib.currentPage, {
            excludeCurrent: true,
            cap: ACTIVE_PAGES_CAP,
          }),
    [empty, lib.highlights, lib.currentPage],
  );

  const recent = lib.recent;
  const hasMoreRecent = lib.highlights.length > RECENT_CAP;

  const openLibraryPage = useCallback(
    (domain: string, path?: string | null) => {
      void navigate(libraryHref(domain, path));
    },
    [navigate],
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
          <div className="grid-stats" style={{ marginBottom: 18, minHeight: 64 }}>
            {[0, 1, 2, 3].map((i) => (
              <div className="stat" key={i}>
                <div
                  className="skeleton sk-line"
                  style={{ width: '48%', height: 8, marginBottom: 10 }}
                />
                <div className="skeleton sk-line" style={{ width: '32%', height: 20 }} />
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

  let headAction: React.ReactNode = null;
  if (!caps.isGuest && ai && !empty) {
    headAction = (
      <Link to="/ask" className="btn accent" data-od-id="home-cta">
        Ask library
      </Link>
    );
  } else if (!caps.isGuest && !empty) {
    headAction = (
      <Link to="/library" className="btn" data-od-id="home-cta">
        Library
      </Link>
    );
  }

  const pagesBody = empty ? (
    <EmptyInline
      title="No page open"
      body="Captures from the active tab land here."
    />
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
          {ai && pageHls.length > 0 ? (
            <div className="home-current-actions">
              <Link to="/ask" className="btn-text" data-od-id="home-ask-page">
                Ask this page
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
              <div className="page-row-ico" aria-hidden="true">
                {p.domain.slice(0, 2)}
              </div>
              <div className="page-row-body">
                <div className="page-row-title">{p.domain}</div>
                <div className="page-row-meta">
                  {path ? `${shortPath(path)} · ` : ''}
                  {relativeTime(p.lastActive)}
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

  const recentBody = empty ? (
    <EmptyInline
      title="Nothing saved"
      body="Select text in the extension to capture a highlight."
    />
  ) : (
    recent.map((h) => (
      <button
        key={h.id}
        type="button"
        className="hl"
        data-od-id={`hl-${h.id}`}
        onClick={() => openLibraryPage(h.domain, h.path)}
      >
        <p className="hl-quote">“{h.quote}”</p>
        <div className="hl-meta">
          <span className="src">{h.domain}</span>
          <span>{h.path}</span>
          <span>{relativeTime(h.savedAt)}</span>
          {h.note.trim() ? <span>{h.note.trim()}</span> : null}
        </div>
      </button>
    ))
  );

  return (
    <div className="home" data-od-id="home">
      <div className="page-head">
        <div>
          {caps.isGuest ? (
            <p className="page-kicker" data-od-id="home-kicker">
              Local only
            </p>
          ) : null}
          <h1 className="page-title" data-od-id="home-title">
            {title}
          </h1>
          <p className="page-lede" data-od-id="home-lede">
            {lede}
          </p>
        </div>
        {headAction ? <div className="page-actions">{headAction}</div> : null}
      </div>

      {caps.isGuest ? <GuestBanner /> : null}

      <div className="grid-stats" data-od-id="home-stats" style={{ marginBottom: 18 }}>
        <div className="stat" data-od-id="stat-highlights">
          <div className="stat-label">Highlights</div>
          <div className="stat-val">{lib.stats.highlightCount}</div>
        </div>
        <div className="stat" data-od-id="stat-pages">
          <div className="stat-label">Pages</div>
          <div className="stat-val">{lib.stats.pageCount}</div>
        </div>
        <div className="stat" data-od-id="stat-week">
          <div className="stat-label">This week</div>
          <div className="stat-val">{lib.stats.thisWeekCount}</div>
        </div>
        <div className="stat" data-od-id="stat-plan">
          <div className="stat-label">Plan</div>
          <div className="stat-val is-word">{caps.planLabel}</div>
          <div className="stat-hint">{planPersistence(caps.planLabel)}</div>
        </div>
      </div>

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
            {!empty ? (
              <span className="meta" data-od-id="home-pages-count">
                {lib.stats.pageCount}
              </span>
            ) : null}
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
              <Link
                to="/library"
                className="btn-text"
                data-od-id="home-recent-view-all"
              >
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
