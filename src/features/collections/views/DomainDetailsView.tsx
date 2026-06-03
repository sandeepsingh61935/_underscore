import React, { useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';

import { PopupShell } from '@/ui-system/components/layout/PopupShell';
import { ModeHeader } from '@/ui-system/components/layout/ModeHeader';
import { TabBar } from '@/ui-system/components/layout/TabBar';
import { Row } from '@/ui-system/components/primitives/Row';

const AUTH_REQUIRED_MODES: ModeType[] = ['cloud', 'ai'];

export interface DomainDetailsViewProps {
  domain?: string;
  onBack?: () => void;
  onSectionClick?: (domain: string, section: string) => void;
}

export function DomainDetailsView({ domain: propDomain, onBack, onSectionClick }: DomainDetailsViewProps): React.ReactElement {
  const params = useParams<{ domain: string }>();
  const domain = propDomain ?? params.domain ?? '';
  const navigate = useNavigate();
  const { isAuthenticated, currentMode } = useApp();
  const mode = (currentMode ?? 'ephemeral') as ModeType;

  useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/mode');
    }
  }, [isAuthenticated, mode, navigate]);

  const { highlights, isLoading } = useHighlightsByDomain(domain);

  const sections = useMemo(() => {
    const map = new Map<string, number>();
    highlights.forEach((h) => {
      const path = h.path || '/';
      map.set(path, (map.get(path) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);
  }, [highlights]);

  const handleBack = (): void => {
    if (onBack) {
      onBack();
    } else {
      navigate('/collections');
    }
  };

  const handleSectionClick = (section: string): void => {
    if (onSectionClick) {
      onSectionClick(domain, section);
    } else {
      navigate(`/domain/${domain}/section/${encodeURIComponent(section)}`);
    }
  };

  return (
    <PopupShell title="_underscore · library" mode={mode}>
      <ModeHeader modeId={mode} onBack={handleBack} backLabel="Library" />
      
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.015em' }}>
          {domain}
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.14em', marginTop: 4 }}>
          Sections
        </div>
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : (
          sections.map((s) => (
            <Row 
              key={s.path} 
              title={s.path === '/' ? 'Home' : s.path} 
              right={<span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>{s.count}</span>}
              onClick={() => handleSectionClick(s.path)} 
            />
          ))
        )}
      </div>

      <TabBar active="collections" />
    </PopupShell>
  );
}
