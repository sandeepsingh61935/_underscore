import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import {
  detectInstallBrowser,
  getInstallDistributionConfig,
  showManualDownload,
  showStoreCta,
  type InstallBrowserArtifact,
  type InstallBrowserDetect,
  type InstallDistributionConfig,
} from '@/web/install/install-distribution';

export interface InstallPageProps {
  /** Test seam: inject distribution config. */
  config?: InstallDistributionConfig;
  /** Test seam: inject browser detect result. */
  detectedBrowser?: InstallBrowserDetect;
}

/**
 * Public install hub — Welcome → /install → home (soft gate).
 * Downloads only; load steps live on Help (#install).
 */
export function InstallPage({
  config: configProp,
  detectedBrowser: detectedProp,
}: InstallPageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const config = useMemo(
    () => configProp ?? getInstallDistributionConfig(),
    [configProp],
  );
  const detected = detectedProp ?? detectInstallBrowser();
  const browsers = config.browsers;
  const version = config.version;

  return (
    <div className="install" data-od-id="install" data-platform="web">
      <main className="install__main">
        <header className="install__intro">
          <h1 className="u-serif install__title">Install the extension</h1>
          <p className="u-sans install__lede">
            Capture on the page. Open this site for your library.
          </p>
          <p className="u-mono install__meta" data-od-id="install-status">
            <span data-od-id="install-desktop-note">Desktop Chrome &amp; Firefox</span>
            <span className="install__meta-sep" aria-hidden="true">
              ·
            </span>
            <span>{config.statusLine}</span>
            <span className="install__meta-sep" aria-hidden="true">
              ·
            </span>
            <span>v{version}</span>
          </p>
        </header>

        <div className="install__browsers" data-od-id="install-browsers" role="list">
          {browsers.map((browser) => (
            <BrowserChoice
              key={browser.id}
              browser={browser}
              suggested={detected !== 'unknown' && browser.id === detected}
            />
          ))}
        </div>

        <nav className="install__nav" aria-label="Install options">
          <Link to={config.helpHref} className="install__help-link" data-od-id="install-help">
            How to load it
          </Link>
          <button
            type="button"
            className="install__continue-text"
            data-od-id="install-continue"
            onClick={() => navigate('/home')}
          >
            Continue without installing
          </button>
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

function BrowserChoice({
  browser,
  suggested,
}: {
  browser: InstallBrowserArtifact;
  suggested: boolean;
}): React.ReactElement {
  const manual = showManualDownload(browser.availability);
  const store = showStoreCta(browser.availability) && Boolean(browser.storeUrl);

  return (
    <div
      className={`install-choice${suggested ? ' install-choice--active' : ''}`}
      data-od-id={`install-browser-${browser.id}`}
      data-suggested={suggested ? 'true' : 'false'}
      role="listitem"
    >
      <div className="install-choice__label">
        <h2 className="u-serif install-choice__name">{browser.label}</h2>
        {suggested ? (
          <span className="u-mono install-choice__hint">Detected</span>
        ) : null}
      </div>

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
              {browser.storeLabel ?? 'Store'}
            </a>
          ) : null}
        </div>
      )}
    </div>
  );
}
