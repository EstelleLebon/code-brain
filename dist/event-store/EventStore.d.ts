import { CognitiveEvent, CognitiveEventType } from './CognitiveEvent.js';
export interface EventFilter {
    executionId?: string;
    eventTypes?: CognitiveEventType[];
    since?: Date;
    until?: Date;
    correlationId?: string;
}
export interface EventStoreSnapshot {
    readonly id: string;
    readonly createdAt: Date;
    readonly eventCount: number;
    readonly events: readonly CognitiveEvent[];
}
export declare class EventStore {
    private _events;
    private _snapshots;
    append(event: CognitiveEvent): void;
    appendBatch(events: readonly CognitiveEvent[]): void;
    stream(executionId: string): readonly CognitiveEvent[];
    query(filter: EventFilter): readonly CognitiveEvent[];
    since(timestamp: Date): readonly CognitiveEvent[];
    all(): readonly CognitiveEvent[];
    snapshot(): EventStoreSnapshot;
    getSnapshot(id: string): EventStoreSnapshot | undefined;
    listSnapshots(): EventStoreSnapshot[];
    clear(): void;
    get size(): number;
}
//# sourceMappingURL=EventStore.d.ts.map