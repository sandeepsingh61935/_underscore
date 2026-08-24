// SW polyfill: some libraries expect window global (wxt, supabase, etc.) In MV3 SW, window is undefined but self is global.
if (typeof window === 'undefined' && typeof self !== 'undefined') {
  (globalThis as any).window = self as any;
}
if (typeof document === 'undefined' && typeof self !== 'undefined') {
  // no-op: document not available in SW, but guard checks will handle
}
