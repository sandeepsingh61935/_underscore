import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/core/context/AppProvider';
import { Logo } from '@/ui-system/components/primitives/Logo';
import { TrustSignal } from '@/ui-system/components/primitives/TrustSignal';

export interface WelcomePageProps {
    onStartClick?: () => void;
}

/**
 * Welcome Page — landing experience
 * Centered layout: Logo (lg) + tagline + CTA → /mode + trust signal + footer
 */
export function WelcomePage({ onStartClick }: WelcomePageProps = {}) {
    const navigate = useNavigate();
    const { isAuthenticated } = useApp();

    React.useEffect(() => {
        if (isAuthenticated && !onStartClick) {
            navigate('/mode');
        }
    }, [isAuthenticated, navigate, onStartClick]);

    return (
        <div
            className="h-full overflow-y-auto w-full flex flex-col items-center justify-center"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            <div className="flex flex-col items-center text-center max-w-[480px] px-6 py-12 gap-0">
                {/* Logo badge */}
                <Logo size="lg" showText={false} className="mb-6" />

                {/* App name */}
                <h1
                    className="text-[36px] font-light tracking-[-0.02em] mb-4"
                    style={{ color: 'var(--text-primary)' }}
                >
                    underscore
                </h1>

                {/* Tagline */}
                <p
                    className="text-[16px] leading-relaxed mb-10"
                    style={{ color: 'var(--text-secondary)' }}
                >
                    Highlight what matters.<br />
                    Everything else fades away.
                </p>

                {/* CTA */}
                <button
                    onClick={() => {
                        if (onStartClick) onStartClick();
                        else navigate('/mode');
                    }}
                    className="flex items-center gap-2 px-8 py-[14px] rounded-[var(--radius)] text-[15px] font-medium tracking-[0.01em] text-white border-none cursor-pointer transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-2 mb-6"
                    style={{
                        background: 'var(--accent)',
                        boxShadow: '0 2px 8px color-mix(in srgb, var(--accent) 30%, transparent)',
                    }}
                >
                    Get started <span>→</span>
                </button>

                {/* Trust signal */}
                <TrustSignal />
            </div>

            {/* Footer */}
            <div
                className="fixed bottom-0 left-0 right-0 flex items-center justify-center gap-6 py-4"
                style={{ borderTop: '1px solid var(--border)' }}
            >
                <Link
                    to="/privacy"
                    className="text-xs no-underline transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    Privacy
                </Link>
                <a
                    href="#terms"
                    className="text-xs no-underline transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    Terms
                </a>
                <a
                    href="#help"
                    className="text-xs no-underline transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    Help
                </a>
            </div>
        </div>
    );
}
