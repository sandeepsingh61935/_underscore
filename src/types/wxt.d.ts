/**
 * WXT type declarations
 * These provide TypeScript support for WXT-specific globals
 */

/// <reference types="wxt/client" />

/**
 * Supabase environment variable declarations
 */
interface ImportMeta {
  readonly env: {
    readonly VITE_SUPABASE_URL?: string;
    readonly VITE_SUPABASE_ANON_KEY?: string;
    readonly VITE_GOOGLE_CLIENT_ID?: string;
    readonly VITE_WEB_APP_URL?: string;
    [key: string]: string | boolean | undefined;
  };
}

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
