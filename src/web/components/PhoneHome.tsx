import React, { useState } from 'react';

import type { WebHighlight } from '@/web/hooks/useWebLibrary';
import { LibraryPager } from '@/web/components/LibraryPager';
import { clampPage } from '@/web/lib/buildPagerItems';

import { PhoneHighlightCard } from './PhoneHighlightCard';

export const PHONE_RECENT_PAGE_SIZE = 10;

export type PhoneHomeStats = {
  highlightCount: number;
  thisWeekCount: number;
  pageCount: number;
  sourceCount: number;
  notesCount: number;
  tagCount: number;
};

export type PhoneHomeCurrentPage = {
  domain: string;
  path: string;
  countLabel: string;
  quote: string | null;
};

export type PhoneHomeProps = {
  greeting: string;
  count: number;
  recent: WebHighlight[];
  onOpenHighlight: (id: string, domain: string) => void;
  onNoteSave?: (id: string, note: string) => Promise<boolean>;
  onTagsChange?: (id: string, tags: string[]) => Promise<boolean>;
  onDeleteHighlight?: (id: string) => Promise<boolean>;
  stats?: PhoneHomeStats | null;
  currentPage?: PhoneHomeCurrentPage | null;
  onOpenCurrentPage?: () => void;
};

function stat(n: number): string {
  return n.toLocaleString();
}

export function PhoneHome({
  greeting,
  count,
  recent,
  onOpenHighlight,
  onNoteSave,
  onTagsChange,
  onDeleteHighlight,
  stats = null,
  currentPage = null,
  onOpenCurrentPage,
}: PhoneHomeProps): React.ReactElement {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(recent.length / PHONE_RECENT_PAGE_SIZE));
  const safePage = clampPage(page, totalPages);
  const pageStart = (safePage - 1) * PHONE_RECENT_PAGE_SIZE;
  const pagedRecent = recent.slice(pageStart, pageStart + PHONE_RECENT_PAGE_SIZE);

  return (
    <section className="phone-home" data-od-id="phone-home">
      <header className="phone-home-top">
        <h1 className="phone-home-greeting">{greeting}</h1>
        {stats && count > 0 ? (
          <div
            className="phone-stats"
            data-od-id="phone-home-stats"
            aria-label="Library stats"
          >
            <div className="phone-stat">
              <span className="phone-stat-label">Total</span>
              <span className="phone-stat-val">{stat(stats.highlightCount)}</span>
            </div>
            <div className="phone-stat">
              <span className="phone-stat-label">This week</span>
              <span className="phone-stat-val">{stat(stats.thisWeekCount)}</span>
            </div>
            <div className="phone-stat">
              <span className="phone-stat-label">Pages</span>
              <span className="phone-stat-val">{stat(stats.pageCount)}</span>
            </div>
            <div className="phone-stat">
              <span className="phone-stat-label">Sources</span>
              <span className="phone-stat-val">{stat(stats.sourceCount)}</span>
            </div>
            <div className="phone-stat">
              <span className="phone-stat-label">Notes</span>
              <span className="phone-stat-val">{stat(stats.notesCount)}</span>
            </div>
            <div className="phone-stat">
              <span className="phone-stat-label">Tags</span>
              <span className="phone-stat-val">{stat(stats.tagCount)}</span>
            </div>
          </div>
        ) : null}
      </header>

      {currentPage ? (
        <button
          type="button"
          className="phone-current"
          data-od-id="phone-current-page"
          onClick={onOpenCurrentPage}
        >
          <span className="phone-current-kicker">Current page</span>
          <span className="phone-current-domain">{currentPage.domain}</span>
          <span className="phone-current-meta">
            {currentPage.path ? `${currentPage.path} · ` : ''}
            {currentPage.countLabel}
          </span>
          {currentPage.quote ? (
            <span className="phone-current-quote">{currentPage.quote}</span>
          ) : null}
        </button>
      ) : null}

      {recent.length === 0 ? (
        <p className="phone-empty">
          No highlights yet. Highlight on desktop with the extension.
        </p>
      ) : (
        <div className="phone-stream">
          <div className="phone-section-head">
            <span className="phone-kicker">Recent</span>
          </div>
          <div className="phone-recent-list">
            {pagedRecent.map((h) => (
              <PhoneHighlightCard
                key={h.id}
                highlight={h}
                meta={h.path && h.path !== '/' ? `${h.domain} · ${h.path}` : h.domain}
                onOpen={() => onOpenHighlight(h.id, h.domain)}
                onNoteSave={onNoteSave}
                onTagsChange={onTagsChange}
                onDelete={onDeleteHighlight}
              />
            ))}
          </div>
          {totalPages > 1 ? (
            <LibraryPager
              page={safePage}
              totalPages={totalPages}
              onPageChange={setPage}
            />
          ) : null}
        </div>
      )}
    </section>
  );
}
