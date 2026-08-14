/**
 * Place-based Ask navigator: projects + domains + sections (no global thread list).
 */
import React, { useState } from 'react';

import {
  placeLabel,
  summarizeMembers,
  type ChatProject,
  type Place,
} from '@/shared/chat';
import type { WebDomainNode } from '@/web/hooks/useWebLibrary';

function placeKey(p: Place): string {
  if (p.type === 'domain') return `d:${p.domain}`;
  if (p.type === 'section') return `s:${p.domain}:${p.sectionKey}`;
  return `p:${p.projectId}`;
}

function placesMatch(a: Place | null, b: Place): boolean {
  if (!a) return false;
  if (a.type !== b.type) return false;
  if (a.type === 'domain' && b.type === 'domain') return a.domain === b.domain;
  if (a.type === 'section' && b.type === 'section') {
    return a.domain === b.domain && a.sectionKey === b.sectionKey;
  }
  if (a.type === 'project' && b.type === 'project') {
    return a.projectId === b.projectId;
  }
  return false;
}

export function AskPlaceRail({
  domains,
  projects,
  activePlace,
  busy,
  onSelectPlace,
  onCreateProject,
  onClearChat,
  onDeleteProject,
}: {
  domains: WebDomainNode[];
  projects: ChatProject[];
  activePlace: Place | null;
  busy: boolean;
  onSelectPlace: (place: Place) => void;
  onCreateProject: () => void;
  onClearChat: () => void;
  onDeleteProject: (projectId: string) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (activePlace?.type === 'section' || activePlace?.type === 'domain') {
      return { [activePlace.domain]: true };
    }
    return {};
  });

  return (
    <>
      <div className="ask-projects-head">
        <h1 data-od-id="ask-title">Ask</h1>
        <p
          className="composer-note"
          style={{ marginTop: 6, marginBottom: 0, fontSize: 11 }}
        >
          One chat per domain, section, or project
        </p>
        <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            className="btn ghost sm"
            data-od-id="ask-new-project"
            data-testid="ask-new-project"
            disabled={busy}
            onClick={onCreateProject}
          >
            New project
          </button>
          <button
            type="button"
            className="btn ghost sm"
            data-od-id="ask-clear-chat"
            data-testid="ask-clear-chat"
            disabled={busy || !activePlace}
            onClick={onClearChat}
          >
            Clear chat
          </button>
        </div>
      </div>

      <div data-od-id="ask-place-list" style={{ padding: '0 8px' }}>
        <p
          className="u-kicker"
          style={{ margin: '12px 6px 8px', color: 'var(--ink-3)' }}
        >
          Projects
        </p>
        {projects.length === 0 ? (
          <p className="composer-note" style={{ padding: '0 6px' }}>
            Multi-domain bags live here.
          </p>
        ) : (
          <ul className="ask-thread-list" aria-label="Projects">
            {projects.map((p) => {
              const place: Place = { type: 'project', projectId: p.id };
              const active = placesMatch(activePlace, place);
              return (
                <li key={p.id} className="ask-thread-row">
                  <button
                    type="button"
                    className={`tree-item ask-thread-item${active ? ' active' : ''}`}
                    data-od-id={`ask-place-project-${p.id}`}
                    data-testid={`ask-place-project-${p.id}`}
                    aria-current={active ? 'true' : undefined}
                    disabled={busy}
                    onClick={() => onSelectPlace(place)}
                  >
                    <span className="tree-label">{p.title}</span>
                    <span
                      className="u-mono"
                      style={{
                        display: 'block',
                        fontSize: 10,
                        color: 'var(--ink-3)',
                        marginTop: 2,
                      }}
                    >
                      {summarizeMembers(p.members)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="ask-thread-delete"
                    aria-label={`Delete ${p.title}`}
                    disabled={busy}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onDeleteProject(p.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        <p
          className="u-kicker"
          style={{ margin: '16px 6px 8px', color: 'var(--ink-3)' }}
        >
          Domains
        </p>
        {domains.length === 0 ? (
          <p className="composer-note" style={{ padding: '0 6px' }}>
            Highlight sites appear here.
          </p>
        ) : (
          <ul className="ask-thread-list" aria-label="Domains">
            {domains.map((d) => {
              const domainPlace: Place = { type: 'domain', domain: d.domain };
              const domainActive = placesMatch(activePlace, domainPlace);
              const open = !!expanded[d.domain];
              const sections = d.sections ?? [];
              return (
                <li key={placeKey(domainPlace)} style={{ listStyle: 'none' }}>
                  <div className="ask-thread-row">
                    {sections.length > 0 ? (
                      <button
                        type="button"
                        className="tree-toggle"
                        aria-expanded={open}
                        aria-label={`${open ? 'Collapse' : 'Expand'} ${d.domain}`}
                        disabled={busy}
                        onClick={() =>
                          setExpanded((prev) => ({
                            ...prev,
                            [d.domain]: !prev[d.domain],
                          }))
                        }
                        style={{ marginRight: 2 }}
                      >
                        {open ? '▾' : '▸'}
                      </button>
                    ) : (
                      <span style={{ width: 14, display: 'inline-block' }} />
                    )}
                    <button
                      type="button"
                      className={`tree-item ask-thread-item${domainActive ? ' active' : ''}`}
                      data-od-id={`ask-place-domain-${d.domain}`}
                      data-testid={`ask-place-domain-${d.domain}`}
                      aria-current={domainActive ? 'true' : undefined}
                      disabled={busy}
                      onClick={() => onSelectPlace(domainPlace)}
                    >
                      <span className="tree-label">
                        {placeLabel(domainPlace)}
                        <span
                          className="u-mono"
                          style={{ color: 'var(--ink-3)', marginLeft: 6 }}
                        >
                          {d.count}
                        </span>
                      </span>
                    </button>
                  </div>
                  {open && sections.length > 0 ? (
                    <ul
                      className="ask-thread-list"
                      aria-label={`Sections of ${d.domain}`}
                      style={{ paddingLeft: 18 }}
                    >
                      {sections.map((s) => {
                        const sectionPlace: Place = {
                          type: 'section',
                          domain: d.domain,
                          sectionKey: s.path,
                        };
                        const sectionActive = placesMatch(
                          activePlace,
                          sectionPlace,
                        );
                        return (
                          <li key={placeKey(sectionPlace)} className="ask-thread-row">
                            <button
                              type="button"
                              className={`tree-item ask-thread-item${sectionActive ? ' active' : ''}`}
                              data-od-id={`ask-place-section-${d.domain}-${s.path}`}
                              data-testid={`ask-place-section-${d.domain}-${s.path}`}
                              aria-current={sectionActive ? 'true' : undefined}
                              disabled={busy}
                              onClick={() => onSelectPlace(sectionPlace)}
                            >
                              <span className="tree-label">
                                {s.path || '/'}
                                <span
                                  className="u-mono"
                                  style={{
                                    color: 'var(--ink-3)',
                                    marginLeft: 6,
                                  }}
                                >
                                  {s.count}
                                </span>
                              </span>
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </>
  );
}
