import React from 'react';
import { useNavigate } from 'react-router-dom';

import { AskModelChip } from '@/features/ai/components/AskModelChip';
import { scopeLabel, type ChatScope } from '@/shared/chat';
import type { ProviderName } from '@/shared/interfaces/i-llm-service';
import { buildSettingsSearch } from '@/web/routing/settingsTab';

function placeholderFor(scope: ChatScope): string {
  if (scope.kind === 'section') return 'Chat this section…';
  if (scope.kind === 'domain') return 'Chat this domain…';
  return 'Chat your library…';
}

export function AskComposer({
  scope,
  groundCount,
  draft,
  onDraftChange,
  busy,
  needsKey,
  error,
  modelOptions,
  activeProvider,
  activeLabel,
  selectError,
  onSelectProvider,
  onSubmit,
}: {
  scope: ChatScope;
  groundCount: number;
  draft: string;
  onDraftChange: (value: string) => void;
  busy: boolean;
  needsKey: boolean;
  error: string | null;
  modelOptions: Parameters<typeof AskModelChip>[0]['options'];
  activeProvider: ProviderName | null;
  activeLabel: string;
  selectError: string | null;
  onSelectProvider: (p: ProviderName) => void;
  onSubmit: () => void;
}): React.ReactElement {
  const navigate = useNavigate();
  const aiSettingsHref = `/settings?${buildSettingsSearch('ai')}`;

  return (
    <form
      className="ask-composer"
      data-od-id="ask-composer"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit();
      }}
    >
      <div className="ask-composer-inner">
        <div
          className="scope-pill"
          data-od-id="ask-ground"
          title="Answers use only this scope"
        >
          <span>{scopeLabel(scope)}</span>
          <span className="n">{groundCount}</span>
        </div>
        <div className="composer-note" data-od-id="ask-model-label">
          <AskModelChip
            options={modelOptions}
            activeProvider={activeProvider}
            activeLabel={needsKey ? 'Add provider' : activeLabel}
            onSelect={onSelectProvider}
            onManage={() => {
              navigate(aiSettingsHref);
            }}
            emptyCta="Add provider"
            manageLabel="Manage"
            selectError={selectError}
          />
        </div>
        <div className="composer-shell">
          <textarea
            id="ask-input"
            data-od-id="ask-input"
            rows={1}
            placeholder={
              needsKey ? 'Add a model key to chat…' : placeholderFor(scope)
            }
            aria-label="Question"
            value={draft}
            disabled={busy}
            onChange={(e) => onDraftChange(e.target.value)}
          />
          <button
            type="submit"
            className="ask-send-btn"
            data-od-id="ask-send"
            aria-label="Send question"
            disabled={!draft.trim() || busy || needsKey}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M12 19V5" />
              <path d="m5 12 7-7 7 7" />
            </svg>
          </button>
        </div>
        {error ? (
          <p
            className="composer-note"
            data-od-id="ask-stream-error"
            role="alert"
            style={{ color: 'var(--ink-2)', marginTop: 8 }}
          >
            {error}
          </p>
        ) : null}
      </div>
    </form>
  );
}
