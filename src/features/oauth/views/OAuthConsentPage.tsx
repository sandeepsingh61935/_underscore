import React, { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useWebAuth } from '@/features/auth/providers/WebAuthProvider';
import { getWebSupabaseClient } from '@/shared/auth/supabase-web-client';
import { buildSignInReturnUrl, clearPendingAuthorizationId, readPendingAuthorizationId, stashPendingAuthorizationId } from '@/shared/oauth/oauth-consent-path';
import { labelOAuthScopes } from '@/shared/oauth/oauth-scope-labels';
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

/**
 * Supabase OAuth 2.1 consent screen for third-party MCP clients (e.g. ChatGPT).
 * ADR-024 Phase 2.
 */
export function OAuthConsentPage(): React.ReactElement {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const authorizationIdFromUrl = searchParams.get('authorization_id');
  const authorizationId = authorizationIdFromUrl ?? readPendingAuthorizationId();
  const { isAuthenticated, isLoading: authLoading } = useWebAuth();

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
        'Missing authorization_id. Start from ChatGPT: Settings → Connectors → create _underscore with OAuth, then approve when the browser opens. Do not open /oauth/consent directly.',
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

  const showSpinner = authLoading || isLoadingDetails;

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        color: 'var(--ink)',
        padding: '48px 24px',
      }}
    >
      <div style={{ width: '100%', maxWidth: 440 }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 28 }}>
          <Logo size="md" />
        </div>

        {showSpinner ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '32px 0' }}>
            <p className="u-sans" style={{ color: 'var(--ink-3)', fontSize: 'var(--step--1)' }}>
              Loading authorization request…
            </p>
          </div>
        ) : null}

        {!showSpinner && loadError ? (
          <div>
            <h1 className="u-serif" style={{ fontSize: 'var(--step-2)', marginBottom: 12 }}>
              Authorization unavailable
            </h1>
            <p className="u-sans" style={{ color: 'var(--ink-3)', marginBottom: 20, lineHeight: 1.5 }}>
              {loadError}
            </p>
            <Button variant="ghost" type="button" onClick={() => navigate('/settings')}>
              Back to settings
            </Button>
          </div>
        ) : null}

        {!showSpinner && !loadError && details ? (
          <div>
            <p className="u-kicker" style={{ color: 'var(--ink-3)', marginBottom: 8 }}>
              Third-party access
            </p>
            <h1 className="u-serif" style={{ fontSize: 'var(--step-3)', fontWeight: 500, marginBottom: 8 }}>
              Authorize {clientName}
            </h1>
            <p className="u-sans" style={{ color: 'var(--ink-3)', marginBottom: 24, lineHeight: 1.5 }}>
              This app wants to access your synced _underscore Pro highlights via MCP.
              Basic-only local highlights are never shared.
            </p>

            <div
              style={{
                border: '1px solid var(--rule-soft)',
                borderRadius: 'var(--radius)',
                padding: '16px 18px',
                marginBottom: 20,
              }}
            >
              <p className="u-sans" style={{ fontSize: 'var(--step--1)', marginBottom: 8 }}>
                <strong>Application:</strong> {clientName}
              </p>
              {details.redirect_uri ? (
                <p className="u-mono" style={{ fontSize: 'var(--step--2)', color: 'var(--ink-3)', wordBreak: 'break-all' }}>
                  {details.redirect_uri}
                </p>
              ) : null}
            </div>

            {scopeRows.length > 0 ? (
              <div style={{ marginBottom: 24 }}>
                <p className="u-kicker" style={{ color: 'var(--ink-3)', marginBottom: 10 }}>
                  Requested permissions
                </p>
                <ul className="u-sans" style={{ margin: 0, paddingLeft: 20, lineHeight: 1.6 }}>
                  {scopeRows.map((row) => (
                    <li key={row.scope}>{row.label}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {actionError ? (
              <div
                className="u-sans"
                role="alert"
                style={{
                  marginBottom: 16,
                  padding: '12px 14px',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--rule)',
                  background: 'var(--accent-tint-08)',
                  fontSize: 'var(--step--1)',
                }}
              >
                {actionError}
              </div>
            ) : null}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Button
                type="button"
                variant="accent"
                isLoading={isSubmitting}
                onClick={() => void handleDecision('approve')}
                style={{ width: '100%' }}
              >
                Approve access
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={isSubmitting}
                onClick={() => void handleDecision('deny')}
                style={{ width: '100%' }}
              >
                Deny
              </Button>
            </div>

            <p className="u-sans" style={{ marginTop: 24, fontSize: 'var(--step--2)', color: 'var(--ink-3)', lineHeight: 1.5 }}>
              You can revoke access later in{' '}
              <Link to="/settings" style={{ color: 'var(--ink-3)', textDecoration: 'underline' }}>
                Settings
              </Link>
              .
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
