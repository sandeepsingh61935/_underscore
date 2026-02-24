import React from 'react';
import { Link } from 'react-router-dom';
import { Logo } from '@/ui-system/components/primitives/Logo';

/**
 * Privacy Policy Page — matches privacy.html mockup
 * Article-style layout with clear typography, section headers, callout boxes
 */
export function PrivacyPage() {
    return (
        <div
            className="min-h-screen flex flex-col items-center"
            style={{ background: 'var(--bg)', color: 'var(--text-primary)' }}
        >
            {/* Header */}
            <header className="w-full max-w-[640px] flex justify-center items-center py-6 px-6">
                <Link to="/" className="no-underline">
                    <Logo size="md" />
                </Link>
            </header>

            <article className="w-full max-w-[640px] px-6 pb-12">
                <Link
                    to="/"
                    className="inline-flex items-center gap-1.5 text-[13px] no-underline mb-5 transition-colors hover:text-[var(--accent)]"
                    style={{ color: 'var(--text-tertiary)' }}
                >
                    ← Back
                </Link>

                <h1
                    className="text-[28px] font-semibold mb-2"
                    style={{ color: 'var(--text-primary)' }}
                >
                    Privacy Policy
                </h1>
                <p className="text-[13px] mb-8" style={{ color: 'var(--text-tertiary)' }}>
                    Last updated: February 2026
                </p>

                {/* Callout */}
                <div
                    className="p-4 rounded-[var(--radius)] mb-8"
                    style={{
                        background: 'var(--accent-soft)',
                        border: '1px solid var(--border)',
                    }}
                >
                    <p className="text-[14px] leading-relaxed" style={{ color: 'var(--accent-text)' }}>
                        <strong>TL;DR</strong> — Your data stays on your device. We don't track, sell, or share
                        your browsing activity or highlights with anyone. Period.
                    </p>
                </div>

                <PolicySection title="What we collect">
                    <p>We collect the minimum data necessary to provide the service:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Account information (email, display name) when you create an account</li>
                        <li>Highlight data you explicitly save in Capture, Memory, or Neural modes</li>
                        <li>Basic usage analytics (page views, feature usage) — no personal data</li>
                    </ul>
                </PolicySection>

                <PolicySection title="What we don't collect">
                    <ul className="list-disc pl-5 space-y-1">
                        <li>Browsing history outside of your explicit highlights</li>
                        <li>Personal information beyond what you provide at signup</li>
                        <li>Data from Focus mode — it lives only in your browser session</li>
                    </ul>
                </PolicySection>

                <PolicySection title="Data storage">
                    <p>
                        All data is stored locally in your browser using IndexedDB.
                        When you enable cloud sync, your data is encrypted end-to-end before leaving your device.
                        We use AES-256 encryption — even we can't read your highlights.
                    </p>
                </PolicySection>

                <PolicySection title="Your rights">
                    <p>You can:</p>
                    <ul className="list-disc pl-5 mt-2 space-y-1">
                        <li>Export all your data at any time (Settings → Data)</li>
                        <li>Delete your account and all associated data</li>
                        <li>Use Focus mode without creating an account</li>
                    </ul>
                </PolicySection>

                <PolicySection title="Contact">
                    <p>
                        Questions? Email us at{' '}
                        <a href="mailto:privacy@underscore.dev" className="underline" style={{ color: 'var(--accent-text)' }}>
                            privacy@underscore.dev
                        </a>
                    </p>
                </PolicySection>
            </article>
        </div>
    );
}

function PolicySection({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mb-6">
            <h2
                className="text-[17px] font-semibold mb-3"
                style={{ color: 'var(--text-primary)' }}
            >
                {title}
            </h2>
            <div className="text-[14px] leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                {children}
            </div>
        </section>
    );
}
