import { describe, expect, it } from 'vitest';

import {
  canConfigureAiProviders,
  canUseFeature,
  getCapabilitiesForMode,
  MODE_CAPABILITY_MATRIX,
  resolveLibraryAccess,
} from '@/shared/utils/mode-capabilities';

describe('mode-capabilities', () => {
  describe('MODE_CAPABILITY_MATRIX', () => {
    it('basic denies cloud/paid features but allows local search and tags', () => {
      const basic = MODE_CAPABILITY_MATRIX.basic;
      expect(basic.sync).toBe(false);
      expect(basic.export).toBe(false);
      expect(basic.ai).toBe(false);
      expect(basic.tags).toBe(true);
      expect(basic.search).toBe(true);
    });

    it('pro allows sync/export/tags/search but not AI', () => {
      const pro = MODE_CAPABILITY_MATRIX.pro;
      expect(pro.sync).toBe(true);
      expect(pro.export).toBe(true);
      expect(pro.ai).toBe(false);
    });

    it('pro_xai enables AI and MCP overlay on pro', () => {
      const xai = MODE_CAPABILITY_MATRIX.pro_xai;
      expect(xai.ai).toBe(true);
      expect(xai.mcp).toBe(true);
      expect(xai.sync).toBe(true);
    });

    it('pro and basic deny mcp', () => {
      expect(MODE_CAPABILITY_MATRIX.pro.mcp).toBe(false);
      expect(MODE_CAPABILITY_MATRIX.basic.mcp).toBe(false);
    });
  });

  describe('resolveLibraryAccess', () => {
    it('shows sign-in prompt for unsigned users with empty library', () => {
      expect(resolveLibraryAccess(false, 0)).toEqual({
        storageScope: 'basic',
        hasLocalHighlights: false,
        showSignInPrompt: true,
        canShowHighlightLists: false,
      });
    });

    it('shows local lists for unsigned users with basic data', () => {
      expect(resolveLibraryAccess(false, 3)).toEqual({
        storageScope: 'basic',
        hasLocalHighlights: true,
        showSignInPrompt: false,
        canShowHighlightLists: true,
      });
    });

    it('shows pro lists for signed-in users', () => {
      expect(resolveLibraryAccess(true, 0)).toEqual({
        storageScope: 'pro',
        hasLocalHighlights: false,
        showSignInPrompt: false,
        canShowHighlightLists: true,
      });
    });
  });

  describe('canUseFeature', () => {
    it('denies export in basic mode', () => {
      const result = canUseFeature('export', {
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'CAPABILITY_DENIED' });
    });

    it('denies sync in pro when not authenticated', () => {
      const result = canUseFeature('sync', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: false,
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'AUTH_REQUIRED' });
    });

    it('denies AI when authenticated but not paid (mode is not commercial)', () => {
      const result = canUseFeature('ai', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: true,
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'PAID_REQUIRED' });
    });

    it('allows AI when paid even if stored mode is pro', () => {
      const result = canUseFeature('ai', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: true,
        storageScope: 'pro',
        isPaidActive: true,
      });
      expect(result).toEqual({ allowed: true });
    });

    it('allows AI in pro_xai when authenticated and paid', () => {
      const result = canUseFeature('ai', {
        mode: 'pro_xai',
        capabilities: getCapabilitiesForMode('pro_xai'),
        isAuthenticated: true,
        storageScope: 'pro',
        isPaidActive: true,
      });
      expect(result).toEqual({ allowed: true });
    });

    it('allows export in pro when authenticated', () => {
      const result = canUseFeature('export', {
        mode: 'pro',
        capabilities: getCapabilitiesForMode('pro'),
        isAuthenticated: true,
        storageScope: 'pro',
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: true });
    });

    it('allows search in basic mode with basic storage scope (local, no auth required)', () => {
      const result = canUseFeature('search', {
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
        storageScope: 'basic',
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: true });
    });

    it('allows tags in basic mode with basic storage scope (local, no auth required)', () => {
      const result = canUseFeature('tags', {
        mode: 'basic',
        capabilities: getCapabilitiesForMode('basic'),
        isAuthenticated: false,
        storageScope: 'basic',
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: true });
    });
  });

  describe('canConfigureAiProviders', () => {
    it('allows provider setup when paid', () => {
      const result = canConfigureAiProviders({
        isAuthenticated: true,
        isPaidActive: true,
      });
      expect(result).toEqual({ allowed: true });
    });

    it('denies provider setup when not paid', () => {
      const result = canConfigureAiProviders({
        isAuthenticated: true,
        isPaidActive: false,
      });
      expect(result).toEqual({ allowed: false, reason: 'PAID_REQUIRED' });
    });
  });
});
