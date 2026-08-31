import { Clock, Hash } from 'lucide-react';
import React from 'react';

import { Text } from '../../../ui-system/components/primitives/Text';

export interface CollectionCardProps {
  id: string;
  domain: string;
  count: number;
  lastActive?: Date;
  onClick?: () => void;
  isActive?: boolean;
}

export function CollectionCard({
  domain,
  count,
  lastActive,
  onClick,
  isActive,
}: CollectionCardProps): React.JSX.Element {
  return (
    <div
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      style={{
        cursor: 'pointer',
        borderRadius: 'var(--radius)',
        border: isActive ? '1px solid var(--accent)' : '1px solid var(--rule)',
        padding: '12px 16px',
        background: isActive ? 'var(--paper-2)' : 'var(--paper)',
        transition: 'border-color 0.15s ease, background 0.15s ease',
        minHeight: '44px',
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'start',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <Text
          variant="h3"
          className="u-serif"
          style={{
            flex: 1,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {domain}
        </Text>
      </div>

      <div
        style={{ display: 'flex', alignItems: 'center', gap: 16, color: 'var(--ink-3)' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Hash size={13} />
          <Text variant="tiny">{count}</Text>
        </div>

        {lastActive && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Clock size={13} />
            <Text variant="tiny">
              {lastActive.toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </Text>
          </div>
        )}
      </div>
    </div>
  );
}
