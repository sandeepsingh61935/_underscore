/**
 * Quiet mono text action — Edit / Copy / Delete / Sync / Sign out.
 * Wireframe: ui_kits/extension/v3/primitives.jsx BtnText + product.css .btn-text
 */
import React, { type ButtonHTMLAttributes, forwardRef } from 'react';

export interface BtnTextProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  danger?: boolean;
  muted?: boolean;
  accent?: boolean;
}

export const BtnText = forwardRef<HTMLButtonElement, BtnTextProps>(
  (
    {
      className = '',
      danger = false,
      muted = false,
      accent = false,
      type = 'button',
      children,
      ...props
    },
    ref
  ): React.ReactElement => {
    const classes = [
      'btn-text',
      danger ? 'is-danger' : '',
      muted ? 'is-muted' : '',
      accent ? 'is-accent' : '',
      className,
    ]
      .filter(Boolean)
      .join(' ');

    return (
      <button ref={ref} type={type} className={classes} {...props}>
        {children}
      </button>
    );
  }
);

BtnText.displayName = 'BtnText';
