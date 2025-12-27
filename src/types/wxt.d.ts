/**
 * WXT type declarations
 * These provide TypeScript support for WXT-specific globals
 */

/// <reference types="wxt/client" />

declare module 'wxt/client' {
    export function defineContentScript(options: {
        matches: string[];
        main: () => void;
    }): void;

    export function defineBackground(options: {
        type: 'module';
        main: () => void;
    }): void;
}
