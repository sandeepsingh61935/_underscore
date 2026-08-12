import React from 'react';

import type { ChatThread } from '@/shared/chat';

export function AskThreadSidebar({
  threads,
  activeThreadId,
  busy,
  onNewThread,
  onSelectThread,
  onDeleteThread,
}: {
  threads: ChatThread[];
  activeThreadId: string | null;
  busy: boolean;
  onNewThread: () => void;
  onSelectThread: (id: string) => void;
  onDeleteThread: (id: string) => void;
}): React.ReactElement {
  return (
    <>
      <div className="ask-projects-head">
        <h1 data-od-id="ask-title">Chat</h1>
        <button
          type="button"
          className="btn ghost sm"
          data-od-id="ask-new-thread"
          style={{ marginTop: 8 }}
          disabled={busy}
          onClick={onNewThread}
        >
          New chat
        </button>
      </div>

      <div data-od-id="ask-thread-list" style={{ padding: '0 8px' }}>
        {threads.length > 0 ? (
          <ul className="ask-thread-list" aria-label="Chats">
            {threads.map((t) => {
              const active = t.id === activeThreadId;
              return (
                <li key={t.id} className="ask-thread-row">
                  <button
                    type="button"
                    className={`tree-item ask-thread-item${active ? ' active' : ''}`}
                    data-od-id={`ask-thread-${t.id}`}
                    aria-current={active ? 'true' : undefined}
                    disabled={busy}
                    onClick={() => onSelectThread(t.id)}
                  >
                    <span className="tree-label">{t.title}</span>
                  </button>
                  <button
                    type="button"
                    className="ask-thread-delete"
                    data-od-id={`ask-thread-delete-${t.id}`}
                    aria-label={`Delete ${t.title}`}
                    disabled={busy}
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onDeleteThread(t.id);
                    }}
                  >
                    ×
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="composer-note" style={{ padding: '0 6px' }}>
            No saved chats yet.
          </p>
        )}
      </div>
    </>
  );
}
