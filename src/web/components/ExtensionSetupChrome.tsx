import React from 'react';
import { Link } from 'react-router-dom';

import type { ExtensionNoticeView } from '@/web/lib/resolve-extension-notice';
import type { InstallContinueState } from '@/web/routing/install-continue-to';

export function ExtensionSetupStrip({
  view,
  from,
  onDismiss,
}: {
  view: Extract<ExtensionNoticeView, { surface: 'strip' }>;
  from: string;
  onDismiss: () => void;
}): React.ReactElement {
  const { copy, variant } = view;
  const installState: InstallContinueState = { from };
  return (
    <div
      className="ext-notice"
      data-od-id="ext-notice"
      data-kind={variant}
      role="status"
    >
      <p className="ext-notice__body">{copy.body}</p>
      <div className="ext-notice__actions">
        {copy.installHref && copy.installLabel ? (
          <Link
            to={copy.installHref}
            state={installState}
            className="btn accent sm"
            data-od-id="ext-notice-install"
          >
            {copy.installLabel}
          </Link>
        ) : null}
        {copy.signInLabel ? (
          <Link to="/sign-in" className="btn sm" data-od-id="ext-notice-signin">
            {copy.signInLabel}
          </Link>
        ) : null}
        <button
          type="button"
          className="ext-notice__hide"
          data-od-id="ext-notice-hide"
          aria-label={copy.hideAriaLabel}
          onClick={onDismiss}
        >
          Hide
        </button>
      </div>
    </div>
  );
}

export function ExtensionSetupRemnant({
  view,
  from,
}: {
  view: Extract<ExtensionNoticeView, { surface: 'remnant' }>;
  from: string;
}): React.ReactElement {
  const { copy } = view;
  const installState: InstallContinueState = { from };
  return (
    <Link
      to={copy.href}
      state={installState}
      className="sb-ext-remnant"
      data-od-id="ext-notice-remnant"
      title={copy.label}
      aria-label={copy.label}
    >
      <span className="sb-ext-remnant-ico" aria-hidden="true">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.75"
        >
          <path d="M8 3h3v3H8zM13 3h3v3h-3zM8 18h3v3H8zM13 18h3v3h-3zM3 8h3v3H3zM18 8h3v3h-3zM3 13h3v3H3zM18 13h3v3h-3zM8 8h8v8H8z" />
        </svg>
      </span>
      <span className="sb-ext-remnant-label">{copy.label}</span>
    </Link>
  );
}
