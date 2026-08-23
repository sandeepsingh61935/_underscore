import React from 'react';
import { Link, useNavigate } from 'react-router-dom';

import { useApp } from '@/core/context/AppProvider';
import { Button } from '@/ui-system/components/primitives/Button';
import { Logo } from '@/ui-system/components/primitives/Logo';

export interface WelcomePageProps {
  onStartClick?: () => void;
}

/**
 * Welcome Page — landing experience.
 * Web SPA: fluid viewport canvas (`welcome--web`).
 * Extension popup: compact layout (`welcome--popup`) when `onStartClick` is set.
 */
export function WelcomePage({ onStartClick }: WelcomePageProps = {}): React.ReactElement {
  const navigate = useNavigate();
  const { isAuthenticated } = useApp();
  const isWeb = !onStartClick;

  React.useEffect(() => {
    if (isAuthenticated && !onStartClick) {
      navigate('/home');
    }
  }, [isAuthenticated, navigate, onStartClick]);

  return (
    <div
      className={`welcome ${isWeb ? 'welcome--web' : 'welcome--popup'}`}
      data-od-id="welcome"
      data-platform={isWeb ? 'web' : 'popup'}
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
          variant="primary"
          className="welcome__cta"
          data-od-id="welcome-get-started"
          onClick={() => {
            if (onStartClick) onStartClick();
            else navigate('/install');
          }}
        >
          Get started →
        </Button>

        {isWeb ? (
          <Link
            to="/home"
            className="u-mono welcome__already"
            data-od-id="welcome-already-setup"
          >
            Already set up? Open library
          </Link>
        ) : null}

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
