/**
 * @file polyfill.ts
 * @description Polyfills for Service Worker environment to support incompatible 3rd party libraries
 */

// Supabase Realtime-js checks document.visibilityState. 
// In Service Worker, document is undefined.
if (typeof document === 'undefined') {
    // Basic document mock
    (self as any).document = {
        visibilityState: 'visible',
        hidden: false,
        addEventListener: (_type: string, _listener: any) => {
            // No-op for document events
        },
        removeEventListener: (_type: string, _listener: any) => {
            // No-op
        },

        getElementsByTagName: (tagName: string) => {
            if (tagName === 'head') return [{ appendChild: () => { } }];
            return [];
        },
        querySelector: (selector: string) => {
            if (selector === 'head') return { appendChild: () => { } };
            if (selector === 'body') return { appendChild: () => { }, classList: { add: () => { }, remove: () => { } } };
            return null;
        },
        querySelectorAll: (_selector: string) => [],
        getElementById: (_id: string) => null,
        createEvent: (_event: string) => ({ initEvent: () => { } }),
        createElement: (_tagName: string) => {
            return {
                setAttribute: () => { },
                getAttribute: () => null,
                style: {},
            };
        },
        head: {
            appendChild: () => { },
        },
        body: {
            appendChild: () => { },
            classList: {
                add: () => { },
                remove: () => { },
            },
        },
        documentElement: {
            style: {},
        },
    };
}

if (typeof window === 'undefined') {
    (self as any).window = self;
}
