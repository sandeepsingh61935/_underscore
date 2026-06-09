import React from 'react';
import { Link } from 'react-router-dom';

import { AppHeader } from '@/ui-system/components/layout/AppHeader';

/**
 * Privacy Policy Page — article-style layout with editorial typography.
 * AppHeader (standalone) provides the centered Logo header; body is a
 * V2-styled long-form article (640px max width, generous leading).
 */
export function PrivacyPage(): React.ReactElement {
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
          Privacy Policy
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
          Last updated: February 2026
        </p>

        {/* Callout — V2 uses var(--accent-tint-08) for soft emphasis, no glass */}
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
            <strong style={{ color: 'var(--accent)' }}>TL;DR</strong> — Your data stays
            on your device. We don&apos;t track, sell, or share your browsing activity
            or highlights with anyone. Period.
          </p>
        </div>

        <PolicySection title="What we collect">
          <p>We collect the minimum data necessary to provide the service:</p>
          <ul>
            <li>Account information (email, display name) when you create an account</li>
            <li>Highlight data you explicitly save in ephemeral, local, or cloud modes</li>
            <li>Basic usage analytics (page views, feature usage) — no personal data</li>
          </ul>
        </PolicySection>

        <PolicySection title="What we don't collect">
          <ul>
            <li>Browsing history outside of your explicit highlights</li>
            <li>Personal information beyond what you provide at signup</li>
            <li>Data from ephemeral mode — it lives only in your browser session</li>
          </ul>
        </PolicySection>

        <PolicySection title="Data storage">
          <p>
            All data is stored locally in your browser using IndexedDB. When you enable
            cloud sync, your data is encrypted end-to-end before leaving your device. We
            use AES-256 encryption — even we can&apos;t read your highlights.
          </p>
        </PolicySection>

        <PolicySection title="Your rights">
          <p>You can:</p>
          <ul>
            <li>Export all your data at any time (Settings → Data)</li>
            <li>Delete your account and all associated data</li>
            <li>Use ephemeral mode without creating an account</li>
          </ul>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Questions? Email us at{' '}
            <a
              href="mailto:privacy@underscore.dev"
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
              privacy@underscore.dev
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
