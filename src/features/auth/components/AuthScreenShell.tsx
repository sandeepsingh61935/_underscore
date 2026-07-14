import React from 'react';

import { Logo } from '@/ui-system/components/primitives/Logo';

export interface AuthScreenShellProps {
    /** 'web' = full-viewport centered card. 'popup' = body-only, fills the 400x600 popup shell. */
    variant: 'web' | 'popup';
    title: string;
    subtitle?: React.ReactNode;
    /** Mono job kicker above the title, e.g. "Confirm email" / "Reset password". */
    kicker?: string;
    /** Left accent marginalia rail (default true). */
    showRail?: boolean;
    error?: string | null;
    /** Primary content: form, OTP input, action buttons. */
    children: React.ReactNode;
    /** Rendered below `children` — toggle links, "Back to sign in", legal text. */
    footer?: React.ReactNode;
}

const CONTAINER_STYLE: Record<AuthScreenShellProps['variant'], React.CSSProperties> = {
    web: {
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--paper)',
        color: 'var(--ink)',
    },
    popup: {
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        backgroundColor: 'var(--paper)',
        color: 'var(--ink)',
        overflowY: 'auto',
    },
};

const INNER_STYLE: Record<AuthScreenShellProps['variant'], React.CSSProperties> = {
    web: { width: '100%', maxWidth: 400, padding: '48px 24px' },
    popup: {
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        padding: '32px 24px',
        width: '100%',
        maxWidth: 380,
        margin: '0 auto',
    },
};

/**
 * Shared chrome for OTP-driven auth screens — verify email, forgot password,
 * reset password — across the web SPA and extension popup.
 *
 * Signature: a 3px accent marginalia rail + mono job kicker so these screens
 * read as desk annotation (product DNA) rather than a generic bank OTP widget.
 */
export function AuthScreenShell({
    variant,
    title,
    subtitle,
    kicker,
    showRail = true,
    error,
    children,
    footer,
}: AuthScreenShellProps): React.ReactElement {
    const content = (
        <>
            {kicker ? (
                <p
                    className="u-mono"
                    style={{
                        fontSize: 'var(--step--2)',
                        letterSpacing: '0.14em',
                        textTransform: 'uppercase',
                        color: 'var(--ink-3)',
                        margin: '0 0 8px',
                        textAlign: showRail ? 'left' : 'center',
                    }}
                >
                    {kicker}
                </p>
            ) : null}

            <h1
                className="u-serif"
                style={{
                    fontSize: 'var(--step-3)',
                    fontWeight: 500,
                    color: 'var(--ink)',
                    textAlign: showRail ? 'left' : 'center',
                    margin: '0 0 8px',
                }}
            >
                {title}
            </h1>

            {subtitle ? (
                <p
                    className="u-sans"
                    style={{
                        fontSize: variant === 'web' ? 'var(--step-0)' : 'var(--step--1)',
                        color: 'var(--ink-3)',
                        textAlign: showRail ? 'left' : 'center',
                        margin: '0 0 24px',
                        lineHeight: 1.45,
                    }}
                >
                    {subtitle}
                </p>
            ) : (
                <div style={{ marginBottom: 16 }} />
            )}

            {error ? (
                <div
                    role="alert"
                    className="u-sans"
                    style={{
                        marginBottom: 16,
                        padding: '12px 14px',
                        borderRadius: 'var(--radius)',
                        border: '1px solid var(--rule)',
                        background: 'var(--accent-tint-08)',
                        color: 'var(--ink)',
                        fontSize: 'var(--step--1)',
                        textAlign: 'left',
                    }}
                >
                    {error}
                </div>
            ) : null}

            {children}

            {footer ? <div style={{ marginTop: 16 }}>{footer}</div> : null}
        </>
    );

    return (
        <div style={CONTAINER_STYLE[variant]}>
            <div style={INNER_STYLE[variant]}>
                <div style={{ display: 'flex', justifyContent: showRail ? 'flex-start' : 'center', marginBottom: variant === 'web' ? 32 : 28 }}>
                    <Logo size={variant === 'web' ? 'md' : 'sm'} showText={variant === 'web'} />
                </div>

                {showRail ? (
                    <div style={{ display: 'flex', gap: 12, alignItems: 'stretch' }}>
                        <div
                            aria-hidden
                            style={{
                                width: 3,
                                flexShrink: 0,
                                borderRadius: 1,
                                background: 'var(--accent)',
                                alignSelf: 'stretch',
                            }}
                        />
                        <div style={{ flex: 1, minWidth: 0 }}>{content}</div>
                    </div>
                ) : (
                    content
                )}
            </div>
        </div>
    );
}
