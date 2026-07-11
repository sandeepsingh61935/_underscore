import { describe, expect, it } from 'vitest';

import {
  canUseFeature,
  getCapabilitiesForMode,
  MODE_CAPABILITY_MATRIX,
} from '@/shared/utils/mode-capabilities';

describe('mode-capabilities', () => {
  describe('MODE_CAPABILITY_MATRIX', () => {
    it('basic denies pro and AI features', () => {
      const basic = MODE_CAPABILITY_MATRIX.basic;
      expect(basic.sync).toBe(false);
      expect(basic.export).toBe(false);
      expect(basic.tags).toBe(false);
      expect(basic.ai).toBe(false);
      expect(basic.search).toBe(false);
    });

    it('pro allows sync/export/tags/search but not AI', () => {
      const pro = MODE_CAPABILITY_MATRIX.pro;
      expect(pro.sync).toBe(true);
      expect(pro.export).toBe(true);
      expect(pro.ai).toBe(false);
    });

    it('pro_xai enables AI overlay on pro', () => {
      const xai = MODE_CAPABILITY_MATRIX.pro_xai;
      expect(xai.ai).toBe(true);
      expect(xai.sync).toBe(true);
    });
  });

  describe('canUseFeature', () => {
    it('denies export in basic mode', () => {
      const result = canUseFeature('export', {
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'CAPABILITY_DENIED' });
    });

    it('denies sync in pro when not authenticated', () => {
      const result = canUseFeature('sync', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'AUTH_REQUIRED' });
    });

    it('denies AI in pro mode even when authenticated', () => {
      const result = canUseFeature('ai', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: true,
      });
      expect(result).toEqual({ allowed: false, reason: 'WRONG_MODE' });
    });

    it('denies AI in basic mode with WRONG_MODE', () => {
      const result = canUseFeature('ai', {
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'WRONG_MODE' });
    });

    it('allows AI in pro_xai when authenticated and vault unlocked', () => {
      const result = canUseFeature('ai', {
        mode: 'pro_xai',
        capabilities: getCapabilitiesForMode('pro_xai'),
        isAuthenticated: true,
        vaultLocked: false,
        storageScope: 'pro',
      });
      expect(result).toEqual({ allowed: true });
    });

    it('denies export when vault is locked', () => {
      const result = canUseFeature('export', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: true,
        vaultLocked: true,
        storageScope: 'pro',
      });
      expect(result).toEqual({ allowed: false, reason: 'VAULT_LOCKED' });
    });

    it('denies pro features in basic storage scope', () => {
      const result = canUseFeature('sync', {
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
        storageScope: 'basic',
      });
      expect(result).toEqual({ allowed: false, reason: 'CAPABILITY_DENIED' });
    });
  });
});
