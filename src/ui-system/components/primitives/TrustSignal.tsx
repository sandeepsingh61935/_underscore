/**
 * Wireframe: ui_kits/extension/v2/primitives.jsx L746-760 (V2_TrustSignal)
 * V2 contract:
 *   - Container: inline-flex, items center, gap 8.
 *   - Lock SVG: 12x12, viewBox 0 0 24 24, stroke var( --ink-3 ), strokeWidth 1.6.
 *   - Text: "Your data stays yours — encrypted and private", .u-sans, 11px, var( --ink-3 ), 0.02em tracking.
 */
import React from 'react';

export interface TrustSignalProps {
    className?: string;
}

export function TrustSignal({ className }: TrustSignalProps): React.ReactElement {
    return (
        <div
            className={className}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}
        >
            <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var( --ink-3 )"
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
            >
                <rect x="3" y="11" width="18" height="11" rx="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
            <span
                className="u-sans"
                style={{ fontSize: 11, color: 'var( --ink-3 )', letterSpacing: '0.02em' }}
            >
                Your data stays yours — encrypted and private
            </span>
        </div>
    );
}
