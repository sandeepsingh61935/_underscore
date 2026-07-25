import React, { type ReactNode } from 'react';

export interface SetupSectionProps {
  index: number;
  label: string;
  children: ReactNode;
}

/** Numbered section header ("1 · CONNECT") that encodes the real setup sequence. */
export function SetupSection({ index, label, children }: SetupSectionProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div className="u-kicker" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <span style={{ color: 'var(--accent)' }}>{index}</span>
        <span>·</span>
        <span>{label}</span>
      </div>
      {children}
    </div>
  );
}
