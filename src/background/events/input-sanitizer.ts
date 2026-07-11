/**
 * @file input-sanitizer.ts
 * @description Input Sanitizer for XSS protection using DOMPurify
 * @author System Architect
 */

import DOMPurify from 'dompurify';

import type { IInputSanitizer } from './interfaces/i-input-sanitizer';
import type { ILogger } from '@/shared/interfaces/i-logger';

function stripHtmlTags(text: string): string {
  return text.replace(/<[^>]*>/g, '');
}

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
        if (typeof window === 'undefined') {
            return stripHtmlTags(text);
        }

        const sanitized = DOMPurify.sanitize(text, {
            ALLOWED_TAGS: [],
            KEEP_CONTENT: true,
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
        if (typeof window === 'undefined') {
            return stripHtmlTags(html);
        }

        const sanitized = DOMPurify.sanitize(html, {
            ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark'],
            ALLOWED_ATTR: [],
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

            if (!['http:', 'https:'].includes(parsed.protocol)) {
                this.logger.warn('Blocked non-HTTP(S) URL', { url, protocol: parsed.protocol });
                return null;
            }

            return parsed.href;
        } catch {
            this.logger.warn('Invalid URL format', { url });
            return null;
        }
    }
}
