import { describe, it, expect, beforeEach } from 'vitest';
import { RepositoryFactory } from '@/shared/repositories/repository-factory';

describe('RepositoryFactory', () => {
  beforeEach(() => {
    RepositoryFactory.reset();
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
