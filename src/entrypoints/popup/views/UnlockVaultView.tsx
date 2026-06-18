/**
 * @file UnlockVaultView.tsx
 * @description User-facing vault unlock prompt (ADR-018).
 *
 * Closes the UI side of ADR-012 (master key derived from user passphrase via
 * PBKDF2). After every MV3 service-worker restart the in-memory master key is
 * wiped; this view is the recovery path that asks the user to re-enter their
 * vault passphrase.
 *
 * V2 popup chrome contract: this view is body-only. The root is a single
 * flex column that fills the 400x600 box owned by PopupShell. No width/height
 * declarations here.
 *
 * V2 token map applied (mirrors AuthView):
 *   - background / text             -> var(--paper) / var(--ink)
 *   - secondary text                -> var(--ink-3)
 *   - submit (ink fill)             -> var(--ink) bg + var(--paper) text
 *   - error (single accent)         -> var(--accent-tint-08) bg + var(--rule) border + var(--accent) text
 *   - borders                       -> var(--rule)
 *   - typography                    -> .u-serif (heading), .u-sans (subtext), .u-mono (label)
 *   - font size scale               -> var(--step--1..4)
 *   - touch target                  -> minHeight: 44
 */

import React, { useState } from 'react';

interface UnlockVaultViewProps {
    /**
     * Triggered when the user submits the form. The view calls this with the
     * trimmed passphrase. Returns `{ success: true }` when the background
     * has derived the master key; the view then calls `onUnlockSuccess`.
     * Returns `{ success: false, error }` on any failure; the error is
     * surfaced inline.
     */
    onUnlock: (passphrase: string) => Promise<{ success: boolean; error?: string }>;
    /**
     * Called when the background reports a successful unlock. The popup
     * typically routes the user to COLLECTIONS from this callback.
     */
    onUnlockSuccess: () => void;
    /**
     * Called when the user presses the back button. The popup typically
     * routes back to MODE_SELECTION.
     */
    onCancel: () => void;
    /**
     * When true, the submit button is disabled and shows an in-flight label.
     * Defaults to false.
     */
    isUnlocking?: boolean;
}

export function UnlockVaultView({
    onUnlock,
    onUnlockSuccess,
    onCancel,
    isUnlocking = false,
}: UnlockVaultViewProps): React.ReactElement {
    const [passphrase, setPassphrase] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent): Promise<void> => {
        e.preventDefault();
        if (isUnlocking) return;
        setError(null);
        const result = await onUnlock(passphrase);
        if (result.success) {
            onUnlockSuccess();
            return;
        }
        setError(result.error || 'Unable to unlock vault. Please try again.');
    };

    return (
        <div
            style={{
                display: 'flex',
                flexDirection: 'column',
                width: '100%',
                height: '100%',
                backgroundColor: 'var(--paper)',
                color: 'var(--ink)',
            }}
        >
            <main
                style={{
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '32px 24px',
                    width: '100%',
                    maxWidth: 380,
                    margin: '0 auto',
                }}
            >
                {/* Heading — V2 serif italic accent */}
                <h1
                    className="u-serif"
                    style={{
                        fontSize: 'var(--step-4)',
                        fontWeight: 400,
                        color: 'var(--ink)',
                        textAlign: 'center',
                        letterSpacing: '-0.025em',
                        lineHeight: 1.25,
                        margin: '0 0 8px',
                    }}
                >
                    Unlock your <em>vault</em>
                </h1>
                <p
                    className="u-sans"
                    style={{
                        fontSize: 'var(--step--1)',
                        color: 'var(--ink-3)',
                        textAlign: 'center',
                        margin: '0 0 28px',
                    }}
                >
                    Enter the passphrase that protects your encrypted highlights.
                </p>

                {/* Passphrase form */}
                <form
                    onSubmit={handleSubmit}
                    style={{
                        width: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 8,
                        marginBottom: 12,
                    }}
                >
                    <label
                        className="u-mono"
                        htmlFor="vault-passphrase"
                        style={{
                            fontSize: 'var(--step--2)',
                            letterSpacing: '0.14em',
                            textTransform: 'uppercase',
                            color: 'var(--ink-3)',
                            marginBottom: 4,
                        }}
                    >
                        Passphrase
                    </label>
                    <input
                        id="vault-passphrase"
                        type="password"
                        value={passphrase}
                        onChange={(e) => setPassphrase(e.target.value)}
                        required
                        disabled={isUnlocking}
                        autoComplete="current-password"
                        style={{
                            width: '100%',
                            minHeight: 44,
                            padding: '10px 12px',
                            borderRadius: 'var(--radius)',
                            border: '1px solid var(--rule)',
                            backgroundColor: 'var(--paper)',
                            color: 'var(--ink)',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            outline: 'none',
                        }}
                    />
                    <button
                        type="submit"
                        disabled={isUnlocking || !passphrase}
                        style={{
                            width: '100%',
                            minHeight: 44,
                            padding: '12px 0',
                            marginTop: 4,
                            borderRadius: 'var(--radius)',
                            border: 'none',
                            backgroundColor: 'var(--ink)',
                            color: 'var(--paper)',
                            fontFamily: 'var(--sans)',
                            fontSize: 'var(--step--1)',
                            fontWeight: 600,
                            cursor: isUnlocking ? 'wait' : 'pointer',
                            opacity: 1,
                            transition: 'opacity 0.2s var(--ease-standard)',
                        }}
                        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '0.88'; }}
                        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.opacity = '1'; }}
                    >
                        {isUnlocking ? 'Unlocking...' : 'Unlock'}
                    </button>
                </form>

                {/* Error state — V2 single-accent: error uses --accent */}
                {error && (
                    <div
                        role="alert"
                        style={{
                            width: '100%',
                            marginTop: 12,
                            padding: 12,
                            borderRadius: 'var(--radius)',
                            backgroundColor: 'var(--accent-tint-08)',
                            border: '1px solid var(--rule)',
                            color: 'var(--accent)',
                            fontSize: 'var(--step--1)',
                            textAlign: 'center',
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Back link */}
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        display: 'inline-flex',
                        minHeight: 44,
                        alignItems: 'center',
                        gap: 6,
                        borderRadius: 'var(--radius)',
                        padding: '0 8px',
                        marginTop: 8,
                        alignSelf: 'flex-start',
                        background: 'transparent',
                        border: 0,
                        cursor: 'pointer',
                        fontFamily: 'var(--sans)',
                        fontSize: 'var(--step--1)',
                        color: 'var(--ink-3)',
                    }}
                >
                    Back
                </button>
            </main>
        </div>
    );
}
