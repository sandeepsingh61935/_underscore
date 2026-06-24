import React, { useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useGenerateSummary } from '@/features/ai/hooks/useGenerateSummary';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { HighlightCard } from '@/ui-system/components/primitives/HighlightCard';

const AUTH_REQUIRED_MODES: ModeType[] = ['cloud', 'ai'];

export interface SubDomainViewProps {
  domain?: string;
  section?: string;
  onBack?: () => void;
}

export function SubDomainView({ domain: propDomain, section: propSection, onBack: _onBack }: SubDomainViewProps): React.ReactElement {
  const params = useParams<{ domain: string; section: string }>();
  const domain = propDomain ?? params.domain ?? '';
  const section = propSection ?? (params.section ? decodeURIComponent(params.section) : '/');

  const navigate = useNavigate();
  const { isAuthenticated, currentMode } = useApp();
  const mode = (currentMode ?? 'ephemeral') as ModeType;

  useEffect(() => {
    if (!isAuthenticated && AUTH_REQUIRED_MODES.includes(mode)) {
      navigate('/mode');
    }
  }, [isAuthenticated, mode, navigate]);

  const { highlights, isLoading } = useHighlightsByDomain(domain);
  const summary = useGenerateSummary();

  const sectionHighlights = useMemo(() => {
    return highlights.filter((h) => {
      const path = h.path || '/';
      return path === section;
    });
  }, [highlights, section]);

  const getTtlMs = (createdAt: Date): number | undefined => {
    if (mode === 'ephemeral') {
      const expiry = createdAt.getTime() + 24 * 60 * 60 * 1000;
      const ttl = expiry - Date.now();
      return Math.max(0, ttl);
    }
    return undefined;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 6px' }}>
        <div className="u-sans" style={{ fontSize: 13, fontWeight: 600, letterSpacing: '0.16em', textTransform: 'uppercase' }}>
          {section === '/' ? 'HOME' : section}
        </div>
        <div className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.14em' }}>
          {sectionHighlights.length} highlights · {mode}
        </div>
      </div>

      {sectionHighlights.length > 0 && (
        <div style={{ padding: '4px 16px 8px' }}>
          <button
            type="button"
            onClick={() => summary.start({
              pageTitle: section,
              pageUrl: domain,
              pageContextWithMarks: sectionHighlights.map(h => h.text).join('\n\n'),
              pageContext: sectionHighlights.map(h => h.text).join(' '),
              highlights: sectionHighlights.map(h => ({ id: h.id, text: h.text, url: h.url, title: section })),
              length: 'medium',
            })}
            disabled={summary.status === 'streaming'}
            style={{
              font: 'var(--sans)', fontSize: 'var(--step--1)',
              padding: '6px 10px', background: 'var(--paper)', color: 'var(--ink)',
              border: '1px solid var(--rule)', cursor: summary.status === 'streaming' ? 'wait' : 'pointer',
            }}
          >
            Summarize this section
          </button>
        </div>
      )}

      {summary.chunks && (
        <div
          role="status"
          aria-live="polite"
          style={{
            padding: '8px 16px', whiteSpace: 'pre-wrap',
            font: 'var(--sans)', fontSize: 'var(--step--1)', color: 'var(--ink)',
            borderTop: '1px solid var(--rule)', maxHeight: '120px', overflowY: 'auto',
          }}
        >
          {summary.chunks}
        </div>
      )}

      <div className="list-scroll" style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : (
          sectionHighlights.map((h) => (
            <HighlightCard
              key={h.id}
              quote={h.text}
              domain={domain}
              section={section === '/' ? undefined : section}
              ttlMs={getTtlMs(h.createdAt)}
            />
          ))
        )}
      </div>
    </div>
  );
}
