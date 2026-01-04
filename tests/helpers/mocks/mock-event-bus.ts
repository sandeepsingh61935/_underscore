
import type { IEventBus, EventHandler } from '@/shared/interfaces/i-event-bus';

export class MockEventBus implements IEventBus {
    public emittedEvents: Array<{ event: string, data: any }> = [];

    on<T>(event: string, handler: EventHandler<T>): void { }
    off<T>(event: string, handler: EventHandler<T>): void { }
    once<T>(event: string, handler: EventHandler<T>): void { }

    clear(event?: string): void {
        this.emittedEvents = [];
    }

    emit<T>(event: string, data: T): void {
        this.emittedEvents.push({ event, data });
    }

    // Helper
    getEvents(eventName: string): any[] {
        return this.emittedEvents
            .filter(e => e.event === eventName)
            .map(e => e.data);
    }
}
