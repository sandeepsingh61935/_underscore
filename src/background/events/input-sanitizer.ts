/**
 * @file input-sanitizer.ts
 * @description Input Sanitizer for XSS protection using DOMPurify
 * @author System Architect
 */

import DOMPurify from 'dompurify';
import type { IInputSanitizer } from './interfaces/i-input-sanitizer';
import type { ILogger } from '@/shared/interfaces/i-logger';

/**
 * Input Sanitizer implementation using DOMPurify
 * 
 * Protects against XSS attacks by sanitizing all user-generated content.
 * Implements defense-in-depth security strategy.
 */
export class InputSanitizer implements IInputSanitizer {
    private readonly logger: ILogger;

    constructor(logger: ILogger) {
        this.logger = logger;
    }

    sanitizeText(text: string): string {
        const sanitized = DOMPurify.sanitize(text, {
            ALLOWED_TAGS: [], // Strip all HTML tags
            KEEP_CONTENT: true, // Preserve text content
        });

        if (sanitized !== text) {
            this.logger.warn('Text sanitized (HTML stripped)', {
                original: text.substring(0, 100),
                sanitized: sanitized.substring(0, 100),
            });
        }

        return sanitized;
    }

    sanitizeHTML(html: string): string {
        const sanitized = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark'],
            ALLOWED_ATTR: [], // No attributes allowed
        });

        if (sanitized !== html) {
            this.logger.warn('HTML sanitized (unsafe tags removed)', {
                original: html.substring(0, 100),
                sanitized: sanitized.substring(0, 100),
            });
        }

        return sanitized;
    }

    sanitizeURL(url: string): string | null {
        try {
            const parsed = new URL(url);

            // Only allow http and https protocols
            if (!['http:', 'https:'].includes(parsed.protocol)) {
                this.logger.warn('Blocked non-HTTP(S) URL', { url, protocol: parsed.protocol });
                return null;
            }

            return parsed.href;
        } catch (error) {
            this.logger.warn('Invalid URL format', { url });
            return null;
        }
    }
}
