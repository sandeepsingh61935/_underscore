/**
 * @file scoped-tag-repository.ts
 * @description Routes tag CRUD to Basic or Pro local IndexedDB stores.
 */

import type { HighlightStorageScope } from '@/shared/constants/highlight-storage-scope';
import type { ITagRepository } from '@/shared/repositories/i-tag-repository';
import type { TagEntity } from '@/shared/types/tag-entity';

export class ScopedTagRepository implements ITagRepository {
  private activeScope: HighlightStorageScope = 'basic';

  constructor(
    private readonly basicRepository: ITagRepository,
    private readonly proRepository: ITagRepository,
    initialScope: HighlightStorageScope = 'basic',
  ) {
    this.activeScope = initialScope;
  }

  getActiveScope(): HighlightStorageScope {
    return this.activeScope;
  }

  activateScope(scope: HighlightStorageScope): void {
    this.activeScope = scope;
  }

  queryScope(scope: HighlightStorageScope): ITagRepository {
    return scope === 'pro' ? this.proRepository : this.basicRepository;
  }

  private activeRepository(): ITagRepository {
    return this.activeScope === 'pro' ? this.proRepository : this.basicRepository;
  }

  listAll(): Promise<TagEntity[]> {
    return this.activeRepository().listAll();
  }

  getLabelsForHighlight(highlightId: string): Promise<string[]> {
    return this.activeRepository().getLabelsForHighlight(highlightId);
  }

  getLabelsForHighlights(highlightIds: string[]): Promise<Map<string, string[]>> {
    return this.activeRepository().getLabelsForHighlights(highlightIds);
  }

  setHighlightLabels(highlightId: string, names: string[]): Promise<void> {
    return this.activeRepository().setHighlightLabels(highlightId, names);
  }

  async wipeProLocal(): Promise<void> {
    const pro = this.proRepository as ITagRepository & { clearAll?: () => Promise<void> };
    if (typeof pro.clearAll === 'function') {
      await pro.clearAll();
    }
  }
}
