import React from 'react';

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/shared/constants/support-contact';

/**
 * Privacy Policy — article-style layout with editorial typography.
 * Reflects Guest (local), Account (cloud sync), billing, and optional AI use.
 */
export function PrivacyPage(): React.ReactElement {
  return (
    <div className="public-legal">
      <article className="public-legal__article">
        <h1 className="u-serif public-legal__title">Privacy Policy</h1>
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
            <strong style={{ color: 'var(--accent)' }}>TL;DR</strong> — Guest mode keeps
            highlights on your device. When you create an account and use cloud features,
            we store the data you save so it can sync across devices. We do not sell your
            highlights or browsing history. You can export or delete your data.
          </p>
        </div>

        <PolicySection title="Who we are">
          <p>
            Underscore (&ldquo;we&rdquo;) provides a browser extension and web app for
            highlighting and saving passages from the web. This policy describes what we
            collect and how we use it when you use our products.
          </p>
        </PolicySection>

        <PolicySection title="What we collect">
          <p>We collect only what we need to run the product:</p>
          <ul>
            <li>
              <strong>Account data</strong> — email and profile fields you provide when you
              register or sign in (handled by our auth provider).
            </li>
            <li>
              <strong>Highlight and library data you save</strong> — selected text, notes,
              page URLs/titles, collections/metadata, and related timestamps when you use
              persistence beyond pure on-device Guest use.
            </li>
            <li>
              <strong>Billing data</strong> — if you subscribe, payment is processed by our
              payment provider. We receive subscription status and related account identifiers,
              not your full card number.
            </li>
            <li>
              <strong>Support messages</strong> — if you email us, the content of that
              correspondence.
            </li>
            <li>
              <strong>Basic operational logs</strong> — technical signals needed to keep the
              service reliable and secure (for example error and request diagnostics). We do
              not build advertising profiles from your browsing history.
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="Modes and where data lives">
          <ul>
            <li>
              <strong>Guest</strong> — highlights can live only in local browser storage on
              your device until you clear them or the storage is removed.
            </li>
            <li>
              <strong>Account</strong> — when you sign in and use cloud sync or the web
              library, highlights and related library data are stored in your account so you
              can access them across sessions and devices.
            </li>
            <li>
              <strong>Paid features</strong> — optional paid plans may unlock additional
              capabilities (for example higher limits or AI-related features). Using those
              features may send the inputs you choose (such as selected highlights or prompts)
              to the providers required to fulfill the request.
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="What we do not do">
          <ul>
            <li>We do not sell your personal data or highlight library.</li>
            <li>
              We do not collect your full browsing history — only pages and passages you
              explicitly save or actions you take in the product.
            </li>
            <li>
              We do not claim end-to-end encryption of highlight text before upload. Cloud
              data is protected by account authentication and our infrastructure controls;
              treat synced text as stored content, not a zero-knowledge vault.
            </li>
          </ul>
        </PolicySection>

        <PolicySection title="Service providers">
          <p>
            We use processors to operate Underscore, which may include authentication and
            database hosting, payment/subscription processing, hosting/CDN, and (when you use
            AI features) model or API providers. They process data only to provide their
            services to us, under appropriate agreements.
          </p>
        </PolicySection>

        <PolicySection title="Your choices and rights">
          <p>You can:</p>
          <ul>
            <li>Use Guest mode without creating an account</li>
            <li>Export your data from product controls where available (Settings → Data)</li>
            <li>Delete highlights or close/delete your account through product or support paths</li>
            <li>
              Contact us to ask questions about this policy or your data at{' '}
              <ContactLink />
            </li>
          </ul>
          <p>
            Depending on where you live, you may have additional rights under local law (access,
            correction, deletion, objection). Email us to exercise them.
          </p>
        </PolicySection>

        <PolicySection title="Children">
          <p>
            Underscore is not directed at children under 13 (or the minimum age required in
            your jurisdiction). Do not create an account if you are under that age.
          </p>
        </PolicySection>

        <PolicySection title="Changes">
          <p>
            We may update this policy as the product evolves. We will revise the &ldquo;Last
            updated&rdquo; date above. Continued use after changes means you accept the updated
            policy.
          </p>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Privacy questions: email{' '}
            <ContactLink />.
          </p>
        </PolicySection>
      </article>
    </div>
  );
}

function ContactLink(): React.ReactElement {
  return (
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
