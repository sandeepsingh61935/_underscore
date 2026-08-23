import React from 'react';
import { Link } from 'react-router-dom';

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/shared/constants/support-contact';
import { AppHeader } from '@/ui-system/components/layout/AppHeader';

/**
 * Public Help / FAQ — same editorial shell as Privacy and Terms.
 */
export function HelpPage(): React.ReactElement {
  return (
    <div className="public-legal">
      <AppHeader variant="standalone" />

      <article className="public-legal__article">
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
          Help
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
          Last updated: August 2026
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
            <strong style={{ color: 'var(--accent)' }}>Quick start</strong> — Install the
            extension, select text on any page, and save a highlight. Open the web app to
            browse your library when you are signed in.
          </p>
        </div>

        <section id="install" style={{ marginBottom: 28, scrollMarginTop: 24 }}>
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
            Install the extension
          </h2>
          <p
            className="u-sans"
            style={{
              margin: '0 0 16px',
              fontSize: 'var(--step-0)',
              lineHeight: 1.65,
              color: 'var(--ink-2)',
            }}
          >
            Capture happens in the desktop browser extension. The web app is your library.
            Store listings may still be rolling out — use manual install from the{' '}
            <Link to="/install" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              install page
            </Link>{' '}
            when needed. Works in desktop Chrome or Firefox only.
          </p>
          <FaqItem q="Chrome (load unpacked)">
            <ol style={{ margin: '0 0 0 1.1rem', padding: 0, lineHeight: 1.65 }}>
              <li>Open the install page and download the Chrome zip.</li>
              <li>Unzip the download on your computer.</li>
              <li>
                Go to <span className="u-mono">chrome://extensions</span>.
              </li>
              <li>Turn on Developer mode.</li>
              <li>Choose Load unpacked and select the unzipped folder.</li>
              <li>Pin underscore from the extensions menu.</li>
            </ol>
          </FaqItem>
          <FaqItem q="Firefox (temporary add-on)">
            <ol style={{ margin: '0 0 0 1.1rem', padding: 0, lineHeight: 1.65 }}>
              <li>Open the install page and download the Firefox package.</li>
              <li>
                Go to{' '}
                <span className="u-mono">about:debugging#/runtime/this-firefox</span>.
              </li>
              <li>Choose Load Temporary Add-on…</li>
              <li>Select the zip or <span className="u-mono">manifest.json</span> from the package.</li>
              <li>
                Keep this Firefox profile open — temporary add-ons are removed when Firefox
                quits.
              </li>
            </ol>
          </FaqItem>
        </section>

        <FaqSection title="Getting started">
          <FaqItem q="How do I save a highlight?">
            With the extension installed, select text on a supported page and use the
            highlight control or shortcut. Saved items appear in your library according to
            your current mode (Guest local storage or Account cloud library). Need the
            extension first? See{' '}
            <a href="#install" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Install the extension
            </a>
            .
          </FaqItem>
          <FaqItem q="Where is the web app?">
            Sign in at this site to open Home, Library, and Settings. The extension popup is
            for quick capture and account actions on the page you are reading.
          </FaqItem>
        </FaqSection>

        <FaqSection title="Modes and your data">
          <FaqItem q="What is Guest mode?">
            Guest keeps highlights on your device in browser storage. It is private by default
            and does not require an account. Clearing site data or uninstalling can remove
            local highlights.
          </FaqItem>
          <FaqItem q="What changes when I create an account?">
            An account unlocks cloud sync and the full web library so highlights can follow
            you across devices. See the{' '}
            <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Privacy Policy
            </Link>{' '}
            for what we store.
          </FaqItem>
          <FaqItem q="Can I export or delete my data?">
            Yes. Use Settings → Data for export where available, delete individual highlights
            in the library, or contact support for account deletion help.
          </FaqItem>
        </FaqSection>

        <FaqSection title="Billing">
          <FaqItem q="How do plans work?">
            Free use covers core highlighting. Paid plans (when offered) unlock higher limits
            or premium features and are managed from web Settings via our billing provider.
            You can open the customer portal from Settings when signed in.
          </FaqItem>
        </FaqSection>

        <FaqSection title="Troubleshooting">
          <FaqItem q="I cannot sign in">
            Confirm you are using the same email and that any verification link was opened in
            the same browser profile. Try a password reset from the sign-in screen. Disable
            strict blockers temporarily if auth redirects fail.
          </FaqItem>
          <FaqItem q="Highlights are missing">
            Check whether you saved them as Guest on another browser/profile or under a
            different account. Guest data does not automatically merge into cloud until you
            use an explicit migration path (if offered) or re-save while signed in.
          </FaqItem>
          <FaqItem q="Extension and web feel out of sync">
            Refresh the tab, confirm you are signed into the same account in both surfaces,
            and retry after a moment so sync can settle.
          </FaqItem>
        </FaqSection>

        <FaqSection title="Contact">
          <p
            className="u-sans"
            style={{
              margin: 0,
              fontSize: 'var(--step-0)',
              lineHeight: 1.65,
              color: 'var(--ink-2)',
            }}
          >
            Still stuck? Email{' '}
            <a
              href={SUPPORT_MAILTO}
              className="u-sans"
              style={{
                color: 'var(--accent)',
                textDecoration: 'underline',
                textUnderlineOffset: 3,
              }}
            >
              {SUPPORT_EMAIL}
            </a>
            . For legal pages see{' '}
            <Link to="/privacy" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Privacy
            </Link>{' '}
            and{' '}
            <Link to="/terms" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              Terms
            </Link>
            .
          </p>
        </FaqSection>
      </article>
    </div>
  );
}

function FaqSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <section style={{ marginBottom: 28 }}>
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </section>
  );
}

function FaqItem({
  q,
  children,
}: {
  q: string;
  children: React.ReactNode;
}): React.ReactElement {
  return (
    <div>
      <h3
        className="u-sans"
        style={{
          margin: '0 0 6px',
          fontSize: 'var(--step-0)',
          fontWeight: 600,
          color: 'var(--ink)',
        }}
      >
        {q}
      </h3>
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
    </div>
  );
}
