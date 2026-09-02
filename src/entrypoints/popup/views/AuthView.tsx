import React, { useState } from 'react';

import type { OAuthProviderType } from '../../../background/auth/interfaces/i-auth-manager';
import { useClearVerificationState } from '../../../features/auth/hooks/useClearVerificationState';
import { useCurrentUser } from '../../../features/auth/hooks/useCurrentUser';

import { ForgotPasswordView } from './ForgotPasswordView';
import { ResetPasswordView } from './ResetPasswordView';
import { VerificationView } from './VerificationView';

import { isAuthEmailUiEnabled } from '@/shared/auth/auth-email-ui';
import { EXISTING_ACCOUNT_CODE, mapAuthError } from '@/shared/auth/auth-error-messages';
import { Button } from '@/ui-system/components/primitives/Button';
import { Input } from '@/ui-system/components/primitives/Input';
import { Logo } from '@/ui-system/components/primitives/Logo';

type AuthStep = 'auth' | 'forgot-password' | 'reset-password';

interface AuthViewProps {
  onLoginSuccess: () => void;
  onBack?: () => void;
}

const textLinkStyle: React.CSSProperties = {
  display: 'inline',
  padding: 0,
  margin: 0,
  minHeight: 'auto',
  border: 0,
  background: 'transparent',
  cursor: 'pointer',
  fontFamily: 'var(--sans)',
  fontSize: 'inherit',
  fontWeight: 500,
  color: 'var(--accent)',
  textDecoration: 'underline',
  textUnderlineOffset: 2,
};

const quietLinkStyle: React.CSSProperties = {
  ...textLinkStyle,
  color: 'var(--ink-3)',
  fontWeight: 400,
  fontSize: 'var(--step--1)',
};

/**
 * AuthView — popup auth landing (body-only).
 *
 * Spec: docs/superpowers/specs/2026-07-14-auth-landing-redesign.md
 * PopupShell owns brand chrome; body starts at Back + centered title.
 * No rail / kicker / body wordmark on landing.
 */
