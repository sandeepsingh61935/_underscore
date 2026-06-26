import React, { useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { parse } from 'tldts';

import { useApp } from '@/core/context/AppProvider';
import { useHighlightsByDomain } from '@/features/collections/hooks/useHighlightsByDomainFactory';
import { useGenerateSummary } from '@/features/ai/hooks/useGenerateSummary';
import type { ModeType } from '@/shared/schemas/mode-state-schemas';
import { Row } from '@/ui-system/components/primitives/Row';

const AUTH_REQUIRED_MODES: ModeType[] = ['cloud', 'ai'];

export interface DomainDetailsViewProps {
  domain?: string;
  onBack?: () => void;
  onSectionClick?: (domain: string, section: string) => void;
}

export function DomainDetailsView({ domain: propDomain, onBack: _onBack, onSectionClick }: DomainDetailsViewProps): React.ReactElement {
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

  const [editingSection, setEditingSection] = React.useState<string | null>(null);
  const [editValue, setEditValue] = React.useState('');
  const [activeTab, setActiveTab] = React.useState<'sections' | 'summaries'>('sections');

  const handleSaveEdit = (e: React.FormEvent, originalKey: string) => {
      e.preventDefault();
      // NOTE: Storage integration will be done in the next task
      console.log('Saved label for', originalKey, '->', editValue);
      setEditingSection(null);
  };

  const { highlights, isLoading } = useHighlightsByDomain(domain);
  const summary = useGenerateSummary();

  const sections = useMemo(() => {
    const map = new Map<string, number>();
    highlights.forEach((h) => {
      let sectionKey = h.path || '/';
      try {
        const url = new URL(h.url);
        const parsedTld = parse(url.hostname);
        const subdomain = parsedTld.subdomain;
        if (subdomain && subdomain !== 'www') {
           sectionKey = `${subdomain} · ${sectionKey}`;
        }
      } catch (e) {
        // ignore invalid urls
      }
      map.set(sectionKey, (map.get(sectionKey) || 0) + 1);
    });
    return Array.from(map.entries())
      .map(([path, count]) => ({ path, count }))
      .sort((a, b) => b.count - a.count);
  }, [highlights]);

  // onBack is still required on the interface for callers passing it to the shell's ModeHeader
  // _onBack is intentionally unused in the body-only version


  const handleSectionClick = (section: string): void => {
    if (onSectionClick) {
      onSectionClick(domain, section);
    } else {
      navigate(`/domain/${domain}/section/${encodeURIComponent(section)}`);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <div style={{ padding: '10px 16px 0' }}>
        <div className="u-serif" style={{ fontSize: 22, fontStyle: 'italic', letterSpacing: '-0.015em' }}>
          {domain}
        </div>
        <div style={{ display: 'flex', gap: 16, marginTop: 12, borderBottom: '1px solid var(--rule-soft)', paddingBottom: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('sections')}
            className="u-mono"
            style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
              color: activeTab === 'sections' ? 'var(--ink)' : 'var(--ink-3)'
            }}
          >
            Sections
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('summaries')}
            className="u-mono"
            style={{
              all: 'unset', cursor: 'pointer', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.14em',
              color: activeTab === 'summaries' ? 'var(--ink)' : 'var(--ink-3)'
            }}
          >
            Summaries
          </button>
        </div>
      </div>

      <div className="list-scroll" style={{ marginTop: 10, flex: 1, overflowY: 'auto', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ padding: '20px 16px', textAlign: 'center' }}>
            <span className="u-mono" style={{ fontSize: 10, color: 'var(--ink-3)' }}>Loading...</span>
          </div>
        ) : activeTab === 'sections' ? (
          sections.map((s) => (
            editingSection === s.path ? (
               <form key={s.path} onSubmit={(e) => handleSaveEdit(e, s.path)} style={{ padding: '12px 16px', display: 'flex', gap: 8 }}>
                   <input 
                      autoFocus 
                      value={editValue} 
                      onChange={(e) => setEditValue(e.target.value)}
                      onBlur={() => setEditingSection(null)}
                      style={{ flex: 1, padding: '4px 8px', background: 'transparent', border: '1px solid var(--rule)', color: 'var(--ink)' }}
                   />
               </form>
            ) : (
            <Row
              key={s.path}
              title={s.path === '/' ? 'Home' : s.path}
              right={
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <button 
                     onClick={(e) => { e.stopPropagation(); setEditingSection(s.path); setEditValue(s.path); }}
                     style={{ all: 'unset', cursor: 'pointer', fontSize: 12, color: 'var(--accent)' }}
                  >
                     [edit]
                  </button>
                  <span className="u-serif" style={{ fontSize: 16, fontStyle: 'italic', color: 'var(--ink-3)' }}>
                    {s.count}
                  </span>
                </div>
              }
              onClick={() => handleSectionClick(s.path)}
            />
            )
          ))
        ) : (
          <div style={{ padding: '16px' }}>
            <button
              type="button"
              onClick={() => summary.start({
                pageTitle: domain,
                pageUrl: '',
                pageContextWithMarks: '',
                pageContext: '',
                highlights: highlights.map(h => ({ id: h.id, text: h.text, url: h.url, title: domain })),
                domain,
                uniqueUrls: new Set(highlights.map(h => h.url)).size,
                length: 'long',
              })}
              disabled={summary.status === 'streaming' || highlights.length === 0}
              style={{
                font: 'var(--sans)', fontSize: 'var(--step--1)',
                padding: '6px 10px', background: 'var(--paper)', color: 'var(--ink)',
                border: '1px solid var(--rule)', cursor: summary.status === 'streaming' ? 'wait' : 'pointer',
                opacity: highlights.length === 0 ? 0.5 : 1,
              }}
            >
              Generate AI Summary
            </button>
            <div className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', marginTop: 8 }}>
              Creates a temporary summary of your highlights below.
            </div>

            {summary.status !== 'idle' && (
              <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 8, padding: 12, background: 'var(--paper-2)', borderRadius: 4, border: '1px solid var(--rule-soft)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="u-mono" style={{ color: (summary.status === 'streaming' || summary.status === 'done') ? 'var(--accent)' : 'var(--ink-3)' }}>
                    {summary.status === 'done' || summary.chunks ? '✓' : '◯'}
                  </span>
                  <span className="u-sans" style={{ fontSize: 'var(--step--1)', color: (summary.status === 'streaming' || summary.status === 'done') ? 'var(--ink)' : 'var(--ink-3)' }}>
                    Connecting to AI provider...
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="u-mono" style={{ color: summary.chunks ? 'var(--accent)' : 'var(--ink-3)' }}>
                    {summary.status === 'done' ? '✓' : summary.chunks ? '◯' : '·'}
                  </span>
                  <span className="u-sans" style={{ fontSize: 'var(--step--1)', color: summary.chunks ? 'var(--ink)' : 'var(--ink-3)' }}>
                    Reading highlights and generating summary...
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span className="u-mono" style={{ color: summary.status === 'done' ? 'var(--accent)' : 'var(--ink-3)' }}>
                    {summary.status === 'done' ? '✓' : '·'}
                  </span>
                  <span className="u-sans" style={{ fontSize: 'var(--step--1)', color: summary.status === 'done' ? 'var(--ink)' : 'var(--ink-3)' }}>
                    Summary complete
                  </span>
                </div>
              </div>
            )}

            {summary.chunks && (
              <div
                role="status"
                aria-live="polite"
                style={{
                  marginTop: 16, padding: 12, whiteSpace: 'pre-wrap',
                  font: 'var(--sans)', fontSize: 'var(--step--1)', color: 'var(--ink)',
                  border: '1px solid var(--rule)',
                }}
              >
                {summary.chunks}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
