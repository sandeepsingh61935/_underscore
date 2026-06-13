import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DomainQueryService } from '@/background/services/domain-query-service';
import type { RepositoryFacade } from '@/shared/repositories';

describe('DomainQueryService', () => {
  let facade: any;
  let service: DomainQueryService;

  beforeEach(() => {
    facade = {
      getCollections: vi.fn(),
      getHighlightsByDomain: vi.fn(),
      getDashboardData: vi.fn()
    };
    service = new DomainQueryService(facade);
  });

  describe('handleGetCollectionsRequest', () => {
    it('delegates to facade.getCollections', async () => {
      const mockCollections = [{ id: '1', domain: 'example.com', mode: 'walk' }];
      facade.getCollections.mockResolvedValue(mockCollections);

      const result = await service.handleGetCollectionsRequest('walk');

      expect(facade.getCollections).toHaveBeenCalledWith('walk');
      expect(result).toEqual(mockCollections);
    });
  });

  describe('handleGetHighlightsByDomainRequest', () => {
    it('delegates to facade.getHighlightsByDomain', async () => {
      const mockHighlights = [{ id: 'hl-1', text: 'test highlight' }];
      facade.getHighlightsByDomain.mockResolvedValue(mockHighlights);

      const result = await service.handleGetHighlightsByDomainRequest('example.com');

      expect(facade.getHighlightsByDomain).toHaveBeenCalledWith('example.com');
      expect(result).toEqual(mockHighlights);
    });
  });

  describe('handleGetDashboardDataRequest', () => {
    it('delegates to facade.getDashboardData', async () => {
      const mockData = { totalHighlights: 10, totalDomains: 2, thisWeekCount: 5, recentHighlights: [] };
      facade.getDashboardData.mockResolvedValue(mockData);

      const result = await service.handleGetDashboardDataRequest('walk');

      expect(facade.getDashboardData).toHaveBeenCalledWith('walk');
      expect(result).toEqual(mockData);
    });
  });
});
