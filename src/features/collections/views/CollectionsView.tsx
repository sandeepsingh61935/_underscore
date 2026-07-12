import React from 'react';
import { useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useCollections } from '@/features/collections/hooks/useCollections';
import { canAccessLibrary } from '@/shared/utils/mode-capabilities';
import { DEFAULT_MODE } from '@/shared/constants/mode-storage';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { Row } from '@/ui-system/components/primitives/Row';

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
  const libraryAccessible = canAccessLibrary(isAuthenticated);

  const { collections, isLoading } = useCollections(mode, isAuthenticated);

  const handleCollectionClick = (domain: string): void => {
    if (onCollectionClick) {
      onCollectionClick(domain);
      return;
    }
    navigate(`/domain/${domain}`);
  };

  const totalHighlights = collections.reduce((acc, c) => acc + c.highlightCount, 0);

  if (!libraryAccessible) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
        <div style={{ padding: '10px 16px 0' }}>
          <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
            Library
          </div>
          <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
            Sign in required
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, textAlign: 'center' }}>
          <p className="u-sans" style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 16 }}>
            Sign in to view and sync your highlight library.
          </p>
          {onSignIn && (
            <button type="button" className="btn" onClick={onSignIn}>
              Sign in
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 32, lineHeight: 1, letterSpacing: '-0.025em' }}>
          Library
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          {collections.length} domains · {totalHighlights} highlights
        </div>
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
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
