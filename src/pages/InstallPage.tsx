import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';

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
}

/**
 * Install hub — single-browser download when UA known; guest hard gate (no continue).
 */
export function InstallPage({
  config: configProp,
  detectedBrowser: detectedProp,
}: InstallPageProps = {}): React.ReactElement {
  const config = useMemo(
    () => configProp ?? getInstallDistributionConfig(),
    [configProp],
  );
  const detected = detectedProp ?? detectInstallBrowser();
  const [showOther, setShowOther] = useState(false);

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

  return (
    <div className="install" data-od-id="install" data-platform="web">
      <main className="install__main">
        <header className="install__intro">
          <h1 className="u-serif install__title">Install the extension</h1>
          <p className="u-sans install__lede" data-od-id="install-lede">
            You must download and load the extension to use the app. It captures
            highlights on the page; this site is your library.
          </p>
        </header>

        <div
          className={`install__browsers${visible.length === 1 ? ' install__browsers--single' : ''}`}
          data-od-id="install-browsers"
          role="list"
        >
          {visible.map((browser) => (
            <BrowserChoice key={browser.id} browser={browser} />
          ))}
        </div>

        {primaryId && otherLabel ? (
          <p className="install__wrong">
            <button
              type="button"
              className="install__wrong-btn"
              data-od-id="install-wrong-browser"
              aria-expanded={showOther}
              onClick={() => setShowOther((v) => !v)}
            >
              {showOther ? 'Hide other browser' : `Wrong browser? Get ${otherLabel}`}
            </button>
          </p>
        ) : null}

        <nav className="install__nav" aria-label="Install help">
          <Link to={config.helpHref} className="install__help-link" data-od-id="install-help">
            How to load it
          </Link>
        </nav>
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

function BrowserChoice({ browser }: { browser: InstallBrowserArtifact }): React.ReactElement {
  const manual = showManualDownload(browser.availability);
  const store = showStoreCta(browser.availability) && Boolean(browser.storeUrl);

  return (
    <div
      className="install-choice"
      data-od-id={`install-browser-${browser.id}`}
      role="listitem"
    >
      <h2 className="u-serif install-choice__name">{browser.label}</h2>

      {browser.availability === 'unavailable' ? (
        <p className="u-sans install-choice__unavailable">Not available yet</p>
      ) : (
        <div className="install-choice__actions">
          {manual ? (
            <a
              className="btn primary install-choice__download"
              href={browser.downloadHref}
              data-od-id={`install-download-${browser.id}`}
              download
            >
              Download for {browser.label}
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
      )}
    </div>
  );
}
