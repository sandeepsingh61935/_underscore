import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import {
  buildSignInReturnUrl,
  clearPendingAuthorizationId,
  readPendingAuthorizationId,
  stashPendingAuthorizationId,
} from '@/shared/oauth/oauth-consent-path';
import {
  formatOAuthRedirectDisplay,
  labelOAuthScopes,
} from '@/shared/oauth/oauth-scope-labels';
import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';

interface PendingAuthorizationDetails {
  authorization_id: string;
  client: { name?: string; client_name?: string };
  redirect_uri?: string;
  scope?: string;
}

interface CompletedAuthorizationDetails {
  redirect_url: string;
}

function isPendingAuthorization(
  value: unknown,
): value is PendingAuthorizationDetails {
  return Boolean(
    value
    && typeof value === 'object'
    && 'authorization_id' in value
    && typeof (value as PendingAuthorizationDetails).authorization_id === 'string',
  );
}

function isCompletedAuthorization(
  value: unknown,
): value is CompletedAuthorizationDetails {
  return Boolean(
    value
    && typeof value === 'object'
    && 'redirect_url' in value
    && typeof (value as CompletedAuthorizationDetails).redirect_url === 'string',
  );
}

function PartyRow({
  kicker,
  title,
  sub,
  monoSub,
  mark,
}: {
  kicker: string;
  title: string;
  sub?: string;
  monoSub?: string;
  mark: React.ReactNode;
}): React.ReactElement {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '40px 1fr',
        gap: 12,
        alignItems: 'center',
        padding: '12px 0',
      }}
    >
      <div
        aria-hidden
        style={{
          width: 40,
          height: 40,
          borderRadius: '50%',
          border: '1px solid var(--rule-soft)',
          background: 'var(--paper-2)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden',
          flexShrink: 0,
        }}
      >
        {mark}
      </div>
      <div style={{ minWidth: 0 }}>
        <div className="u-kicker" style={{ color: 'var(--ink-3)', marginBottom: 2 }}>
          {kicker}
        </div>
        <div
          className="u-sans"
          style={{ fontSize: 'var(--step-0)', fontWeight: 500, color: 'var(--ink)', lineHeight: 1.3 }}
        >
          {title}
        </div>
        {sub ? (
          <div
            className="u-sans"
            style={{
              fontSize: 'var(--step--1)',
              color: 'var(--ink-2)',
              marginTop: 2,
              lineHeight: 1.4,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
          >
            {sub}
          </div>
        ) : null}
        {monoSub ? (
          <div
            className="u-mono"
            style={{
              fontSize: 'var(--step--2)',
              color: 'var(--ink-3)',
              marginTop: 2,
              wordBreak: 'break-all',
            }}
          >
            {monoSub}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/**
 * Supabase OAuth 2.1 consent screen for third-party MCP clients (e.g. Grok, ChatGPT).
 * ADR-024 Phase 2. Trust layout: who you are, who is asking, what they get.
 */
export function OAuthConsentPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authorizationIdFromUrl = searchParams.get('authorization_id');
  const authorizationId = authorizationIdFromUrl ?? readPendingAuthorizationId();
  const { isAuthenticated, isLoading: authLoading, user } = useWebAuth();

  const [details, setDetails] = useState<PendingAuthorizationDetails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authorizationIdFromUrl) {
      stashPendingAuthorizationId(authorizationIdFromUrl);
    }
  }, [authorizationIdFromUrl]);

  useEffect(() => {
    if (!authorizationId) {
      setLoadError(
        'Missing authorization request. Start from your agent (add Cloud MCP, then approve when the browser opens). Do not open this page directly.',
      );
      setIsLoadingDetails(false);
      return;
    }

    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      window.location.href = buildSignInReturnUrl(authorizationId, window.location.origin);
      return;
    }

    let cancelled = false;

    async function loadDetails(): Promise<void> {
      setIsLoadingDetails(true);
      setLoadError(null);

      const authId = authorizationId;
      if (!authId) {
        return;
      }

      try {
        const supabase = getWebSupabaseClient();
        const { data, error } = await supabase.auth.oauth.getAuthorizationDetails(authId);

        if (cancelled) {
          return;
        }

        if (error) {
          throw error;
        }

        if (isCompletedAuthorization(data)) {
          clearPendingAuthorizationId();
          window.location.href = data.redirect_url;
          return;
        }

        if (!isPendingAuthorization(data)) {
          throw new Error('Invalid authorization response from Supabase.');
        }

        setDetails(data);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load authorization request';
        setLoadError(message);
      } finally {
        if (!cancelled) {
          setIsLoadingDetails(false);
        }
      }
    }

    void loadDetails();

    return () => {
      cancelled = true;
    };
  }, [authorizationId, authLoading, isAuthenticated]);

  const handleDecision = useCallback(async (decision: 'approve' | 'deny') => {
    if (!authorizationId) {
      return;
    }

    setIsSubmitting(true);
    setActionError(null);

    try {
      const supabase = getWebSupabaseClient();
      const result = decision === 'approve'
        ? await supabase.auth.oauth.approveAuthorization(authorizationId)
        : await supabase.auth.oauth.denyAuthorization(authorizationId);

      if (result.error) {
        throw result.error;
      }

      if (result.data?.redirect_url) {
        clearPendingAuthorizationId();
        window.location.href = result.data.redirect_url;
        return;
      }

      throw new Error('No redirect URL returned after authorization decision.');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Authorization failed';
      setActionError(message);
      setIsSubmitting(false);
    }
  }, [authorizationId]);

  const clientName = details?.client?.name ?? details?.client?.client_name ?? 'Unknown application';
  const scopeRows = labelOAuthScopes(details?.scope);
  const redirectDisplay = formatOAuthRedirectDisplay(details?.redirect_uri);
  const accountLabel = user?.displayName?.trim() || user?.email?.split('@')[0] || 'Signed-in account';
  const accountSub = user?.email?.trim() || undefined;
  const accountInitial = (accountLabel.charAt(0) || 'U').toUpperCase();
  const clientInitial = (clientName.charAt(0) || 'A').toUpperCase();

  const showSpinner = authLoading || isLoadingDetails;

  return (
    <div
      data-testid="oauth-consent-page"
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        color: 'var(--ink)',
        padding: '40px 20px 48px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 420 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Logo size="md" />
        </div>

        {showSpinner ? (
          <div
            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '40px 0' }}
            role="status"
          >
            <p className="u-sans" style={{ color: 'var(--ink-3)', fontSize: 'var(--step--1)' }}>
              Loading authorization request…
            </p>
          </div>
        ) : null}

        {!showSpinner && loadError ? (
          <div data-testid="oauth-consent-error">
            <p className="u-kicker" style={{ color: 'var(--ink-3)', marginBottom: 8 }}>
              Authorization
            </p>
            <h1
              className="u-serif"
              style={{ fontSize: 'var(--step-3)', fontWeight: 500, marginBottom: 12, lineHeight: 1.2 }}
            >
              Request unavailable
            </h1>
            <p
              className="u-sans"
              style={{ color: 'var(--ink-2)', marginBottom: 24, lineHeight: 1.5, fontSize: 'var(--step-0)' }}
            >
              {loadError}
            </p>
            <Button
              variant="ghost"
              type="button"
              onClick={() => navigate('/settings')}
              style={{ width: '100%', minHeight: 44 }}
            >
              Open Integrations
            </Button>
          </div>
        ) : null}

        {!showSpinner && !loadError && details ? (
          <div data-testid="oauth-consent-ready">
            <p className="u-kicker" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
              MCP agent access
            </p>
            <h1
              className="u-serif"
              style={{
                fontSize: 'var(--step-3)',
                fontWeight: 500,
                marginBottom: 10,
                lineHeight: 1.2,
                letterSpacing: '-0.02em',
              }}
            >
              Allow {clientName} to access your library?
            </h1>
            <p
              className="u-sans"
              style={{
                color: 'var(--ink-2)',
                marginBottom: 22,
                lineHeight: 1.5,
                fontSize: 'var(--step-0)',
              }}
            >
              {clientName} wants to read your synced Pro highlights through Cloud MCP. Local Basic
              highlights are never shared.
            </p>

            {/* Signature: account ↔ agent pairing (Figma / GitHub-style trust block) */}
            <div
              data-testid="oauth-consent-parties"
              style={{
                border: '1px solid var(--rule)',
                background: 'var(--paper)',
                padding: '4px 16px 8px',
                marginBottom: 20,
              }}
            >
              <PartyRow
                kicker="Your account"
                title={accountLabel}
                sub={accountSub}
                mark={
                  user?.photoUrl ? (
                    <img
                      src={user.photoUrl}
                      alt=""
                      width={40}
                      height={40}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span
                      className="u-sans"
                      style={{ fontSize: 'var(--step-1)', fontWeight: 500, color: 'var(--ink)' }}
                    >
                      {accountInitial}
                    </span>
                  )
                }
              />
              <div
                aria-hidden
                style={{
                  height: 1,
                  background: 'var(--rule-soft)',
                  marginLeft: 52,
                }}
              />
              <PartyRow
                kicker="Requesting access"
                title={clientName}
                sub="AI agent · MCP client"
                monoSub={
                  redirectDisplay.secondary
                    ? `Returns to ${redirectDisplay.secondary}`
                    : `Returns to ${redirectDisplay.primary}`
                }
                mark={
                  <span
                    className="u-sans"
                    style={{ fontSize: 'var(--step-1)', fontWeight: 500, color: 'var(--ink)' }}
                  >
                    {clientInitial}
                  </span>
                }
              />
            </div>

            {scopeRows.length > 0 ? (
              <div style={{ marginBottom: 18 }} data-testid="oauth-consent-permissions">
                <p className="u-kicker" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
                  This will allow {clientName} to
                </p>
                <ul
                  className="u-sans"
                  style={{
                    margin: 0,
                    padding: 0,
                    listStyle: 'none',
                    borderTop: '1px solid var(--rule-soft)',
                  }}
                >
                  {scopeRows.map((row) => (
                    <li
                      key={row.scope}
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '16px 1fr',
                        gap: 10,
                        padding: '10px 0',
                        borderBottom: '1px solid var(--rule-soft)',
                        fontSize: 'var(--step-0)',
                        lineHeight: 1.4,
                        color: 'var(--ink)',
                      }}
                    >
                      <span
                        aria-hidden
                        className="u-mono"
                        style={{ color: 'var(--accent)', fontSize: 'var(--step--1)', lineHeight: 1.4 }}
                      >
                        ·
                      </span>
                      <span>{row.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            <p
              className="u-sans"
              style={{
                fontSize: 'var(--step--1)',
                color: 'var(--ink-3)',
                lineHeight: 1.45,
                marginBottom: 20,
              }}
            >
              Not shared: Guest and Basic-only local highlights, mode keys, or payment details.
            </p>

            {actionError ? (
              <div
                className="u-sans"
                role="alert"
                data-testid="oauth-consent-action-error"
                style={{
                  marginBottom: 16,
                  padding: '12px 14px',
                  border: '1px solid var(--rule)',
                  background: 'var(--paper-2)',
                  fontSize: 'var(--step--1)',
                  lineHeight: 1.45,
                }}
              >
                {actionError}
              </div>
            ) : null}

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: 10,
              }}
            >
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => void handleDecision('deny')}
                style={{ width: '100%', minHeight: 44 }}
                data-testid="oauth-consent-deny"
              >
                Deny
              </Button>
              <Button
                type="button"
                variant="accent"
                isLoading={isSubmitting}
                onClick={() => void handleDecision('approve')}
                style={{ width: '100%', minHeight: 44 }}
                data-testid="oauth-consent-allow"
              >
                Allow access
              </Button>
            </div>

            <p
              className="u-sans"
              style={{
                marginTop: 22,
                fontSize: 'var(--step--2)',
                color: 'var(--ink-3)',
                lineHeight: 1.5,
                textAlign: 'center',
              }}
            >
              You can revoke this connection later in{' '}
              <Link to="/settings" style={{ color: 'var(--ink-2)', textDecoration: 'underline' }}>
                Integrations
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
