import React from 'react';

import { StatusDot } from '../StatusDot';

export type ConnectionDatelineState = 'connected' | 'offline' | 'checking';

export interface ConnectionDatelineProps {
  state: ConnectionDatelineState;
  /** e.g. "12 models" or "check endpoint" — rendered upper-case after the state label. */
  detail: string;
}

const STATE_LABEL: Record<ConnectionDatelineState, string> = {
  connected: 'Connected',
  offline: 'Offline',
  checking: 'Checking',
};

/** Signature status rail between credentials and the model catalog. */
export function ConnectionDateline({
  state,
  detail,
}: ConnectionDatelineProps): React.ReactElement {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '2px 0' }}>
      <StatusDot connected={state === 'connected'} pending={state === 'checking'} />
      <span
        className="u-mono"
        style={{
          fontSize: 'var(--step--2)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          color: state === 'connected' ? 'var(--ink)' : 'var(--ink-3)',
          whiteSpace: 'nowrap',
        }}
      >
        {STATE_LABEL[state]} · {detail}
      </span>
      <div aria-hidden style={{ flex: 1, height: 1, background: 'var(--rule-soft)' }} />
    </div>
  );
}
