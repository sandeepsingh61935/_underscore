import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  pingExtensionPresence,
  type ExtensionPingDeps,
} from '@/shared/extension/extension-presence';
import {
  detectInstallBrowser,
  getInstallDistributionConfig,
  showManualDownload,
  showStoreCta,
  type InstallBrowserArtifact,
  type InstallBrowserDetect,
  type InstallBrowserId,
  type InstallDistributionConfig,
} from '@/web/install/install-distribution';

export interface InstallPageProps {
  config?: InstallDistributionConfig;
  detectedBrowser?: InstallBrowserDetect;
  /** Test seam for extension presence ping. */
  ping?: (deps?: ExtensionPingDeps) => ReturnType<typeof pingExtensionPresence>;
}

/**
 * Install hub — single-browser download when UA known; guest hard gate (no continue).
 */
export function InstallPage({
  config: configProp,
  detectedBrowser: detectedProp,
  ping = pingExtensionPresence,
}: InstallPageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const config = useMemo(
    () => configProp ?? getInstallDistributionConfig(),
    [configProp],
  );
  const detected = detectedProp ?? detectInstallBrowser();
  const [showOther, setShowOther] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);

  const onDownloadClick = useCallback(() => {
    setDownloaded(true);
    setCheckError(null);
  }, []);

  const onCheckInstalled = useCallback(async () => {
    setChecking(true);
    setCheckError(null);
    try {
      const result = await ping();
      if (result.presence === 'installed') {
        navigate('/home', { replace: true });
        return;
      }
      setCheckError(
        'Extension not detected. Reload this page after enabling underscore on this site, or re-load the extension from chrome://extensions, then try again.',
      );
    } catch {
      setCheckError(
        'Extension not detected. Reload this page after enabling underscore on this site, or re-load the extension from chrome://extensions, then try again.',
      );
    } finally {
      setChecking(false);
    }
  }, [navigate, ping]);

  // Already installed from a prior session: detect on open and enter the app.
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const result = await ping();
      if (cancelled) return;
      if (result.presence === 'installed') {
        navigate('/home', { replace: true });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate, ping]);

  const byId = useMemo(() => {
    const map = new Map<InstallBrowserId, InstallBrowserArtifact>();
    for (const b of config.browsers) {
      map.set(b.id, b);
    }
    return map;
  }, [config.browsers]);

  const primaryId: InstallBrowserId | null =
    detected === 'chrome' || detected === 'firefox' ? detected : null;

  const visible: InstallBrowserArtifact[] = (() => {
    if (!primaryId) {
      return [...config.browsers];
    }
    const primary = byId.get(primaryId);
    const otherId: InstallBrowserId = primaryId === 'chrome' ? 'firefox' : 'chrome';
    const other = byId.get(otherId);
    if (!primary) {
      return [...config.browsers];
    }
    if (showOther && other) {
      return [primary, other];
    }
    return [primary];
  })();

  const otherLabel =
    primaryId === 'chrome' ? 'Firefox' : primaryId === 'firefox' ? 'Chrome' : null;

  const isSingle = visible.length === 1;

  return (
    <div className="install" data-od-id="install" data-platform="web">
      <main className="install__main">
        <div className="install__panel">
          <header className="install__intro">
            <h1 className="u-serif install__title">Install the extension</h1>
            <p className="u-sans install__lede" data-od-id="install-lede">
              You must download and load the extension to use the app.
            </p>
            <p className="u-sans install__sub">
              It captures highlights on the page. This site is your library.
            </p>
          </header>

          <section
            className={`install__downloads${isSingle ? ' install__downloads--single' : ''}`}
            data-od-id="install-browsers"
            aria-label="Download"
          >
            {visible.map((browser) => (
              <BrowserChoice
                key={browser.id}
                browser={browser}
                onDownloadClick={onDownloadClick}
              />
            ))}
          </section>

          <div className="install__verify" data-od-id="install-verify">
            <p className="u-sans install__verify-hint">
              {downloaded
                ? 'Load the extension in your browser, then open the app.'
                : 'After you download and load it, check below to open the app.'}
            </p>
            <button
              type="button"
              className="btn primary install__verify-btn"
              data-od-id="install-check"
              disabled={checking}
              onClick={() => {
                void onCheckInstalled();
              }}
            >
              {checking ? 'Checking…' : "I've installed it — open app"}
            </button>
            {checkError ? (
              <p
                className="u-sans install__verify-error"
                data-od-id="install-check-error"
                role="alert"
              >
                {checkError}
              </p>
            ) : null}
          </div>

          <div className="install__links">
            <Link to={config.helpHref} className="install__link" data-od-id="install-help">
              How to load it
            </Link>
            {primaryId && otherLabel ? (
              <button
                type="button"
                className="install__link install__link--btn"
                data-od-id="install-wrong-browser"
                aria-expanded={showOther}
                onClick={() => setShowOther((v) => !v)}
              >
                {showOther ? 'Hide other browser' : `Need ${otherLabel}?`}
              </button>
            ) : null}
          </div>
        </div>
      </main>

      <footer className="install__footer">
        <Link to="/privacy" className="u-mono install__footer-link">
          Privacy
        </Link>
        <Link to="/terms" className="u-mono install__footer-link">
          Terms
        </Link>
        <Link to="/help" className="u-mono install__footer-link">
          Help
        </Link>
      </footer>
    </div>
  );
}

function BrowserChoice({
  browser,
  onDownloadClick,
}: {
  browser: InstallBrowserArtifact;
  onDownloadClick: () => void;
}): React.ReactElement {
  const manual = showManualDownload(browser.availability);
  const store = showStoreCta(browser.availability) && Boolean(browser.storeUrl);

  return (
    <div
      className="install-choice"
      data-od-id={`install-browser-${browser.id}`}
    >
      <div className="install-choice__copy">
        <h2 className="u-serif install-choice__name">{browser.label}</h2>
        {browser.availability === 'unavailable' ? (
          <p className="u-sans install-choice__unavailable">Not available yet</p>
        ) : null}
      </div>

      {browser.availability !== 'unavailable' ? (
        <div className="install-choice__actions">
          {manual ? (
            <a
              className="btn primary install-choice__download"
              href={browser.downloadHref}
              data-od-id={`install-download-${browser.id}`}
              download
              onClick={onDownloadClick}
            >
              Download
            </a>
          ) : null}
          {store && browser.storeUrl ? (
            <a
              className={`btn${manual ? ' ghost' : ' primary'} install-choice__store sm`}
              href={browser.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-od-id={`install-store-${browser.id}`}
            >
              {browser.storeLabel ?? 'Open store'}
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
