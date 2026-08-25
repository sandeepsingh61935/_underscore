import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { pingExtensionPresence } from '@/shared/extension/extension-presence';
import {
  detectInstallBrowser,
  getInstallDistributionConfig,
} from '@/web/install/install-distribution';

export interface WelcomePageProps {
  onStartClick?: () => void;
  /** For /install alias: start with gate open. */
  initialGateOpen?: boolean;
  /** Legacy selector alias: render data-od-id="install" data-alias="welcome-gate" */
  aliasMode?: boolean;
  /** Test seam: override detected browser. */
  detectedBrowser?: 'chrome' | 'firefox' | 'unknown';
}

const GATE_TIMEOUT_MS = 2200;

const CHROME_CONCISE_STEPS = [
  'Click Add to Chrome to download the ZIP and unzip it',
  'Open chrome://extensions → enable Developer mode → Load unpacked → choose the folder',
  'Pin via puzzle icon → Pin underscore, then select text on any page to highlight',
] as const;

const FIREFOX_CONCISE_STEPS = [
  'Click Add to Firefox to download the build',
  'Open about:debugging#/runtime/this-firefox → Load Temporary Add-on → choose the file',
  'Keep this browser open (temporary add-ons reset when Firefox quits)',
] as const;

export function WelcomePage({
  onStartClick,
  initialGateOpen = false,
  aliasMode = false,
  detectedBrowser,
}: WelcomePageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated } = useApp();
  const isWeb = !onStartClick;

  const locationGateOpen = (location.state as { gateOpen?: boolean } | null)?.gateOpen ?? false;
  const [welcomeGateOpen, setWelcomeGateOpen] = useState(initialGateOpen || locationGateOpen);
  const [welcomeGateHowOpen, setWelcomeGateHowOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [checkSuccess, setCheckSuccess] = useState(false);

  // Sync when guard redirects to "/" with gateOpen state
  useEffect(() => {
    if (locationGateOpen && !welcomeGateOpen) {
      setWelcomeGateOpen(true);
    }
  }, [locationGateOpen, welcomeGateOpen]);

  const firstCtaRef = useRef<HTMLAnchorElement>(null);
  const openLibraryRef = useRef<HTMLAnchorElement>(null);
  const getStartedRef = useRef<HTMLButtonElement>(null);

  const detected = detectedBrowser ?? detectInstallBrowser();
  const browserLabel =
    detected === 'chrome' ? 'Chrome' : detected === 'firefox' ? 'Firefox' : null;

  const distConfig = React.useMemo(() => getInstallDistributionConfig(), []);
  const chromeArtifact = React.useMemo(
    () => distConfig.browsers.find((b) => b.id === 'chrome'),
    [distConfig],
  );
  const firefoxArtifact = React.useMemo(
    () => distConfig.browsers.find((b) => b.id === 'firefox'),
    [distConfig],
  );

  // Popup still honors auth redirect; web gate does not auto-redirect (guard handles it)
  useEffect(() => {
    if (isAuthenticated && !onStartClick && !welcomeGateOpen) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate, onStartClick, welcomeGateOpen]);

  // Esc reverses gate
  useEffect(() => {
    if (!welcomeGateOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setWelcomeGateOpen(false);
        setCheckError(null);
        // return focus to Get started
        requestAnimationFrame(() => getStartedRef.current?.focus());
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [welcomeGateOpen]);

  // Focus first store CTA on gate open
  useEffect(() => {
    if (welcomeGateOpen) {
      requestAnimationFrame(() => firstCtaRef.current?.focus());
    }
  }, [welcomeGateOpen]);

  // Focus Open library on success
  useEffect(() => {
    if (checkSuccess) {
      requestAnimationFrame(() => openLibraryRef.current?.focus());
    }
  }, [checkSuccess]);

  const openGate = useCallback(() => {
    setWelcomeGateOpen(true);
    setCheckError(null);
  }, []);

  const closeGate = useCallback(() => {
    setWelcomeGateOpen(false);
    setCheckError(null);
    requestAnimationFrame(() => getStartedRef.current?.focus());
  }, []);

  const handleCheck = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    setCheckSuccess(false);
    try {
      const result = await pingExtensionPresence({ timeoutMs: GATE_TIMEOUT_MS });
      if (result.presence === 'installed') {
        setCheckSuccess(true);
        try {
          window.localStorage.setItem('_underscore_extension_gate_passed', '1');
        } catch {
          // ignore
        }
        return;
      }
      setCheckError('We couldn\u2019t find the extension. Refresh the page after you pin it, then check again.');
    } catch {
      setCheckError('We couldn\u2019t find the extension. Refresh the page after you pin it, then check again.');
    } finally {
      setChecking(false);
    }
  }, []);

  const handleAlreadySetup = useCallback(
    async (e: React.MouseEvent) => {
      e.preventDefault();
      try {
        const result = await pingExtensionPresence({ timeoutMs: GATE_TIMEOUT_MS });
        if (result.presence === 'installed') {
          navigate('/home');
          return;
        }
      } catch {
        // fall through to gate
      }
      openGate();
    },
    [navigate, openGate],
  );

  // Popup mode: keep legacy compact layout, no gate
  if (!isWeb) {
    return (
      <div className="welcome welcome--popup" data-od-id="welcome" data-platform="popup">
        <div className="welcome__main">
          <div className="welcome__logo">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="u-serif welcome__title">underscore</h1>
          <p className="u-sans welcome__lede">
            Highlight what matters.
            <br />
            Everything else fades away.
          </p>
          <Button
            variant="primary"
            className="welcome__cta"
            data-od-id="welcome-get-started"
            onClick={() => {
              if (onStartClick) onStartClick();
            }}
          >
            Get started →
          </Button>
        </div>
      </div>
    );
  }

  const dataOdId = aliasMode ? 'install' : 'welcome';
  const gateDataProps = aliasMode ? { 'data-alias': 'welcome-gate' } : {};

  // Idle hero (centered)
  if (!welcomeGateOpen) {
    return (
      <div
        className="welcome welcome--web"
        data-od-id={dataOdId}
        data-platform="web"
        {...(gateDataProps as Record<string, string>)}
      >
        <div className="welcome__main">
          <div className="welcome__logo">
            <Logo size="lg" showText={false} />
          </div>
          <h1 className="u-serif welcome__title">underscore</h1>
          <p className="u-sans welcome__lede">
            Highlight what matters.
            <br />
            Everything else fades away.
          </p>
          <Button
            ref={getStartedRef as unknown as React.Ref<HTMLButtonElement>}
            variant="primary"
            className="welcome__cta"
            data-od-id="welcome-get-started"
            data-action="welcome-open-gate"
            onClick={openGate}
          >
            Get started →
          </Button>
          <a
            href="/home"
            className="u-mono welcome__already"
            data-od-id="welcome-already-setup"
            onClick={handleAlreadySetup}
          >
            Already set up? Open library
          </a>
          <div className="u-mono welcome__trust">
            <span>Free forever</span>
            <span className="welcome__trust-dot" aria-hidden />
            <span>No ads</span>
            <span className="welcome__trust-dot" aria-hidden />
            <span>Private by default</span>
          </div>
        </div>
        <div className="welcome__footer">
          <Link to="/privacy" className="u-mono welcome__footer-link">
            Privacy
          </Link>
          <Link to="/terms" className="u-mono welcome__footer-link">
            Terms
          </Link>
          <Link to="/help" className="u-mono welcome__footer-link">
            Help
          </Link>
        </div>
      </div>
    );
  }

  // Gate open: stage with left why-rail + right gate card
  const gateToast = (location.state as { toast?: string } | null)?.toast ?? null;
  return (
    <div
      className="welcome welcome--web welcome--gate"
      data-od-id={dataOdId}
      data-platform="web"
      data-gate="open"
      {...(gateDataProps as Record<string, string>)}
    >
      {gateToast ? (
        <div role="status" aria-live="polite" data-od-id="welcome-gate-toast" style={{ textAlign: 'center', padding: '10px 16px', fontFamily: 'var(--sans)', fontSize: '13px', color: 'var(--ink-2)', borderBottom: '1px solid var(--rule-soft)', background: 'var(--paper-2)' }}>
          {gateToast}
        </div>
      ) : null}
      <div className="welcome__stage">
        {/* Left rail — replicate [Image 1] */}
        <div className="welcome__hero welcome__hero--collapsed welcome__hero--why">
          <div className="welcome__gate-why">
            <p className="u-mono welcome__gate-why-kicker">Why an extension?</p>
            <h2 className="u-serif welcome__gate-why-title">
              The web app can&rsquo;t read the page by itself.
            </h2>
            <p className="u-sans welcome__gate-why-lede">
              Browsers isolate every tab for security. The extension runs{' '}
              <em>on the page</em> to capture what you select — this site is just the library
              where it lands.
            </p>
            <div className="welcome__gate-why-cards">
              <div className="welcome__gate-why-card">
                <span className="welcome__gate-why-tick" aria-hidden>
                  ✓
                </span>
                <div className="welcome__gate-why-copy">
                  <p className="u-sans welcome__gate-why-card-title">Capture on any page</p>
                  <p className="u-sans welcome__gate-why-card-desc">
                    Articles, docs and PDFs — select text and highlight. Source URL is saved with
                    it.
                  </p>
                </div>
              </div>
              <div className="welcome__gate-why-card">
                <span className="welcome__gate-why-tick" aria-hidden>
                  ✓
                </span>
                <div className="welcome__gate-why-copy">
                  <p className="u-sans welcome__gate-why-card-title">Private by default</p>
                  <p className="u-sans welcome__gate-why-card-desc">
                    Guest highlights stay on device. Sign in only if you want sync — no data
                    selling, no history scraping.
                  </p>
                </div>
              </div>
              <div className="welcome__gate-why-card">
                <span className="welcome__gate-why-tick" aria-hidden>
                  ✓
                </span>
                <div className="welcome__gate-why-copy">
                  <p className="u-sans welcome__gate-why-card-title">Organised automatically</p>
                  <p className="u-sans welcome__gate-why-card-desc">
                    Grouped by site and page, searchable and taggable — the collection lives here,
                    not in the browser.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <button
            type="button"
            className="u-mono welcome__gate-back"
            data-action="welcome-close-gate"
            onClick={closeGate}
            style={{ marginTop: 16 }}
          >
            ← Back
          </button>
        </div>

        {/* Right gate card */}
        <div
          className="welcome__gate"
          role="dialog"
          aria-modal="true"
          aria-label="Install extension"
          data-od-id="welcome-gate-panel"
        >
          <div className="welcome__gate-head">
            <p className="welcome__gate-kicker">Get started</p>
            <h2 className="welcome__gate-title">
              {browserLabel ? `Install for ${browserLabel}` : 'Install the extension'}
            </h2>
            <p className="welcome__gate-sub">
              Add the extension to capture highlights on the page. This site is your library.
            </p>
          </div>
          <div className="welcome__gate-body">
            <div className="welcome__gate-browsers" data-od-id="welcome-gate-browsers">
              {detected === 'chrome' ? (
                <div className="welcome__gate-browser welcome__gate-browser--primary" data-od-id="welcome-gate-browser-chrome">
                  <div className="welcome__gate-browser-copy">
                    <p className="welcome__gate-browser-name">Chrome</p>
                    <p className="welcome__gate-browser-meta">Chrome Web Store · Manifest v3</p>
                  </div>
                  <div className="welcome__gate-browser-actions">
                    <a
                      ref={firstCtaRef}
                      href={chromeArtifact?.downloadHref ?? '/downloads/underscore-highlighter-chrome.zip'}
                      download
                      className="btn accent"
                      data-od-id="welcome-gate-store-chrome"
                      data-action="gate-choice__download"
                    >
                      Add to Chrome
                    </a>
                  </div>
                </div>
              ) : detected === 'firefox' ? (
                <div className="welcome__gate-browser welcome__gate-browser--primary" data-od-id="welcome-gate-browser-firefox">
                  <div className="welcome__gate-browser-copy">
                    <p className="welcome__gate-browser-name">Firefox</p>
                    <p className="welcome__gate-browser-meta">Firefox Add-ons · Manifest v2</p>
                  </div>
                  <div className="welcome__gate-browser-actions">
                    <a
                      ref={firstCtaRef}
                      href={firefoxArtifact?.downloadHref ?? '/downloads/underscore-highlighter-firefox.zip'}
                      download
                      className="btn accent"
                      data-od-id="welcome-gate-store-firefox"
                      data-action="gate-choice__download"
                    >
                      Add to Firefox
                    </a>
                  </div>
                </div>
              ) : (
                <>
                  <div className="welcome__gate-browser" data-od-id="welcome-gate-browser-chrome">
                    <div className="welcome__gate-browser-copy">
                      <p className="welcome__gate-browser-name">Chrome</p>
                      <p className="welcome__gate-browser-meta">Chrome Web Store · Manifest v3</p>
                    </div>
                    <div className="welcome__gate-browser-actions">
                      <a
                        ref={firstCtaRef}
                        href={chromeArtifact?.downloadHref ?? '/downloads/underscore-highlighter-chrome.zip'}
                        download
                        className="btn accent"
                        data-od-id="welcome-gate-store-chrome"
                      >
                        Add to Chrome
                      </a>
                    </div>
                  </div>
                  <div className="welcome__gate-browser" data-od-id="welcome-gate-browser-firefox">
                    <div className="welcome__gate-browser-copy">
                      <p className="welcome__gate-browser-name">Firefox</p>
                      <p className="welcome__gate-browser-meta">Firefox Add-ons · Manifest v2</p>
                    </div>
                    <div className="welcome__gate-browser-actions">
                      <a
                        href={firefoxArtifact?.downloadHref ?? '/downloads/underscore-highlighter-firefox.zip'}
                        download
                        className="btn accent"
                        data-od-id="welcome-gate-store-firefox"
                      >
                        Add to Firefox
                      </a>
                    </div>
                  </div>
                  <div className="welcome__gate-callout" data-od-id="welcome-gate-callout">
                    Desktop Chrome or Firefox required
                  </div>
                </>
              )}
            </div>

            <div className="welcome__gate-verify" data-od-id="welcome-gate-verify">
              <p className="welcome__gate-verify-hint">After you add it, check below to open the app.</p>
              {!checkSuccess ? (
                <>
                  <div className="welcome__gate-verify-actions">
                    <button
                      type="button"
                      className={`btn accent${checking ? ' is-loading' : ''}`}
                      data-od-id="welcome-gate-check"
                      data-action="install-check"
                      disabled={checking}
                      aria-busy={checking}
                      onClick={() => void handleCheck()}
                      style={{ minHeight: 44 }}
                    >
                      {checking ? 'Checking…' : 'I’ve installed it — check'}
                    </button>
                  </div>
                  {checkError ? (
                    <p className="welcome__gate-error" data-od-id="welcome-gate-check-error" role="alert">
                      {checkError}
                    </p>
                  ) : null}
                </>
              ) : (
                <div className="welcome__gate-success" data-od-id="welcome-gate-success">
                  <span className="welcome__gate-success-ico" aria-hidden>
                    ✓
                  </span>
                  <span className="welcome__gate-success-text">
                    Extension detected — ready
                    <small>Pin it, then open your library</small>
                  </span>
                </div>
              )}
              {checkSuccess ? (
                <a
                  ref={openLibraryRef}
                  href="/home"
                  className="btn accent"
                  data-od-id="welcome-gate-open-library"
                  onClick={(e) => {
                    e.preventDefault();
                    navigate('/home');
                  }}
                  style={{ minHeight: 44, marginTop: 4 }}
                >
                  Open library →
                </a>
              ) : null}
            </div>

            <div className="welcome__gate-how" data-od-id="welcome-gate-how">
              <button
                type="button"
                className="welcome__gate-how-toggle"
                aria-expanded={welcomeGateHowOpen}
                data-od-id="welcome-gate-how-toggle"
                onClick={() => setWelcomeGateHowOpen((v) => !v)}
              >
                <span>How to set it up</span>
                <span aria-hidden>{welcomeGateHowOpen ? '−' : '+'}</span>
              </button>
              {welcomeGateHowOpen ? (
                <div className="welcome__gate-how-body" data-od-id="welcome-gate-how-body">
                  {detected === 'firefox' ? (
                    <ol>
                      {FIREFOX_CONCISE_STEPS.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  ) : detected === 'chrome' ? (
                    <ol>
                      {CHROME_CONCISE_STEPS.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ol>
                  ) : (
                    <>
                      <p className="u-mono" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '0 0 8px' }}>
                        Chrome
                      </p>
                      <ol style={{ marginBottom: 12 }}>
                        {CHROME_CONCISE_STEPS.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                      <p className="u-mono" style={{ fontSize: 10, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ink-3)', margin: '0 0 8px' }}>
                        Firefox
                      </p>
                      <ol>
                        {FIREFOX_CONCISE_STEPS.map((s) => (
                          <li key={s}>{s}</li>
                        ))}
                      </ol>
                    </>
                  )}
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <div className="welcome__footer">
        <Link to="/privacy" className="u-mono welcome__footer-link">
          Privacy
        </Link>
        <Link to="/terms" className="u-mono welcome__footer-link">
          Terms
        </Link>
        <Link to="/help" className="u-mono welcome__footer-link">
          Help
        </Link>
      </div>
    </div>
  );
}
