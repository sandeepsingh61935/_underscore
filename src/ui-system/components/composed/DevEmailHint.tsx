import React from 'react';

const INBUCKET_URL = 'http://127.0.0.1:54324';

/**
 * Dev-only helper shown on OTP screens (verify email, forgot/reset password).
 *
 * Local `supabase start` captures confirmation/recovery emails in Inbucket
 * instead of delivering them to a real inbox (Gmail, etc.) — this points
 * developers at the fake mailbox instead of leaving them to wonder why "no
 * code arrived". Hidden in production builds, where Supabase's hosted SMTP
 * delivers to a real inbox.
 */
export function DevEmailHint(): React.ReactElement | null {
  if (!import.meta.env.DEV) return null;

  return (
    <p
      className="u-mono"
      role="note"
      style={{
        fontSize: 'var(--step--2)',
        color: 'var(--ink-3)',
        textAlign: 'center',
        margin: '0 0 16px',
        padding: '8px 12px',
        border: '1px dashed var(--rule)',
        borderRadius: 'var(--radius)',
      }}
    >
      Local dev: codes go to Inbucket, not a real inbox.{' '}
      <a
        href={INBUCKET_URL}
        target="_blank"
        rel="noreferrer"
        style={{ color: 'var(--ink)', textDecoration: 'underline' }}
      >
        Open Inbucket
      </a>
    </p>
  );
}
