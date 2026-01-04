
import type { IAPIClient, PushResult, SyncEvent, Collection, CollectionData } from '@/background/api/interfaces/i-api-client';
import type { HighlightDataV2 } from '@/shared/schemas/highlight-schema';

export class MockAPIClient implements IAPIClient {
    public createdHighlights: HighlightDataV2[] = [];
    public updatedHighlights: Array<{ id: string; updates: Partial<HighlightDataV2> }> = [];
    public deletedHighlights: string[] = [];
    public pushedEvents: SyncEvent[] = [];

    public shouldFailCreate = false;
    public shouldFailPush = false;

    async createHighlight(data: HighlightDataV2): Promise<void> {
        if (this.shouldFailCreate) {
            throw new Error('Network Error');
        }
        this.createdHighlights.push(data);
    }

    async updateHighlight(id: string, updates: Partial<HighlightDataV2>): Promise<void> {
        this.updatedHighlights.push({ id, updates });
    }

    async deleteHighlight(id: string): Promise<void> {
        this.deletedHighlights.push(id);
    }

    async getHighlights(url?: string): Promise<HighlightDataV2[]> {
        return this.createdHighlights.filter(h => !url || h.url === url); // Simplified
    }

    async pushEvents(events: SyncEvent[]): Promise<PushResult> {
        if (this.shouldFailPush) {
            throw new Error('Rate Limit Exceeded');
        }
        this.pushedEvents.push(...events);
        return {
            synced_event_ids: events.map(e => e.event_id),
            failed_event_ids: []
        };
    }

    async pullEvents(since: number): Promise<SyncEvent[]> {
        return [];
    }

    async createCollection(name: string, description?: string): Promise<Collection> {
        return {
            id: 'mock-collection-id',
            name,
            description,
            highlight_count: 0,
            created_at: new Date(),
            updated_at: new Date()
        };
    }

    async getCollections(): Promise<Collection[]> {
        return [];
    }
}
