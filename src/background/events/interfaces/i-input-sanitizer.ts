/**
 * @file i-input-sanitizer.ts
 * @description Input Sanitizer interface for XSS protection
 * @author System Architect
 */

/**
 * Input Sanitizer interface for preventing XSS attacks
 * 
 * Uses DOMPurify to sanitize all user-generated content before storage.
 * Implements defense-in-depth security strategy.
 * 
 * **Security Requirements** (per threat model T1):
 * - Strip all script tags
 * - Block javascript: URLs
 * - Allow only safe HTML tags
 * - Preserve Unicode text
 * 
 * @example
 * ```typescript
 * const sanitizer = container.resolve<IInputSanitizer>('inputSanitizer');
 * 
 * // Sanitize highlight text
 * const safeText = sanitizer.sanitizeText('<script>alert("xss")</script>Hello');
 * // Result: 'Hello'
 * 
 * // Sanitize HTML content
 * const safeHTML = sanitizer.sanitizeHTML('<strong>Bold</strong><script>bad</script>');
 * // Result: '<strong>Bold</strong>'
 * 
 * // Sanitize URL
 * const safeURL = sanitizer.sanitizeURL('javascript:alert(1)');
 * // Result: null (blocked)
 * ```
 */
export interface IInputSanitizer {
    /**
     * Sanitize plain text input
     * 
     * Strips all HTML tags while preserving text content.
     * Safe for storing user-entered text like highlight content.
     * 
     * **Configuration**:
     * - ALLOWED_TAGS: [] (strip all)
     * - KEEP_CONTENT: true (preserve text)
     * 
     * @param text - Raw text input
     * @returns Sanitized text with all HTML removed
     * 
     * @example
     * ```typescript
     * sanitizer.sanitizeText('<script>alert("xss")</script>Important text');
     * // Returns: 'Important text'
     * 
     * sanitizer.sanitizeText('日本語 <b>text</b> emoji 👍');
     * // Returns: '日本語 text emoji 👍'
     * ```
     */
    sanitizeText(text: string): string;

    /**
     * Sanitize HTML content
     * 
     * Allows safe HTML tags (b, i, em, strong, mark) for rich text.
     * Strips all attributes to prevent event handlers.
     * 
     * **Configuration**:
     * - ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'mark']
     * - ALLOWED_ATTR: [] (no attributes)
     * 
     * @param html - Raw HTML input
     * @returns Sanitized HTML with only safe tags
     * 
     * @example
     * ```typescript
     * sanitizer.sanitizeHTML('<strong>Bold</strong><script>alert(1)</script>');
     * // Returns: '<strong>Bold</strong>'
     * 
     * sanitizer.sanitizeHTML('<img src=x onerror=alert(1)>');
     * // Returns: ''
     * 
     * sanitizer.sanitizeHTML('<em onclick="bad()">Italic</em>');
     * // Returns: '<em>Italic</em>' (onclick removed)
     * ```
     */
    sanitizeHTML(html: string): string;

    /**
     * Sanitize and validate URL
     * 
     * Only allows http: and https: protocols.
     * Blocks javascript:, data:, and other dangerous protocols.
     * 
     * @param url - Raw URL input
     * @returns Sanitized URL or null if invalid/dangerous
     * 
     * @example
     * ```typescript
     * sanitizer.sanitizeURL('https://example.com');
     * // Returns: 'https://example.com'
     * 
     * sanitizer.sanitizeURL('javascript:alert(1)');
     * // Returns: null
     * 
     * sanitizer.sanitizeURL('data:text/html,<script>alert(1)</script>');
     * // Returns: null
     * 
     * sanitizer.sanitizeURL('not-a-url');
     * // Returns: null
     * ```
     */
    sanitizeURL(url: string): string | null;
}
