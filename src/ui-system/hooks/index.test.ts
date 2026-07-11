import { describe, expect, it } from 'vitest';

import * as hooksBarrel from './index';

describe('ui-system/hooks barrel', () => {
  it('re-exports useTicker', () => {
    expect(typeof hooksBarrel.useTicker).toBe('function');
  });

  it('re-exports useRemaining', () => {
    expect(typeof hooksBarrel.useRemaining).toBe('function');
  });

  it('re-exports useProgress', () => {
    expect(typeof hooksBarrel.useProgress).toBe('function');
  });

  it('re-exports useTheme', () => {
    expect(typeof hooksBarrel.useTheme).toBe('function');
  });

  it('re-exports usePersistedMode', () => {
    expect(typeof hooksBarrel.usePersistedMode).toBe('function');
  });

  it('re-exports useModeFeature', () => {
    expect(typeof hooksBarrel.useModeFeature).toBe('function');
  });
});
