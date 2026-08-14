import React, { useCallback, useState } from 'react';

import { scopesEqual, type ChatScope } from '@/shared/chat';
import type { WebDomainNode } from '@/web/hooks/useWebLibrary';

export function AskGroundingTree({
  domains,
  scope,
  locked,
  busy,
  onSelectScope,
}: {
  domains: WebDomainNode[];
  scope: ChatScope;
  /** When true (open thread), selection starts a new chat intent via parent. */
  locked: boolean;
  busy: boolean;
  onSelectScope: (scope: ChatScope) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (scope.kind === 'domain' || scope.kind === 'section') {
      return { [scope.domain]: true };
    }
    return {};
  });

  const toggleDomain = useCallback((domain: string) => {
    setExpanded((prev) => ({ ...prev, [domain]: !prev[domain] }));
  }, []);

  const pick = useCallback(
    (next: ChatScope) => {
      if (busy) return;
      if (next.kind === 'domain' || next.kind === 'section') {
        setExpanded((prev) => ({ ...prev, [next.domain]: true }));
      }
      onSelectScope(next);
    },
    [busy, onSelectScope],
  );

  const libraryActive = scope.kind === 'library' && !locked;

  return (
    <div data-od-id="ask-grounding-tree">
      <p
        className="u-kicker"
        style={{ margin: '16px 6px 8px', color: 'var(--ink-3)' }}
      >
        Grounding
      </p>
      <div role="tree" aria-label="Grounding">
        <div className="tree-row">
          <span className="tree-chev-slot" aria-hidden="true" />
          <button
            type="button"
            className={`tree-item${libraryActive ? ' active' : ''}`}
            data-od-id="ask-proj-all"
            role="treeitem"
            aria-selected={scope.kind === 'library'}
            disabled={busy}
            onClick={() => pick({ kind: 'library' })}
          >
            <span className="folder-ico" aria-hidden="true">
              ◈
            </span>
            <span className="tree-label">Library</span>
          </button>
        </div>

        {domains.map((d) => {
          const open = !!expanded[d.domain];
          const activeDom =
            scope.kind === 'domain' && scope.domain === d.domain;
          const domId = d.domain.replace(/\./g, '-');
          return (
            <div key={d.domain} className="tree-group" data-tree-group={d.domain}>
              <div className="tree-row">
                <button
                  type="button"
                  className={`tree-toggle${open ? ' open' : ''}`}
                  aria-label={`${open ? 'Collapse' : 'Expand'} ${d.domain}`}
                  aria-expanded={open}
                  onClick={() => toggleDomain(d.domain)}
                >
                  <svg
                    className="tree-chevron"
                    width="12"
                    height="12"
                    viewBox="0 0 12 12"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 2.5 8 6 4 9.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`tree-item${activeDom ? ' active' : ''}`}
                  data-od-id={`ask-proj-${domId}`}
                  role="treeitem"
                  aria-selected={activeDom}
                  disabled={busy}
                  onClick={() => pick({ kind: 'domain', domain: d.domain })}
                >
                  <span className="folder-ico" aria-hidden="true">
                    {d.domain.slice(0, 1)}
                  </span>
                  <span className="tree-label">{d.domain}</span>
                </button>
              </div>
              <div
                className={`tree-children${open ? ' is-open' : ''}`}
                data-tree-children
              >
                <div className="tree-children-inner">
                  {d.sections.map((s) => {
                    const sectionScope: ChatScope = {
                      kind: 'section',
                      domain: d.domain,
                      sectionKey: s.path,
                    };
                    const activeSec = scopesEqual(scope, sectionScope);
                    return (
                      <button
                        key={s.path}
                        type="button"
                        className={`tree-item is-child${activeSec ? ' active' : ''}`}
                        role="treeitem"
                        aria-selected={activeSec}
                        disabled={busy}
                        onClick={() => pick(sectionScope)}
                      >
                        <span className="tree-label">{s.path}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
