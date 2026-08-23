import React, { useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';
import {
  detectInstallBrowser,
  getInstallDistributionConfig,
  orderInstallBrowsers,
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
 * Public install onboarding — Welcome → /install → home (soft gate).
 * Design: V2 editorial folio (PRD 2026-08-23 + frontend-design pass).
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
  const browsers = useMemo(
    () => orderInstallBrowsers(config.browsers, detected),
    [config.browsers, detected],
  );

  return (
    <div className="install" data-od-id="install" data-platform="web">
      <div className="install__column">
        <div className="install__brand">
          <Logo size="md" showText={false} />
        </div>

        <p className="u-mono u-caps install__kicker">Install</p>
        <div className="install__title-rule" aria-hidden="true" />

        <h1 className="u-serif install__title">
          Capture lives in the{' '}
          <span className="install__title-mark">extension</span>
        </h1>

        <p className="u-sans install__lede">
          underscore saves highlights from pages you browse. This web app is your library
          — it shows what the extension captures.
        </p>

        <div className="install__rail" aria-hidden="true">
          <span className="u-mono install__rail-cap">Browser</span>
          <span className="install__rail-line" />
          <span className="u-mono install__rail-cap">Library</span>
        </div>

        <section className="install__section" aria-labelledby="install-status-heading">
          <h2 id="install-status-heading" className="u-mono u-caps install__section-kicker">
            Status
          </h2>
          <p className="u-sans install__status" data-od-id="install-status">
            {config.statusLine}
          </p>
        </section>

        <section className="install__section" aria-labelledby="install-browsers-heading">
          <h2 id="install-browsers-heading" className="u-mono u-caps install__section-kicker">
            Install
          </h2>
          <p className="u-sans install__desktop-note" data-od-id="install-desktop-note">
            Works in desktop Chrome or Firefox. Mobile browsers can&apos;t run the extension.
          </p>

          <div className="install__browsers">
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
              Full install steps
            </Link>
          </p>
        </section>

        <div className="install__actions">
          <Button
            variant="default"
            className="install__continue"
            data-od-id="install-continue"
            onClick={() => navigate('/home')}
          >
            Continue without installing
          </Button>
          <Link to="/" className="u-mono install__back" data-od-id="install-back-welcome">
            Back to welcome
          </Link>
        </div>
      </div>

      <div className="install__footer">
        <Link to="/privacy" className="u-mono install__footer-link">
          Privacy
        </Link>
        <Link to="/terms" className="u-mono install__footer-link">
          Terms
        </Link>
        <Link to="/help" className="u-mono install__footer-link">
          Help
        </Link>
      </div>
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
        <h3 className="u-sans install-browser__name">{browser.label}</h3>
        <div className="install-browser__meta">
          <span className="u-mono install-browser__version">v{browser.version}</span>
          {suggested ? (
            <span className="u-mono install-browser__chip">Suggested</span>
          ) : null}
        </div>
      </header>

      {browser.availability === 'unavailable' ? (
        <p className="u-sans install-browser__unavailable">
          Install for {browser.label} is not available yet.
        </p>
      ) : (
        <>
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
                {browser.storeLabel ?? `Get it for ${browser.label}`}
              </a>
            ) : null}
          </div>

          {manual ? (
            <ol className="install-browser__steps">
              {browser.steps.map((step) => (
                <li key={step} className="u-sans">
                  {step}
                </li>
              ))}
            </ol>
          ) : null}
        </>
      )}
    </article>
  );
}
