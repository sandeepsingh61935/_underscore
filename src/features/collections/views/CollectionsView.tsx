import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { HighlightSearchBar } from '@/features/collections/components/HighlightSearchBar';
import { useHighlightSearch } from '@/features/collections/hooks/useHighlightSearch';
import type { HighlightSearchResult } from '@/features/collections/hooks/useHighlightSearch';
import { copyHighlightPlainText } from '@/features/collections/hooks/useHighlightExport';
import { useUpdateHighlightText } from '@/features/collections/hooks/useUpdateHighlightText';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import type { SearchField } from '@/shared/utils/highlight-search';
import { Row } from '@/ui-system/components/primitives/Row';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';
import { EmptyState } from '@/ui-system/components/composed/EmptyState';
import { LibraryEmptyGuest } from '@/ui-system/components/empty-states/LibraryEmptyGuest';
import { LibraryStarters } from '@/ui-system/components/empty-states/LibraryStarters';

export interface CollectionsViewProps {
  onCollectionClick?: (domain: string) => void;
  /** Drill into a specific result's domain/section (search results can span domains). */
  onSectionClick?: (domain: string, section: string) => void;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
}

const DEFAULT_SEARCH_FIELDS: SearchField[] = ['text', 'notes', 'tags'];

/**
 * Small mono badge for results whose hit was only in the note or tag(s),
 * not the visible quote — otherwise a matched card can look confusing.
 */
function matchBadgeLabel(matchedFields: HighlightSearchResult['matchedFields']): string | null {
  if (matchedFields.includes('text')) return null;
  const inNotes = matchedFields.includes('notes');
  const inTags = matchedFields.includes('tags');
  if (inNotes && inTags) return 'Matched in note & tag(s)';
  if (inNotes) return 'Matched in note';
  if (inTags) return 'Matched in tag(s)';
  return null;
}

export function CollectionsView({
  onCollectionClick,
  onSectionClick,
  isAuthenticated: propIsAuthenticated,
  onSignIn,
}: CollectionsViewProps): React.ReactElement {
  const navigate = useNavigate();
  const appContext = useApp();

  const isAuthenticated = propIsAuthenticated ?? appContext.isAuthenticated;
  const mode = (appContext.currentMode ?? DEFAULT_MODE) as ModeType;

  const { collections, isLoading } = useCollections(mode);
  const { updateText } = useUpdateHighlightText();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchFields, setSearchFields] = useState<SearchField[]>(DEFAULT_SEARCH_FIELDS);

  const { results: searchResults, isLoading: isSearchLoading } = useHighlightSearch({
    query: searchQuery,
    scope: { kind: 'library' },
    fields: searchFields,
  });
  const isSearching = searchQuery.trim().length > 0;

  const handleCollectionClick = (domain: string): void => {
    if (onCollectionClick) {
      onCollectionClick(domain);
      return;
    }
    navigate(`/domain/${domain}`);
  };

  const handleResultSectionClick = (resultDomain: string, path: string): void => {
    if (onSectionClick) {
      onSectionClick(resultDomain, path);
      return;
    }
    navigate(`/domain/${resultDomain}/section/${encodeURIComponent(path)}`);
  };

  const totalHighlights = collections.reduce((acc, c) => acc + c.highlightCount, 0);
  const libraryAccess = resolveLibraryAccess(isAuthenticated, totalHighlights);

  if (libraryAccess.showSignInPrompt && !isLoading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '12px 16px 6px' }}>
          <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
            Library
          </div>
        </div>
        <LibraryEmptyGuest onSignIn={onSignIn} />
      </div>
    );
  }

  const kicker = isAuthenticated
    ? `${collections.length} domains · ${totalHighlights} highlights`
    : `Guest · ${collections.length} domains · ${totalHighlights} highlights`;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
          Library
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          {kicker}
        </div>
      </div>

      {!isAuthenticated && totalHighlights > 0 && (
        <div
          className="u-sans"
          style={{
            margin: '10px 16px 0',
            padding: 12,
            border: '1px solid var(--rule-soft)',
            background: 'var(--paper-2)',
            fontSize: 13,
            color: 'var(--ink-2)',
            lineHeight: 1.45,
          }}
        >
          Local only. Sign in to sync across devices and unlock export and AI.
        </div>
      )}

      <div style={{ padding: '10px 16px 0' }}>
        <HighlightSearchBar
          query={searchQuery}
          onQueryChange={setSearchQuery}
          fields={searchFields}
          onFieldsChange={setSearchFields}
          resultCount={searchQuery.trim() ? searchResults.length : undefined}
        />
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : isSearching ? (
          isSearchLoading ? (
            <div style={{ padding: '20px 16px', textAlign: 'center' }}>
              <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
            </div>
          ) : searchResults.length === 0 ? (
            <EmptyState variant="no-results" size="sm" />
          ) : (
            searchResults.map((r) => {
              const badge = matchBadgeLabel(r.matchedFields);
              return (
                <div key={r.id}>
                  <HighlightCard
                    quote={r.text || '[Unavailable]'}
                    domain={r.domain}
                    section={r.path === '/' ? undefined : r.path}
                    onSectionClick={() => handleResultSectionClick(r.domain, r.path)}
                    onCopy={r.text ? () => { void copyHighlightPlainText(r.text); } : undefined}
                    onSaveQuote={(text) => updateText(r.id, text)}
                  />
                  {badge && (
                    <div style={{ padding: '0 16px 8px', marginTop: -4 }}>
                      <span
                        className="u-mono"
                        style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.08em' }}
                      >
                        {badge}
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )
        ) : collections.length === 0 && isAuthenticated ? (
          <LibraryStarters />
        ) : (
          collections.map((c) => (
            <Row
              key={c.id}
              title={c.domain}
              sub={c.lastActive ? new Date(c.lastActive).toLocaleDateString() : ''}
              right={
                <span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                  {c.highlightCount}
                </span>
              }
              onClick={() => handleCollectionClick(c.domain)}
            />
          ))
        )}
      </div>
    </div>
  );
}
