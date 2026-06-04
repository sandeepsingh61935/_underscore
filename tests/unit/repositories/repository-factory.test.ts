import { describe, it, expect, beforeEach } from 'vitest';
import { RepositoryFactory } from '@/shared/repositories/repository-factory';

describe('RepositoryFactory', () => {
  beforeEach(() => {
    RepositoryFactory.reset();
  });

  describe('getMode()', () => {
    it('should default to walk mode', () => {
      expect(RepositoryFactory.getMode()).toBe('walk');
    });
  });

  describe('setMode()', () => {
    it('should update current mode', () => {
      RepositoryFactory.setMode('sprint');
      expect(RepositoryFactory.getMode()).toBe('sprint');
    });

    it('should accept vault mode', () => {
      RepositoryFactory.setMode('vault');
      expect(RepositoryFactory.getMode()).toBe('vault');
    });
  });

  describe('getHighlightRepository()', () => {
    it('should return an instance', () => {
      const repo = RepositoryFactory.getHighlightRepository();
      expect(repo).toBeDefined();
    });

    it('should return same instance on repeated calls', () => {
      const repo1 = RepositoryFactory.getHighlightRepository();
      const repo2 = RepositoryFactory.getHighlightRepository();
      expect(repo1).toBe(repo2);
    });
  });
});