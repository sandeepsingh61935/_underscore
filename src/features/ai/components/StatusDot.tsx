import React from 'react';

export interface StatusDotProps {
  connected: boolean;
  pending?: boolean;
}

export function StatusDot({ connected, pending = false }: StatusDotProps): React.ReactElement {
  const color = pending ? 'var(--ink-3)' : connected ? 'var(--accent)' : 'var(--ink-4)';
  return (
    <span
      aria-hidden
      style={{
        width: 8,
        height: 8,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        flexShrink: 0,
      }}
    />
  );
}
