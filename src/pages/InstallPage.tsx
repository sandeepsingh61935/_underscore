import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/ui-system/components/primitives/Button';
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
  // Stable two-column order: Chrome | Firefox (detect only marks Suggested).
  const browsers = config.browsers;

  return (
    <div className="install" data-od-id="install" data-platform="web">
      <main className="install__main">
        <h1 className="u-serif install__title">
          You need the extension to capture highlights
        </h1>
        <p className="u-sans install__lede">
          The extension saves text on the pages you browse. This site is your library.
        </p>
        <p className="u-sans install__status" data-od-id="install-status">
          {config.statusLine}
        </p>
        <p className="u-sans install__desktop-note" data-od-id="install-desktop-note">
          Desktop Chrome or Firefox only.
        </p>

        <div className="install__browsers" data-od-id="install-browsers">
          {browsers.map((browser) => (
            <BrowserCard
              key={browser.id}
              browser={browser}
              suggested={detected !== 'unknown' && browser.id === detected}
            />
          ))}
        </div>

        <p className="install__help-line">
          <Link to={config.helpHref} className="install__help-link" data-od-id="install-help">
            How to load the extension
          </Link>
        </p>

        <div className="install__actions">
          <Button
            variant="default"
            className="install__continue"
            data-od-id="install-continue"
            onClick={() => navigate('/home')}
          >
            Continue without installing
          </Button>
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

function BrowserCard({
  browser,
  suggested,
}: {
  browser: InstallBrowserArtifact;
  suggested: boolean;
}): React.ReactElement {
  const manual = showManualDownload(browser.availability);
  const store = showStoreCta(browser.availability) && Boolean(browser.storeUrl);

  return (
    <article
      className={`install-browser${suggested ? ' install-browser--suggested' : ''}`}
      data-od-id={`install-browser-${browser.id}`}
      data-suggested={suggested ? 'true' : 'false'}
    >
      <header className="install-browser__head">
        <h2 className="u-sans install-browser__name">{browser.label}</h2>
        <span className="u-mono install-browser__version">v{browser.version}</span>
      </header>

      {suggested ? (
        <p className="u-mono install-browser__chip">Your browser</p>
      ) : null}

      {browser.availability === 'unavailable' ? (
        <p className="u-sans install-browser__unavailable">Not available yet.</p>
      ) : (
        <div className="install-browser__ctas">
          {manual ? (
            <a
              className="btn primary install-browser__download"
              href={browser.downloadHref}
              data-od-id={`install-download-${browser.id}`}
              download
            >
              {browser.downloadLabel}
            </a>
          ) : null}
          {store && browser.storeUrl ? (
            <a
              className={`btn${manual ? '' : ' primary'} install-browser__store`}
              href={browser.storeUrl}
              target="_blank"
              rel="noopener noreferrer"
              data-od-id={`install-store-${browser.id}`}
            >
              {browser.storeLabel ?? `Chrome Web Store`}
            </a>
          ) : null}
        </div>
      )}
    </article>
  );
}
