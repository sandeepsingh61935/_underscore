import React from 'react';
import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';

import { AuthScreenShell } from '@/features/auth/components/AuthScreenShell';

describe('AuthScreenShell', () => {
  it('renders the job kicker and title with left-aligned rail content', () => {
    render(
      <AuthScreenShell
        variant="web"
        kicker="Confirm email"
        title="Check your email"
        subtitle="Enter the code"
      >
        <div>body</div>
      </AuthScreenShell>
    );

    expect(screen.getByText('Confirm email')).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Check your email' })).toBeInTheDocument();
    expect(screen.getByText('Enter the code')).toBeInTheDocument();
    expect(screen.getByText('body')).toBeInTheDocument();
  });

  it('renders error with ink-on-tint recipe (accessible alert)', () => {
    render(
      <AuthScreenShell
        variant="popup"
        kicker="Reset password"
        title="Reset"
        error="Something went wrong"
      >
        <div />
      </AuthScreenShell>
    );

    const alert = screen.getByRole('alert');
    expect(alert).toHaveTextContent('Something went wrong');
    expect(alert).toHaveStyle({ color: 'var(--ink)' });
  });
});
