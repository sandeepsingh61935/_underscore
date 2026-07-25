import React, { useRef, useEffect } from 'react';

export interface OtpInputProps {
    /** Number of digits in the code. Default 6 (matches Supabase otp_length). */
    length?: number;
    /** Current code value (digits only, may be shorter than `length` while typing). */
    value: string;
    onChange: (value: string) => void;
    /** Fired once the code reaches full length. */
    onComplete?: (value: string) => void;
    disabled?: boolean;
    autoFocus?: boolean;
    error?: boolean;
    id?: string;
    ariaLabel?: string;
}

/**
 * Shared 6-digit OTP entry control used by both the web SPA and the extension
 * popup for email confirmation and password-reset codes.
 *
 * V2 Editorial tokens only: var(--paper), var(--ink), var(--rule), var(--accent),
 * var(--step-*), var(--mono), var(--radius).
 */
export function OtpInput({
    length = 6,
    value,
    onChange,
    onComplete,
    disabled = false,
    autoFocus = false,
    error = false,
    id = 'otp-input',
    ariaLabel = 'Verification code',
}: OtpInputProps): React.ReactElement {
    const refs = useRef<Array<HTMLInputElement | null>>([]);
    const prevValueRef = useRef(value);

    useEffect(() => {
        if (autoFocus) {
            refs.current[0]?.focus();
        }
        // Only run once on mount.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // When the parent clears the code (e.g. wrong OTP), restore focus to digit 1.
    useEffect(() => {
        const prev = prevValueRef.current;
        prevValueRef.current = value;
        if (prev !== '' && value === '' && !disabled) {
            refs.current[0]?.focus();
        }
    }, [value, disabled]);

    const digits = Array.from({ length }, (_, i) => value[i] ?? '');

    const commit = (nextDigits: string[]): void => {
        const joined = nextDigits.join('');
        onChange(joined);
        if (joined.length === length) {
            onComplete?.(joined);
        }
    };

    const handleInput = (index: number, rawValue: string): void => {
        const cleaned = rawValue.replace(/\D/g, '');
        const next = [...digits];

        if (!cleaned) {
            next[index] = '';
            commit(next);
            return;
        }

        let cursor = index;
        for (const char of cleaned) {
            if (cursor >= length) break;
            next[cursor] = char;
            cursor += 1;
        }
        commit(next);
        refs.current[Math.min(cursor, length - 1)]?.focus();
    };

    const handleKeyDown = (index: number, event: React.KeyboardEvent<HTMLInputElement>): void => {
        if (event.key === 'Backspace' && !digits[index] && index > 0) {
            event.preventDefault();
            const next = [...digits];
            next[index - 1] = '';
            commit(next);
            refs.current[index - 1]?.focus();
        } else if (event.key === 'ArrowLeft' && index > 0) {
            event.preventDefault();
            refs.current[index - 1]?.focus();
        } else if (event.key === 'ArrowRight' && index < length - 1) {
            event.preventDefault();
            refs.current[index + 1]?.focus();
        }
    };

    const handlePaste = (index: number, event: React.ClipboardEvent<HTMLInputElement>): void => {
        const pasted = event.clipboardData.getData('text');
        if (!/\d/.test(pasted)) return;
        event.preventDefault();
        handleInput(index, pasted);
    };

    return (
        <div role="group" aria-label={ariaLabel} style={{ display: 'flex', gap: 8, justifyContent: 'center' }}>
            {digits.map((digit, index) => (
                <input
                    key={index}
                    ref={(el) => { refs.current[index] = el; }}
                    id={index === 0 ? id : undefined}
                    type="text"
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    maxLength={length}
                    value={digit}
                    disabled={disabled}
                    onChange={(e) => handleInput(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={(e) => handlePaste(index, e)}
                    aria-label={`Digit ${index + 1} of ${length}`}
                    style={{
                        width: 44,
                        height: 52,
                        textAlign: 'center',
                        fontFamily: 'var(--mono)',
                        fontSize: 'var(--step-3)',
                        color: 'var(--ink)',
                        backgroundColor: 'var(--paper)',
                        border: `1px solid ${error ? 'var(--accent)' : 'var(--rule)'}`,
                        borderRadius: 'var(--radius)',
                        outline: 'none',
                        opacity: disabled ? 0.6 : 1,
                        transition: 'border-color 0.15s ease',
                    }}
                />
            ))}
        </div>
    );
}
