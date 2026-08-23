import React from 'react';
import { Link } from 'react-router-dom';

import { SUPPORT_EMAIL, SUPPORT_MAILTO } from '@/shared/constants/support-contact';

/**
 * Public Help / FAQ — same editorial shell as Privacy and Terms.
 */
export function HelpPage(): React.ReactElement {
  return (
    <div className="public-legal">
      <article className="public-legal__article">
        <h1 className="u-serif public-legal__title">Help</h1>
        <p className="u-mono public-legal__meta">Last updated: August 2026</p>

        <section id="install" style={{ marginBottom: 36, scrollMarginTop: 24 }}>
          <h2
            className="u-serif"
            style={{
              margin: '0 0 8px',
              fontSize: 'var(--step-2)',
              fontWeight: 500,
              letterSpacing: '-0.01em',
              color: 'var(--ink)',
            }}
          >
            Load the extension
          </h2>
          <p
            className="u-sans"
            style={{
              margin: '0 0 16px',
              fontSize: 'var(--step-0)',
              lineHeight: 1.6,
              color: 'var(--ink-2)',
            }}
          >
            Download a build from the{' '}
            <Link to="/install" style={{ color: 'var(--accent)', textDecoration: 'underline' }}>
              install page
            </Link>
            , then load it in your browser. Desktop Chrome or Firefox only.
          </p>

          <div className="help-install-grid">
            <div className="help-install-card">
              <h3 className="u-sans">Chrome</h3>
              <ol className="u-sans">
                <li>Download and unzip the Chrome package.</li>
                <li>
                  Open <span className="u-mono">chrome://extensions</span>.
                </li>
                <li>Enable Developer mode.</li>
                <li>Load unpacked → select the unzipped folder.</li>
                <li>Pin underscore from the extensions menu.</li>
              </ol>
            </div>
            <div className="help-install-card">
              <h3 className="u-sans">Firefox</h3>
              <ol className="u-sans">
                <li>Download the Firefox package.</li>
                <li>
                  Open{' '}
                  <span className="u-mono">about:debugging#/runtime/this-firefox</span>.
                </li>
                <li>Load Temporary Add-on…</li>
                <li>
                  Choose the zip or <span className="u-mono">manifest.json</span>.
                </li>
                <li>Keep Firefox open — temporary add-ons clear on quit.</li>
              </ol>
            </div>
          </div>
        </section>

        <FaqSection title="Getting started">
          <FaqItem q="How do I save a highlight?">
            With the extension installed, select text on a page and use the highlight control
            or shortcut. Items show in your library (local as Guest, cloud when signed in).
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
