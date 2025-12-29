/**
 * @file security.ts
 * @description Security utilities for input sanitization and validation
 */

import DOMPurify from 'dompurify';

/**
 * Security service for sanitizing user input and preventing XSS
 */
export class SecurityService {
  /**
   * Sanitize HTML content allowing only safe tags
   */
  static sanitizeHTML(dirty: string): string {
    return DOMPurify.sanitize(dirty, {
      ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark'],
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true,
      RETURN_DOM: false,
      RETURN_DOM_FRAGMENT: false,
    });
  }

  /**
   * Sanitize text content (strips all HTML)
   */
  static sanitizeText(text: string): string {
    return DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [],
      KEEP_CONTENT: true,
    });
  }

  /**
   * Validate and sanitize URL
   * @returns Sanitized URL or null if invalid
   */
  static sanitizeURL(url: string): string | null {
    try {
      const parsed = new URL(url);

      // Only allow http/https protocols
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      return parsed.href;
    } catch {
      return null;
    }
  }

  /**
   * Validate hex color format
   */
  static isValidHexColor(color: string): boolean {
    return /^#[0-9A-F]{6}$/i.test(color);
  }

  /**
   * Sanitize color input
   */
  static sanitizeColor(color: string): string | null {
    if (this.isValidHexColor(color)) {
      return color.toUpperCase();
    }
    return null;
  }
}