export function AuthView({ onLoginSuccess, onBack }: AuthViewProps): React.ReactElement {
  const {
    login,
    loginWithEmail,
    registerWithEmail,
    isLoading,
    error,
    verificationStatus,
    verificationExpiresAt,
    verificationEmail,
  } = useCurrentUser();

  const clearVerification = useClearVerificationState();
  const emailUi = isAuthEmailUiEnabled();

  const [loginError, setLoginError] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [activeProvider, setActiveProvider] = useState<OAuthProviderType | null>(null);
  const [step, setStep] = useState<AuthStep>('auth');
  const [resetEmail, setResetEmail] = useState('');

  const handleProviderClick = async (provider: OAuthProviderType): Promise<void> => {
    setLoginError(null);
    setActiveProvider(provider);
    const result = await login(provider);
    setActiveProvider(null);
    if (result.success) {
      onLoginSuccess();
    } else {
      setLoginError(result.error || mapAuthError('oauth', null));
    }
  };

  const handleEmailSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoginError(null);

    if (isRegistering) {
      if (password.length < 8) {
        setLoginError('Password must be at least 8 characters.');
        return;
      }

      const result = await registerWithEmail(email, password);
      if (!result.success) {
        setLoginError(result.error || mapAuthError('sign-up', null));
        if (result.code === EXISTING_ACCOUNT_CODE) {
          setIsRegistering(false);
        }
        return;
      }
      if (result.verificationStatus === 'awaiting') {
        return;
      }
      onLoginSuccess();
      return;
    }

    const result = await loginWithEmail(email, password);
    if (result.success) {
      onLoginSuccess();
    } else {
      setLoginError(result.error || mapAuthError('sign-in', null));
    }
  };

  if (verificationStatus === 'awaiting') {
    return (
      <VerificationView
        email={verificationEmail ?? email}
        expiresAt={verificationExpiresAt}
        onVerified={onLoginSuccess}
        onCancel={() => {
          void clearVerification(undefined);
        }}
      />
    );
  }

  // Email recovery steps only when email UI is enabled (or mid-session after flag-on start).
  if (emailUi && step === 'forgot-password') {
    return (
      <ForgotPasswordView
        onCodeSent={(sentEmail) => {
          setResetEmail(sentEmail);
          setStep('reset-password');
        }}
        onBack={() => setStep('auth')}
      />
    );
  }

  if (emailUi && step === 'reset-password') {
    return (
      <ResetPasswordView
        email={resetEmail}
        onSuccess={onLoginSuccess}
        onBack={() => setStep('auth')}
      />
    );
  }

  const showPasswordHelper = isRegistering && password.length < 8;
  const displayError = loginError || error;
  const authTitle = emailUi
    ? isRegistering
      ? 'Create your account'
      : 'Welcome back'
    : 'Sign in';
  const authSub = emailUi
    ? isRegistering
      ? 'Save highlights to your library.'
      : 'Open your synced collections.'
    : 'Save highlights to your library.';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
        overflowY: 'auto',
      }}
    >
      <main
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          width: '100%',
          maxWidth: 400,
          margin: '0 auto',
          boxSizing: 'border-box',
          padding: '8px 22px 12px',
          gap: 0,
          position: 'relative',
          justifyContent: 'flex-start',
        }}
      >
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="u-sans"
            aria-label="Back"
            style={{
              ...quietLinkStyle,
              alignSelf: 'flex-start',
              minHeight: 44,
              display: 'inline-flex',
              alignItems: 'center',
              fontSize: 'var(--step-1)',
              textDecoration: 'none',
              position: 'relative',
              zIndex: 1,
              marginBottom: 0,
            }}
          >
            ←
          </button>
        ) : null}

        <div
          style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 0,
            width: '100%',
            minHeight: 0,
            padding: '8px 0 28px',
            boxSizing: 'border-box',
          }}
        >
          <div aria-hidden style={{ margin: '0 0 18px' }}>
            <Logo size="md" showText={false} />
          </div>

          <div style={{ textAlign: 'center', width: '100%', margin: '0 0 22px' }}>
            <h1
              className="u-serif"
              style={{
                fontSize: 'var(--step-3)',
                fontWeight: 500,
                color: 'var(--ink)',
                textAlign: 'center',
                margin: '0 0 6px',
                letterSpacing: '-0.025em',
                lineHeight: 1.2,
              }}
            >
              {authTitle}
            </h1>
            <p
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                textAlign: 'center',
                margin: 0,
                lineHeight: 1.45,
              }}
            >
              {authSub}
            </p>
          </div>

          {displayError ? (
            <div
              role="alert"
              className="u-sans"
              style={{
                width: '100%',
                padding: '12px 14px',
                borderRadius: 'var(--radius)',
                backgroundColor: 'var(--accent-tint-08)',
                border: '1px solid var(--rule)',
                color: 'var(--ink)',
                fontSize: 'var(--step--1)',
                marginBottom: 12,
                boxSizing: 'border-box',
              }}
            >
              {displayError}
            </div>
          ) : null}

          <Button
            type="button"
            variant="accent"
            onClick={() => void handleProviderClick('google')}
            disabled={isLoading || activeProvider !== null}
            data-testid="auth-continue-google"
            aria-label="Continue with Google"
            style={{
              width: '100%',
              gap: 12,
            }}
          >
            <svg
              width={18}
              height={18}
              viewBox="0 0 18 18"
              aria-hidden="true"
              focusable="false"
              style={{ flexShrink: 0, display: 'block' }}
            >
              <path
                fill="#fff"
                d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              />
              <path
                fill="#fff"
                d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              />
              <path
                fill="#fff"
                d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.997 8.997 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z"
              />
              <path
                fill="#fff"
                d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z"
              />
            </svg>
            <span>
              {activeProvider === 'google' ? 'Signing in...' : 'Continue with Google'}
            </span>
          </Button>
          <p
            className="u-sans"
            style={{
              margin: '14px 0 0',
              maxWidth: '28ch',
              textAlign: 'center',
              fontFamily: 'var(--sans)',
              fontSize: 'var(--step--2)',
              color: 'var(--ink-3)',
              lineHeight: 1.45,
            }}
          >
            One tap with Google. We never post on your behalf.
          </p>
        </div>

        {emailUi ? (
          <div
            style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}
          >
            <div
              style={{
                width: '100%',
                display: 'flex',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-soft)' }} />
              <span
                className="u-mono"
                style={{
                  fontSize: 'var(--step--2)',
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  color: 'var(--ink-3)',
                }}
              >
                or email
              </span>
              <div style={{ flex: 1, height: 1, backgroundColor: 'var(--rule-soft)' }} />
            </div>

            <form
              onSubmit={(e) => void handleEmailSubmit(e)}
              data-testid="auth-email-form"
              style={{
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
                gap: 10,
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <label
                  htmlFor="popup-email"
                  className="u-kicker"
                  style={{ color: 'var(--ink-3)' }}
                >
                  Email
                </label>
                <Input
                  id="popup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                  }}
                >
                  <label
                    htmlFor="popup-password"
                    className="u-kicker"
                    style={{ color: 'var(--ink-3)' }}
                  >
                    Password
                  </label>
                  {!isRegistering ? (
                    <button
                      type="button"
                      onClick={() => setStep('forgot-password')}
                      style={{
                        ...quietLinkStyle,
                        fontSize: 'var(--step--2)',
                        minHeight: 32,
                        display: 'inline-flex',
                        alignItems: 'center',
                      }}
                    >
                      Forgot password?
                    </button>
                  ) : null}
                </div>
                <Input
                  id="popup-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete={isRegistering ? 'new-password' : 'current-password'}
                />
                {showPasswordHelper ? (
                  <p
                    className="u-sans"
                    style={{
                      margin: 0,
                      fontSize: 'var(--step--2)',
                      color: 'var(--ink-3)',
                    }}
                  >
                    At least 8 characters
                  </p>
                ) : null}
              </div>

              <Button
                type="submit"
                variant="primary"
                isLoading={isLoading && activeProvider === null}
                disabled={isLoading || !email || !password}
                style={{ width: '100%' }}
              >
                {isRegistering ? 'Create account' : 'Sign in'}
              </Button>
            </form>

            <p
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                textAlign: 'center',
                margin: 0,
              }}
            >
              {isRegistering ? 'Already have an account?' : "Don't have an account?"}{' '}
              <button
                type="button"
                onClick={() => {
                  setIsRegistering(!isRegistering);
                  setLoginError(null);
                }}
                style={textLinkStyle}
              >
                {isRegistering ? 'Sign in' : 'Create one'}
              </button>
            </p>
          </div>
        ) : null}
      </main>

      <footer
        style={{
          flexShrink: 0,
          padding: '0 22px 20px',
          textAlign: 'center',
          maxWidth: 400,
          width: '100%',
          margin: '0 auto',
          boxSizing: 'border-box',
        }}
      >
        <PopupLegalFooter />
      </footer>
    </div>
  );
}

function PopupLegalFooter(): React.ReactElement {
  const linkStyle: React.CSSProperties = {
    ...quietLinkStyle,
    display: 'inline',
    minHeight: 'auto',
    fontSize: 'inherit',
    color: 'var(--ink-3)',
    textDecoration: 'underline',
    textUnderlineOffset: 2,
  };

  return (
    <p
      className="u-sans"
      style={{
        fontSize: 'var(--step--2)',
        color: 'var(--ink-3)',
        lineHeight: 1.5,
        margin: 0,
      }}
    >
      By continuing, you agree to our{' '}
      <button type="button" style={linkStyle}>
        Terms of Service
      </button>{' '}
      and{' '}
      <button type="button" style={linkStyle}>
        Privacy Policy
      </button>
    </p>
  );
}
