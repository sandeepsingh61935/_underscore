import React from 'react';

import type { ChatMessage } from '@/shared/chat';

export function AskTranscript({
  messages,
  streamText,
  inflightAssistantId,
  busy,
  streamError,
  onAbort,
}: {
  messages: ChatMessage[];
  streamText: string;
  inflightAssistantId: string | null;
  busy: boolean;
  streamError: string | null;
  onAbort: () => void;
}): React.ReactElement {
  if (messages.length === 0 && !busy) {
    return (
      <div className="ask-quiet" data-od-id="ask-empty">
        <span>Ask grounded questions about your library.</span>
      </div>
    );
  }

  return (
    <div className="ask-thread" data-od-id="ask-transcript">
      {messages.map((m) => {
        if (m.role === 'user') {
          return (
            <div key={m.id} className="bubble-user" data-od-id="ask-user-bubble">
              {m.content}
            </div>
          );
        }
        const body =
          m.status === 'streaming' && inflightAssistantId === m.id
            ? streamText || m.content
            : m.content;
        return (
          <div
            key={m.id}
            className="bubble-ai"
            data-od-id="ask-answer"
            data-status={m.status}
          >
            {m.status === 'streaming' && !body ? (
              <span data-od-id="ask-streaming" aria-live="polite">
                …
              </span>
            ) : (
              <span style={{ whiteSpace: 'pre-wrap' }}>{body}</span>
            )}
            {m.status === 'failed' ? (
              <p className="composer-note" style={{ marginTop: 8 }}>
                Failed{streamError ? `: ${streamError}` : ''}
              </p>
            ) : null}
          </div>
        );
      })}
      {busy ? (
        <button
          type="button"
          className="btn ghost sm"
          data-od-id="ask-abort"
          style={{ alignSelf: 'flex-start' }}
          onClick={onAbort}
        >
          Stop
        </button>
      ) : null}
    </div>
  );
}
