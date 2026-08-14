/**
 * Place-based Ask navigator:
 * - Library-style domain → page tree (open place chat on click)
 * - Projects as bags; add domains/pages via menu or drag-and-drop
 */
import React, { useCallback, useEffect, useRef, useState } from 'react';

import {
  hasMember,
  memberToLabel,
  membersEqual,
  parseMemberDrag,
  placeToMember,
  PROJECT_MEMBER_DRAG_TYPE,
  serializeMemberDrag,
  placeLabel,
  summarizeMembers,
  type ChatProject,
  type Place,
  type ProjectMember,
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

function memberKey(m: ProjectMember): string {
  return m.kind === 'domain'
    ? `d:${m.domain}`
    : `s:${m.domain}:${m.sectionKey}`;
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
  onAddMember,
  onRemoveMember,
}: {
  domains: WebDomainNode[];
  projects: ChatProject[];
  activePlace: Place | null;
  busy: boolean;
  onSelectPlace: (place: Place) => void;
  onCreateProject: () => void;
  onClearChat: () => void;
  onDeleteProject: (projectId: string) => void;
  /** Add domain/page to a project (idempotent). */
  onAddMember: (projectId: string, member: ProjectMember) => void;
  onRemoveMember: (projectId: string, member: ProjectMember) => void;
}): React.ReactElement {
  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    if (activePlace?.type === 'section' || activePlace?.type === 'domain') {
      return { [activePlace.domain]: true };
    }
    return {};
  });
  const [menuFor, setMenuFor] = useState<ProjectMember | null>(null);
  const [dropOverId, setDropOverId] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!menuFor) return;
    const onDoc = (ev: MouseEvent): void => {
      if (!menuRef.current?.contains(ev.target as Node)) {
        setMenuFor(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuFor]);

  const activeProjectId =
    activePlace?.type === 'project' ? activePlace.projectId : null;
  const activeProject =
    projects.find((p) => p.id === activeProjectId) ?? null;

  const startDrag = useCallback(
    (ev: React.DragEvent, member: ProjectMember) => {
      if (busy) {
        ev.preventDefault();
        return;
      }
      ev.dataTransfer.setData(
        PROJECT_MEMBER_DRAG_TYPE,
        serializeMemberDrag(member),
      );
      ev.dataTransfer.setData('text/plain', memberToLabel(member));
      ev.dataTransfer.effectAllowed = 'copy';
    },
    [busy],
  );

  const onProjectDragOver = useCallback(
    (ev: React.DragEvent, projectId: string) => {
      if (busy) return;
      if (
        !ev.dataTransfer.types.includes(PROJECT_MEMBER_DRAG_TYPE) &&
        !ev.dataTransfer.types.includes('text/plain')
      ) {
        return;
      }
      ev.preventDefault();
      ev.dataTransfer.dropEffect = 'copy';
      setDropOverId(projectId);
    },
    [busy],
  );

  const onProjectDrop = useCallback(
    (ev: React.DragEvent, projectId: string) => {
      ev.preventDefault();
      setDropOverId(null);
      if (busy) return;
      const raw =
        ev.dataTransfer.getData(PROJECT_MEMBER_DRAG_TYPE) ||
        ev.dataTransfer.getData('text/plain');
      const member = parseMemberDrag(raw);
      if (!member) return;
      onAddMember(projectId, member);
    },
    [busy, onAddMember],
  );

  const addMenu = (member: ProjectMember): React.ReactElement | null => {
    if (!menuFor || !membersEqual(menuFor, member)) return null;

    return (
      <div
        ref={menuRef}
        className="ask-add-menu"
        data-od-id="ask-add-to-project-menu"
        data-testid="ask-add-to-project-menu"
        style={{
          position: 'absolute',
          right: 0,
          top: '100%',
          zIndex: 20,
          minWidth: 160,
          background: 'var(--paper)',
          border: '1px solid var(--rule)',
          boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
          padding: 4,
        }}
      >
        <p
          className="u-mono"
          style={{
            fontSize: 10,
            color: 'var(--ink-3)',
            padding: '4px 8px',
            margin: 0,
          }}
        >
          Add to project
        </p>
        {projects.length === 0 ? (
          <p className="composer-note" style={{ padding: '4px 8px', margin: 0 }}>
            Create a project first.
          </p>
        ) : (
          projects.map((p) => {
            const already = hasMember(p.members, member);
            return (
              <button
                key={p.id}
                type="button"
                className="tree-item"
                style={{
                  width: '100%',
                  textAlign: 'left',
                  opacity: already ? 0.5 : 1,
                }}
                disabled={busy || already}
                data-testid={`ask-add-to-${p.id}`}
                onClick={() => {
                  if (!already) onAddMember(p.id, member);
                  setMenuFor(null);
                }}
              >
                {p.title}
                {already ? ' · added' : ''}
              </button>
            );
          })
        )}
      </div>
    );
  };

  const rowActions = (member: ProjectMember): React.ReactElement => (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <button
        type="button"
        className="btn ghost sm"
        style={{ fontSize: 11, padding: '2px 6px', minHeight: 28 }}
        disabled={busy || projects.length === 0}
        title="Add to project"
        aria-label={`Add ${memberToLabel(member)} to project`}
        data-testid={`ask-add-btn-${memberKey(member)}`}
        onClick={(ev) => {
          ev.stopPropagation();
          setMenuFor((cur) =>
            cur && membersEqual(cur, member) ? null : member,
          );
        }}
      >
        + Project
      </button>
      {addMenu(member)}
    </div>
  );

  return (
    <>
      <div className="ask-projects-head">
        <h1 data-od-id="ask-title">Ask</h1>
        <p
          className="composer-note"
          style={{ marginTop: 6, marginBottom: 0, fontSize: 11 }}
        >
          Open a domain or page for its chat. Drag onto a project, or use +
          Project.
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
        {/* ---- Projects (drop targets) ---- */}
        <p
          className="u-kicker"
          style={{ margin: '12px 6px 8px', color: 'var(--ink-3)' }}
        >
          Projects
        </p>
        {projects.length === 0 ? (
          <p className="composer-note" style={{ padding: '0 6px' }}>
            Create a project, then drag domains or pages onto it.
          </p>
        ) : (
          <ul className="ask-thread-list" aria-label="Projects">
            {projects.map((p) => {
              const place: Place = { type: 'project', projectId: p.id };
              const active = placesMatch(activePlace, place);
              const over = dropOverId === p.id;
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
                    onDragOver={(ev) => onProjectDragOver(ev, p.id)}
                    onDragLeave={() =>
                      setDropOverId((id) => (id === p.id ? null : id))
                    }
                    onDrop={(ev) => onProjectDrop(ev, p.id)}
                    style={
                      over
                        ? {
                            outline: '2px solid var(--accent)',
                            outlineOffset: 2,
                          }
                        : undefined
                    }
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
                      {over ? ' · drop to add' : ''}
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

        {/* Active project members */}
        {activeProject ? (
          <div
            data-od-id="ask-project-members"
            data-testid="ask-project-members"
            style={{ padding: '8px 6px 4px' }}
          >
            <p
              className="u-kicker"
              style={{ margin: '0 0 6px', color: 'var(--ink-3)' }}
            >
              In this project
            </p>
            {activeProject.members.length === 0 ? (
              <p className="composer-note" style={{ margin: 0 }}>
                Empty — drag a domain or page here, or use + Project on a row.
              </p>
            ) : (
              <ul className="ask-thread-list" aria-label="Project members">
                {activeProject.members.map((m) => (
                  <li key={memberKey(m)} className="ask-thread-row">
                    <span
                      className="tree-label"
                      style={{ flex: 1, fontSize: 12, padding: '6px 4px' }}
                    >
                      {memberToLabel(m)}
                    </span>
                    <button
                      type="button"
                      className="ask-thread-delete"
                      aria-label={`Remove ${memberToLabel(m)}`}
                      data-testid={`ask-remove-member-${memberKey(m)}`}
                      disabled={busy}
                      onClick={() => onRemoveMember(activeProject.id, m)}
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : null}

        {/* ---- Library tree: domains → pages ---- */}
        <p
          className="u-kicker"
          style={{ margin: '16px 6px 8px', color: 'var(--ink-3)' }}
        >
          Library
        </p>
        {domains.length === 0 ? (
          <p className="composer-note" style={{ padding: '0 6px' }}>
            Highlight sites appear here.
          </p>
        ) : (
          <ul className="ask-thread-list" aria-label="Library domains">
            {domains.map((d) => {
              const domainPlace: Place = { type: 'domain', domain: d.domain };
              const domainMember = placeToMember(domainPlace)!;
              const domainActive = placesMatch(activePlace, domainPlace);
              const open = !!expanded[d.domain];
              const sections = d.sections ?? [];
              return (
                <li key={placeKey(domainPlace)} style={{ listStyle: 'none' }}>
                  <div
                    className="ask-thread-row"
                    style={{ alignItems: 'center', gap: 4 }}
                  >
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
                        style={{ marginRight: 2, flexShrink: 0 }}
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
                      draggable={!busy}
                      onDragStart={(ev) => startDrag(ev, domainMember)}
                      onClick={() => onSelectPlace(domainPlace)}
                      style={{ flex: 1, minWidth: 0, cursor: 'grab' }}
                      title="Click to chat · drag onto a project"
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
                    {rowActions(domainMember)}
                  </div>
                  {open && sections.length > 0 ? (
                    <ul
                      className="ask-thread-list"
                      aria-label={`Pages of ${d.domain}`}
                      style={{ paddingLeft: 18 }}
                    >
                      {sections.map((s) => {
                        const sectionPlace: Place = {
                          type: 'section',
                          domain: d.domain,
                          sectionKey: s.path,
                        };
                        const sectionMember = placeToMember(sectionPlace)!;
                        const sectionActive = placesMatch(
                          activePlace,
                          sectionPlace,
                        );
                        return (
                          <li
                            key={placeKey(sectionPlace)}
                            className="ask-thread-row"
                            style={{ alignItems: 'center', gap: 4 }}
                          >
                            <button
                              type="button"
                              className={`tree-item ask-thread-item${sectionActive ? ' active' : ''}`}
                              data-od-id={`ask-place-section-${d.domain}-${s.path}`}
                              data-testid={`ask-place-section-${d.domain}-${s.path}`}
                              aria-current={sectionActive ? 'true' : undefined}
                              disabled={busy}
                              draggable={!busy}
                              onDragStart={(ev) =>
                                startDrag(ev, sectionMember)
                              }
                              onClick={() => onSelectPlace(sectionPlace)}
                              style={{ flex: 1, minWidth: 0, cursor: 'grab' }}
                              title="Click to chat · drag onto a project"
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
                            {rowActions(sectionMember)}
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
