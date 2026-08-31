import type {
  IHighlightRepository,
  IReadableHighlightRepository,
} from '@/shared/repositories/i-highlight-repository';

export type HighlightStorageScope = 'basic' | 'pro';

/**
 * Routes highlight CRUD to Basic or Pro local storage.
 * Auth lifecycle chooses the active scope; stores stay physically isolated.
 */
export class ScopedHighlightRepository implements IHighlightRepository {
  private activeScope: HighlightStorageScope = 'basic';

  constructor(
    private readonly basicRepository: IHighlightRepository,
    private readonly proRepository: IHighlightRepository,
    initialScope: HighlightStorageScope = 'basic'
  ) {
    this.activeScope = initialScope;
  }

  getActiveScope(): HighlightStorageScope {
    return this.activeScope;
  }

  async activateScope(scope: HighlightStorageScope): Promise<void> {
    this.activeScope = scope;
  }

  async wipeProLocal(): Promise<void> {
    await this.proRepository.clear();
  }

  /** Read-only accessor for a specific storage partition (display queries). */
  queryScope(scope: HighlightStorageScope): IReadableHighlightRepository {
    return scope === 'pro' ? this.proRepository : this.basicRepository;
  }

  private activeRepository(): IHighlightRepository {
    return this.activeScope === 'pro' ? this.proRepository : this.basicRepository;
  }

  async add(
    highlight: Parameters<IHighlightRepository['add']>[0],
    options?: Parameters<IHighlightRepository['add']>[1]
  ): Promise<void> {
    await this.activeRepository().add(highlight, options);
  }

  async update(
    id: string,
    updates: Parameters<IHighlightRepository['update']>[1],
    options?: Parameters<IHighlightRepository['update']>[2]
  ): Promise<void> {
    await this.activeRepository().update(id, updates, options);
  }

  async remove(
    id: string,
    options?: Parameters<IHighlightRepository['remove']>[1]
  ): Promise<void> {
    await this.activeRepository().remove(id, options);
  }

  async clear(): Promise<void> {
    await this.activeRepository().clear();
  }

  async addMany(
    highlights: Parameters<IHighlightRepository['addMany']>[0]
  ): Promise<void> {
    await this.activeRepository().addMany(highlights);
  }

  async findById(
    id: string
  ): Promise<Awaited<ReturnType<IHighlightRepository['findById']>>> {
    return this.activeRepository().findById(id);
  }

  async findAll(): Promise<Awaited<ReturnType<IHighlightRepository['findAll']>>> {
    return this.activeRepository().findAll();
  }

  async findByUrl(
    url: string
  ): Promise<Awaited<ReturnType<IHighlightRepository['findByUrl']>>> {
    return this.activeRepository().findByUrl(url);
  }

  async findByContentHash(
    hash: string
  ): Promise<Awaited<ReturnType<IHighlightRepository['findByContentHash']>>> {
    return this.activeRepository().findByContentHash(hash);
  }

  async findOverlapping(
    range: Parameters<IHighlightRepository['findOverlapping']>[0]
  ): Promise<Awaited<ReturnType<IHighlightRepository['findOverlapping']>>> {
    return this.activeRepository().findOverlapping(range);
  }

  async count(): Promise<number> {
    return this.activeRepository().count();
  }

  async exists(id: string): Promise<boolean> {
    return this.activeRepository().exists(id);
  }
}
