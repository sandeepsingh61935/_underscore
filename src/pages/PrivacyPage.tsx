import React from 'react';
import { Link } from 'react-router-dom';

import { AppHeader } from '@/ui-system/components/layout/AppHeader';

/**
 * Privacy Policy Page — matches privacy.html mockup
 * Article-style layout with clear typography, section headers, callout boxes
 */
export function PrivacyPage(): React.ReactElement {
  return (
    <div className="min-h-screen flex flex-col items-center bg-surface text-on-surface">
      <AppHeader variant="standalone" />

      <article className="w-full max-w-[640px] px-6 pb-12">
        <Link
          to="/"
          className="inline-flex min-h-[48px] items-center gap-1.5 rounded-md px-2 -mx-2 mb-5 text-body-small no-underline text-outline transition-colors duration-short ease-standard hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          ← Back
        </Link>

        <h1 className="text-headline-small mb-2 text-on-surface">Privacy Policy</h1>
        <p className="text-body-small mb-8 text-outline">Last updated: February 2026</p>

        {/* Callout */}
        <div className="p-4 rounded-md mb-8 bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)] border border-outline-variant">
          <p className="text-body-medium leading-relaxed text-primary">
            <strong>TL;DR</strong> — Your data stays on your device. We don't track, sell,
            or share your browsing activity or highlights with anyone. Period.
          </p>
        </div>

        <PolicySection title="What we collect">
          <p>We collect the minimum data necessary to provide the service:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Account information (email, display name) when you create an account</li>
            <li>
              Highlight data you explicitly save in Capture, Memory, or Neural modes
            </li>
            <li>Basic usage analytics (page views, feature usage) — no personal data</li>
          </ul>
        </PolicySection>

        <PolicySection title="What we don't collect">
          <ul className="list-disc pl-5 space-y-1">
            <li>Browsing history outside of your explicit highlights</li>
            <li>Personal information beyond what you provide at signup</li>
            <li>Data from Focus mode — it lives only in your browser session</li>
          </ul>
        </PolicySection>

        <PolicySection title="Data storage">
          <p>
            All data is stored locally in your browser using IndexedDB. When you enable
            cloud sync, your data is encrypted end-to-end before leaving your device. We
            use AES-256 encryption — even we can't read your highlights.
          </p>
        </PolicySection>

        <PolicySection title="Your rights">
          <p>You can:</p>
          <ul className="list-disc pl-5 mt-2 space-y-1">
            <li>Export all your data at any time (Settings → Data)</li>
            <li>Delete your account and all associated data</li>
            <li>Use Focus mode without creating an account</li>
          </ul>
        </PolicySection>

        <PolicySection title="Contact">
          <p>
            Questions? Email us at{' '}
            <a
              href="mailto:privacy@underscore.dev"
              className="inline-flex min-h-[48px] items-center rounded-md px-2 -mx-2 underline text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
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
    <section className="mb-6">
      <h2 className="text-title-small mb-3 text-on-surface">{title}</h2>
      <div className="text-body-medium leading-relaxed text-on-surface-variant">
        {children}
      </div>
    </section>
  );
}
