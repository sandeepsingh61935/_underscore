import React from 'react';
import { Link } from 'react-router-dom';

import { AppHeader } from '@/ui-system/components/layout/AppHeader';

/**
 * Terms of Service — short editorial page matching Privacy layout family.
 * Spec: auth landing legal polish (grill 2026-07-14).
 */
export function TermsPage(): React.ReactElement {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        width: '100%',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
      }}
    >
      <AppHeader variant="standalone" />

      <article
        style={{
          width: '100%',
          maxWidth: 640,
          margin: '0 auto',
          padding: '0 24px 48px',
        }}
      >
        <Link
          to="/"
          className="u-mono"
          style={{
            display: 'inline-flex',
            minHeight: 44,
            alignItems: 'center',
            gap: 6,
            padding: '0 8px',
            margin: '20px 0 8px -8px',
            color: 'var(--ink-2)',
            textDecoration: 'none',
            fontSize: 'var(--step--1)',
          }}
        >
          ← Back
        </Link>

        <h1
          className="u-serif"
          style={{
            margin: '0 0 8px',
            fontSize: 'var(--step-5)',
            fontWeight: 400,
            letterSpacing: '-0.02em',
            color: 'var(--ink)',
          }}
        >
          Terms of Service
        </h1>
        <p
          className="u-mono"
          style={{
            margin: '0 0 32px',
            fontSize: 'var(--step--2)',
            color: 'var(--ink-3)',
            letterSpacing: '0.04em',
          }}
        >
          Last updated: July 2026
        </p>

        <div
          style={{
            padding: 16,
            marginBottom: 32,
            backgroundColor: 'var(--accent-tint-08)',
            border: '1px solid var(--rule-soft)',
            borderRadius: 'var(--radius)',
          }}
        >
          <p
            className="u-sans"
            style={{
              margin: 0,
              fontSize: 'var(--step-0)',
              lineHeight: 1.6,
              color: 'var(--ink)',
            }}
          >
            <strong style={{ color: 'var(--accent)' }}>TL;DR</strong> — Use Underscore
            responsibly. Your content is yours. We provide the product as-is and may update
            these terms as the service evolves.
          </p>
        </div>

        <PolicySection title="Acceptance">
          <p>
            By creating an account or using Underscore (the extension and web app), you agree
            to these Terms of Service and our{' '}
            <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>
            . If you do not agree, do not use the service.
          </p>
        </PolicySection>

        <PolicySection title="Account">
          <p>
            You are responsible for the accuracy of account information and for keeping your
            credentials secure. You must be old enough to form a binding contract in your
            jurisdiction to register for an account.
          </p>
        </PolicySection>

        <PolicySection title="Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Misuse the service, attempt unauthorized access, or disrupt other users</li>
            <li>Use the product to violate law or third-party rights</li>
            <li>Reverse engineer or abuse rate limits where applicable</li>
          </ul>
        </PolicySection>

        <PolicySection title="Your content">
          <p>
            Highlights and notes you create remain yours. You grant us a limited license to
            store and process that content solely to operate the service (including sync when
            you enable it).
          </p>
        </PolicySection>

        <PolicySection title="Service &ldquo;as is&rdquo;">
          <p>
            The service is provided on an as-is and as-available basis without warranties of
            uninterrupted or error-free operation. We may change or discontinue features with
            reasonable notice when practical.
          </p>
        </PolicySection>

        <PolicySection title="Termination">
          <p>
            You may stop using the service at any time and may delete your data through product
            controls where available. We may suspend or terminate access for violation of these
            terms or to protect the service and its users.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Questions about these terms? Email{' '}
            <a
              href="mailto:legal@underscore.dev"
              className="u-sans"
              style={{
                display: 'inline-flex',
                minHeight: 44,
                alignItems: 'center',
                padding: '0 4px',
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              legal@underscore.dev
            </a>
          </p>
        </PolicySection>
      </article>
    </div>
  );
}

function PolicySection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section style={{ marginBottom: 24 }}>
      <h2
        className="u-serif"
        style={{
          margin: '0 0 12px',
          fontSize: 'var(--step-2)',
          fontWeight: 500,
          letterSpacing: '-0.01em',
          color: 'var(--ink)',
        }}
      >
        {title}
      </h2>
      <div
        className="u-sans"
        style={{
          fontSize: 'var(--step-0)',
          lineHeight: 1.65,
          color: 'var(--ink-2)',
        }}
      >
        {children}
      </div>
    </section>
  );
}
