/**
 * WXT type declarations
 * These provide TypeScript support for WXT-specific globals
 */

/// <reference types="wxt/client" />

/**
 * WXT global type declarations
 */

interface ContentScriptContext {
    matches: string[];
    main(): void | Promise<void>;
}

declare function defineContentScript(context: ContentScriptContext): ContentScriptContext;
declare function defineBackground(fn: () => void | Promise<void>): void;

declare global {
    const defineContentScript: typeof defineContentScript;
    const defineBackground: typeof defineBackground;
}

export { };
