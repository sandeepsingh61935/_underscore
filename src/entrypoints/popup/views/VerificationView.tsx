import React, { useEffect, useState } from 'react';

import { Logo } from '../../../ui-system/components/primitives/Logo';

interface VerificationViewProps {
    email: string;
    expiresAt: number | null;
    onCheckVerification: () => void;
    onCancel: () => void;
}

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
        <div className="w-full h-full flex flex-col items-center max-w-[380px] mx-auto overflow-y-auto px-6">
            {/* Logo area */}
            <div className="flex flex-col items-center mb-8 shrink-0 mt-8">
                <Logo size="lg" showText={true} />
            </div>

            <main className="flex-1 flex flex-col items-center w-full">
                {/* Visual Icon Container */}
                <div className="w-16 h-16 rounded-full bg-primary-container flex items-center justify-center mb-6 text-primary">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                </div>

                <h1 className="text-headline-small text-on-surface mb-2 text-center">
                    Check your email
                </h1>

                <p className="text-body-medium text-on-surface-variant mb-6 text-center">
                    We've sent a verification link to <span className="font-medium text-on-surface">{email}</span>.
                    Please click the link to verify your account.
                </p>

                {/* Status Card */}
                <div className="w-full bg-surface-container rounded-md p-4 mb-8 border border-outline-variant flex flex-col items-center">
                    {isExpired ? (
                        <div className="text-error text-label-large mb-1 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            Verification Expired
                        </div>
                    ) : (
                        <>
                            <div className="text-label-small text-on-surface-variant uppercase tracking-wider mb-1">
                                Time remaining
                            </div>
                            <div className="text-display-small text-primary font-variant-numeric tabular-nums">
                                {formatTime(timeLeft)}
                            </div>
                        </>
                    )}
                </div>

                {/* Actions */}
                <div className="w-full flex flex-col gap-3">
                    <button
                        type="button"
                        onClick={onCheckVerification}
                        className={`
                            min-h-[48px] w-full rounded-full text-label-large font-medium transition-all ease-standard duration-short
                            bg-primary text-on-primary border-none cursor-pointer
                            hover:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_8%,var(--md-sys-color-primary))]
                            active:bg-[color-mix(in_srgb,var(--md-sys-color-on-primary)_12%,var(--md-sys-color-primary))]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                            disabled:opacity-disabled disabled:pointer-events-none
                        `}
                    >
                        I've verified my email
                    </button>

                    <button
                        type="button"
                        onClick={onCancel}
                        className={`
                            min-h-[48px] w-full rounded-full text-label-large font-medium transition-all ease-standard duration-short
                            bg-transparent text-primary border border-outline cursor-pointer
                            hover:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_8%,transparent)]
                            active:bg-[color-mix(in_srgb,var(--md-sys-color-primary)_12%,transparent)]
                            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2
                        `}
                    >
                        {isExpired ? 'Try again' : 'Cancel'}
                    </button>
                </div>
            </main>
        </div>
    );
}
