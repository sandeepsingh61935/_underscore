import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { resolveLibraryAccess } from '@/shared/utils/mode-capabilities';
import { Row } from '@/ui-system/components/primitives/Row';
import { LibraryEmptyGuest } from '@/ui-system/components/empty-states/LibraryEmptyGuest';
import { LibraryStarters } from '@/ui-system/components/empty-states/LibraryStarters';

export interface CollectionsViewProps {
  onCollectionClick?: (domain: string) => void;
  isAuthenticated?: boolean;
  onSignIn?: () => void;
}

export function CollectionsView({
  onCollectionClick,
  isAuthenticated: propIsAuthenticated,
  onSignIn,
}: CollectionsViewProps): React.ReactElement {
  const navigate = useNavigate();
  const appContext = useApp();

  const isAuthenticated = propIsAuthenticated ?? appContext.isAuthenticated;
  const mode = (appContext.currentMode ?? DEFAULT_MODE) as ModeType;

  const { collections, isLoading } = useCollections(mode);

  const handleCollectionClick = (domain: string): void => {
    if (onCollectionClick) {
      onCollectionClick(domain);
      return;
    }
    navigate(`/domain/${domain}`);
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
          Local only. Sign in to sync across devices and unlock search, export, and AI.
        </div>
      )}

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
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
