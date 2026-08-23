import React from 'react';
import { Link } from 'react-router-dom';

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/shared/constants/support-contact';
import { AppHeader } from '@/ui-system/components/layout/AppHeader';

/**
 * Terms of Service — short editorial page matching Privacy layout family.
 */
export function TermsPage(): React.ReactElement {
  return (
    <div className="public-legal">
      <AppHeader variant="standalone" />

      <article className="public-legal__article">
        <h1 className="u-serif public-legal__title">Terms of Service</h1>
        <p className="u-mono public-legal__meta">Last updated: August 2026</p>

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
            responsibly. Your content is yours. Paid plans and AI features have extra rules.
            The product is provided as-is; we may update these terms as the service evolves.
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
            jurisdiction to register for an account. Notify us promptly if you suspect
            unauthorized access.
          </p>
        </PolicySection>

        <PolicySection title="Acceptable use">
          <p>You agree not to:</p>
          <ul>
            <li>Misuse the service, attempt unauthorized access, or disrupt other users</li>
            <li>Use the product to violate law or third-party rights (including copyright)</li>
            <li>Reverse engineer, scrape abusively, or bypass rate limits or security controls</li>
            <li>
              Upload or sync unlawful, harmful, or infringing content through library, sync, or
              AI features
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="Your content">
          <p>
            Highlights, notes, and library items you create remain yours. You grant us a
            limited license to host, store, transmit, and process that content solely to
            operate and improve the service (including sync, backup, export, and features you
            enable). You represent that you have the rights needed to save and process the
            material you capture.
          </p>
        </PolicySection>

        <PolicySection title="Subscriptions and billing">
          <p>
            Some features may require a paid plan. Prices, included limits, and renewal terms
            are shown at checkout or in-product. Payments are handled by our payment provider.
            Unless required by law or stated otherwise at purchase, fees are non-refundable
            once a billing period starts. You can manage or cancel renewal through the billing
            portal or in-product controls when available. We may change plans or pricing with
            notice for future periods.
          </p>
        </PolicySection>

        <PolicySection title="AI and integrations">
          <p>
            Optional AI, MCP, or third-party integrations process only the inputs you submit
            (for example selected highlights, prompts, or connection grants). Output may be
            inaccurate or incomplete — verify before relying on it. Do not submit secrets or
            data you are not allowed to share with those providers. We may enforce usage limits
            to protect the service.
          </p>
        </PolicySection>

        <PolicySection title="Service &ldquo;as is&rdquo;">
          <p>
            The service is provided on an as-is and as-available basis without warranties of
            uninterrupted or error-free operation. To the fullest extent permitted by law, we
            disclaim liability for indirect, incidental, or consequential damages, and our
            aggregate liability for claims relating to the service is limited to the greater of
            amounts you paid us in the twelve months before the claim or fifty US dollars
            (US $50).
          </p>
        </PolicySection>

        <PolicySection title="Changes and termination">
          <p>
            We may change or discontinue features with reasonable notice when practical. You
            may stop using the service at any time and may delete data through product controls
            where available. We may suspend or terminate access for violation of these terms or
            to protect the service and its users.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Questions about these terms? Email{' '}
            <a
              href={SUPPORT_MAILTO}
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
              {SUPPORT_EMAIL}
            </a>
            .
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
