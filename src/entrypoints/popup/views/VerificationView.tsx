import React, { useEffect, useState } from 'react';

import { Logo } from '../../../ui-system/components/primitives/Logo';

interface VerificationViewProps {
    email: string;
    expiresAt: number | null;
    onCheckVerification: () => void;
    onCancel: () => void;
}

/**
 * VerificationView — V2 Editorial migration of the email verification screen.
 *
 * Body-only root: `display: flex, flex-direction: column, height: 100%, width: 100%`.
 * PopupShell owns the 400x600 chrome; this view returns body content only.
 *
 * V2 token map applied:
 *   - bg-primary-container (icon)  -> var(--accent-tint-08)
 *   - text-primary                 -> var(--accent)
 *   - bg-surface-container         -> var(--paper-2)
 *   - text-on-surface / -variant   -> var(--ink) / var(--ink-3)
 *   - border-outline-variant       -> var(--rule-soft)
 *   - text-error                   -> var(--accent) (V2 single-accent: errors use --accent)
 *   - text-display-small           -> var(--step-5) (timer numeral)
 *   - text-headline-small          -> var(--step-3) (heading)
 *   - text-body-medium             -> var(--step-0) (paragraph)
 *   - text-label-large             -> var(--step--1) (button)
 *   - text-label-small             -> var(--step--2) (caption)
 *   - min-h-[48px]                 -> minHeight: 44
 *   - var(--md-sys-color-*)        -> removed (cat-1-md3)
 *   - rounded-full                 -> var(--radius)
 *   - duration-short               -> var(--step-0) (V2 standard motion 180ms)
 *
 * Behavior preserved: setInterval timer at 1000ms, formatTime(2:30 style),
 * isExpired transition, button copy.
 */
export function VerificationView({
    email,
    expiresAt,
    onCheckVerification,
    onCancel,
}: VerificationViewProps): React.ReactElement {
    const [timeLeft, setTimeLeft] = useState<number>(0);
    const [isExpired, setIsExpired] = useState(false);

    useEffect(() => {
        if (!expiresAt) return;

        const updateTimer = (): void => {
            const now = Date.now();
            const remaining = Math.max(0, expiresAt - now);
            setTimeLeft(remaining);

            if (remaining === 0) {
                setIsExpired(true);
            }
        };

        updateTimer();
        const intervalId = setInterval(updateTimer, 1000);

        return () => clearInterval(intervalId);
    }, [expiresAt]);

    const formatTime = (ms: number): string => {
        const seconds = Math.ceil(ms / 1000);
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div
            style={{
                width: '100%',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: 380,
                margin: '0 auto',
                overflowY: 'auto',
                padding: '0 24px',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
            }}
        >
            {/* Logo area */}
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginTop: 32,
                    marginBottom: 32,
                    flexShrink: 0,
                }}
            >
                <Logo size="lg" showText={true} />
            </div>

            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    width: '100%',
                }}
            >
                {/* Visual Icon Container */}
                <div
                    style={{
                        width: 64,
                        height: 64,
                        borderRadius: '50%',
                        backgroundColor: 'var(--accent-tint-08)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 24,
                        color: 'var(--accent)',
                    }}
                >
                    <svg
                        width="32"
                        height="32"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                        />
                    </svg>
                </div>

                <h1
                    className="u-serif"
                    style={{
                        fontSize: 'var(--step-3)',
                        fontWeight: 500,
                        color: 'var(--ink)',
                        margin: '0 0 8px',
                        textAlign: 'center',
                    }}
                >
                    Check your email
                </h1>

                <p
                    className="u-sans"
                    style={{
                        fontSize: 'var(--step-0)',
                        color: 'var(--ink-3)',
                        margin: '0 0 24px',
                        textAlign: 'center',
                    }}
                >
                    We&apos;ve sent a verification link to{' '}
                    <span style={{ fontWeight: 500, color: 'var(--ink)' }}>{email}</span>.
                    Please click the link to verify your account.
                </p>

                {/* Status Card */}
                <div
                    style={{
                        width: '100%',
                        backgroundColor: 'var(--paper-2)',
                        borderRadius: 'var(--radius)',
                        padding: 16,
                        marginBottom: 32,
                        border: '1px solid var(--rule-soft)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                    }}
                >
                    {isExpired ? (
                        <div
                            className="u-sans"
                            style={{
                                color: 'var(--accent)',
                                fontSize: 'var(--step--1)',
                                fontWeight: 500,
                                marginBottom: 4,
                                display: 'flex',
                                alignItems: 'center',
                                gap: 8,
                            }}
                        >
                            <svg
                                width="16"
                                height="16"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                            Verification Expired
                        </div>
                    ) : (
                        <>
                            <div
                                className="u-mono"
                                style={{
                                    color: 'var(--ink-3)',
                                    fontSize: 'var(--step--2)',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.14em',
                                    marginBottom: 4,
                                }}
                            >
                                Time remaining
                            </div>
                            <div
                                className="u-serif"
                                style={{
                                    fontSize: 'var(--step-5)',
                                    color: 'var(--accent)',
                                    fontVariantNumeric: 'tabular-nums',
                                    lineHeight: 1,
                                }}
                            >
                                {formatTime(timeLeft)}
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 12,
                    }}
                >
                    <button
                        type="button"
                        onClick={onCheckVerification}
                        style={{
                            minHeight: 44,
                            width: '100%',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--accent)',
                            color: 'var(--accent-ink)',
                            border: 'none',
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            fontWeight: 500,
                            transition: 'opacity 0.18s var(--ease-standard)',
                        }}
                    >
                        I&apos;ve verified my email
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        style={{
                            minHeight: 44,
                            width: '100%',
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'transparent',
                            color: 'var(--accent)',
                            border: '1px solid var(--rule)',
                            cursor: 'pointer',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            fontWeight: 500,
                            transition: 'opacity 0.18s var(--ease-standard)',
                        }}
                    >
                        {isExpired ? 'Try again' : 'Cancel'}
                    </button>
                </div>
            </main>
        </div>
    );
}
