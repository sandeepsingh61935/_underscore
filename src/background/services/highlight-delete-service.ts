import type { RepositoryFacade } from '@/shared/repositories/repository-facade';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';
import { getSectionKey } from '@/shared/utils/section-key';
import { urlMatchesDomain } from '@/shared/utils/domain-from-url';

export type DeleteScope = 'highlight' | 'section' | 'domain' | 'library';

export type DeleteRequest =
  | { scope: 'highlight'; id: string }
  | { scope: 'section'; domain: string; sectionKey: string }
  | { scope: 'domain'; domain: string }
  | { scope: 'library' };

export type DeleteSuccess = {
  success: true;
  deletedCount: number;
  removedIds?: string[];
  restoredIds?: string[];
};
export type DeleteFailure = {
  success: false;
  code: 'NOT_FOUND';
  error: string;
};
export type DeleteResult = DeleteSuccess | DeleteFailure;

export interface HighlightDeleteContext {
  isAuthenticated: boolean;
}

export interface HighlightCloudDeletePort {
  deleteHighlight(id: string): Promise<void>;
  restoreHighlight(id: string): Promise<void>;
  softDeleteAllHighlights(): Promise<void>;
}

type PendingUndo = {
  snapshot: HighlightDataV2;
  cloudWasSoftDeleted: boolean;
  timer: ReturnType<typeof setTimeout>;
};

const UNDO_WINDOW_MS = 5000;

function pathFromUrl(url: string | undefined): string {
  if (!url) return '/';
  try {
    return new URL(url).pathname;
  } catch {
    return '/';
  }
}

function matchesSection(
  highlight: HighlightDataV2,
  domain: string,
  sectionKey: string,
): boolean {
  if (!highlight.url || !urlMatchesDomain(highlight.url, domain)) {
    return false;
  }
  return getSectionKey({ url: highlight.url, path: pathFromUrl(highlight.url) }) === sectionKey;
}

function matchesDomain(highlight: HighlightDataV2, domain: string): boolean {
  return Boolean(highlight.url && urlMatchesDomain(highlight.url, domain));
}

/**
 * Scoped highlight deletion for Library hierarchy (highlight → section → domain → library).
 */
export class HighlightDeleteService {
  private pendingUndo: PendingUndo | null = null;

  constructor(
    private readonly facade: RepositoryFacade,
    private readonly cloud: HighlightCloudDeletePort,
  ) {}

  async executeDelete(
    request: DeleteRequest,
    context: HighlightDeleteContext,
  ): Promise<DeleteResult> {
    switch (request.scope) {
      case 'highlight':
        return this.deleteHighlight(request.id, context);
      case 'section':
        return this.deleteMany(
          (h) => matchesSection(h, request.domain, request.sectionKey),
          context,
        );
      case 'domain':
        return this.deleteMany((h) => matchesDomain(h, request.domain), context);
      case 'library':
        return this.deleteLibrary(context);
      default: {
        const _exhaustive: never = request;
        return _exhaustive;
      }
    }
  }

  async undoPendingHighlight(_context: HighlightDeleteContext): Promise<DeleteResult> {
    const pending = this.pendingUndo;
    if (!pending) {
      return { success: false, code: 'NOT_FOUND', error: 'Nothing to undo' };
    }

    clearTimeout(pending.timer);
    this.pendingUndo = null;

    this.facade.add(pending.snapshot);
    if (pending.cloudWasSoftDeleted) {
      await this.cloud.restoreHighlight(pending.snapshot.id);
    }

    return { success: true, deletedCount: 0, restoredIds: [pending.snapshot.id] };
  }

  private async deleteHighlight(
    id: string,
    context: HighlightDeleteContext,
  ): Promise<DeleteResult> {
    const snapshot = this.facade.get(id);
    if (!snapshot) {
      return { success: false, code: 'NOT_FOUND', error: `Highlight not found: ${id}` };
    }

    this.clearPendingUndo();

    await this.facade.removePersisted(id);

    let cloudWasSoftDeleted = false;
    if (context.isAuthenticated) {
      await this.cloud.deleteHighlight(id);
      cloudWasSoftDeleted = true;
    }

    this.scheduleUndo(snapshot, cloudWasSoftDeleted);

    return { success: true, deletedCount: 1, removedIds: [id] };
  }

  private async deleteMany(
    predicate: (highlight: HighlightDataV2) => boolean,
    context: HighlightDeleteContext,
  ): Promise<DeleteResult> {
    this.clearPendingUndo();

    const targets = this.facade.getAll().filter(predicate);
    for (const highlight of targets) {
      await this.facade.removePersisted(highlight.id);
      if (context.isAuthenticated) {
        await this.cloud.deleteHighlight(highlight.id);
      }
    }

    return {
      success: true,
      deletedCount: targets.length,
      removedIds: targets.map((highlight) => highlight.id),
    };
  }

  private async deleteLibrary(context: HighlightDeleteContext): Promise<DeleteResult> {
    this.clearPendingUndo();

    const deletedCount = this.facade.count();
    const removedIds = this.facade.getAll().map((highlight) => highlight.id);
    await this.facade.clearPersisted();

    if (context.isAuthenticated) {
      await this.cloud.softDeleteAllHighlights();
    }

    return { success: true, deletedCount, removedIds };
  }

  private scheduleUndo(snapshot: HighlightDataV2, cloudWasSoftDeleted: boolean): void {
    const timer = setTimeout(() => {
      this.pendingUndo = null;
    }, UNDO_WINDOW_MS);

    this.pendingUndo = { snapshot, cloudWasSoftDeleted, timer };
  }

  private clearPendingUndo(): void {
    if (!this.pendingUndo) return;
    clearTimeout(this.pendingUndo.timer);
    this.pendingUndo = null;
  }
}
