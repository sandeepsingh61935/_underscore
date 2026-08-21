/**
 * Compact topic chips for popup Settings (scroll-to-section).
 */
import React from 'react';

import type { SettingsTopicDef } from '@/shared/settings/settings-topic-ia';

export type SettingsTopicNavProps = {
  topics: SettingsTopicDef[];
  activeId?: string | null;
  onSelect: (id: string) => void;
};

export function SettingsTopicNav({
  topics,
  activeId,
  onSelect,
}: SettingsTopicNavProps): React.ReactElement {
  return (
    <nav
      data-testid="settings-topic-nav"
      aria-label="Settings sections"
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: 6,
        padding: '4px 16px 10px',
        borderBottom: '1px solid var(--rule-soft)',
        position: 'sticky',
        top: 0,
        zIndex: 2,
        background: 'var(--paper)',
      }}
    >
      {topics.map((t) => {
        const active = t.id === activeId;
        return (
          <button
            key={t.id}
            type="button"
            className="u-mono"
            aria-current={active ? 'true' : undefined}
            onClick={() => onSelect(t.id)}
            style={{
              all: 'unset',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              minHeight: 26,
              padding: '0 8px',
              border: `1px solid ${active ? 'var(--ink)' : 'var(--rule-soft)'}`,
              fontSize: 'var(--step--2)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: active ? 'var(--ink)' : 'var(--ink-3)',
              background: active ? 'var(--paper-2)' : 'transparent',
            }}
          >
            {t.label}
          </button>
        );
      })}
    </nav>
  );
}
