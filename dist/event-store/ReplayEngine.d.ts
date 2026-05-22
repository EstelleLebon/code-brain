import { CognitiveEvent } from './CognitiveEvent.js';
import { EventStore } from './EventStore.js';
import { SnapshotManager } from './SnapshotManager.js';
export type EventHandler = (event: CognitiveEvent) => void | Promise<void>;
export interface ReplayResult {
    readonly executionId: string;
    readonly eventsReplayed: number;
    readonly startedAt: Date;
    readonly completedAt: Date;
    readonly fromSnapshot: boolean;
    readonly snapshotId?: string;
}
export interface DryReplayResult {
    readonly eventsProcessed: number;
    readonly eventTypes: Record<string, number>;
    readonly causalChains: number;
    readonly orphanedEvents: number;
}
export declare class ReplayEngine {
    private store;
    private snapshots;
    private _handlers;
    constructor(store: EventStore, snapshots: SnapshotManager);
    onEvent(handler: EventHandler): void;
    replay(executionId: string): Promise<ReplayResult>;
    replayFrom(snapshotId: string): Promise<ReplayResult>;
    dryReplay(events: readonly CognitiveEvent[]): Promise<DryReplayResult>;
}
//# sourceMappingURL=ReplayEngine.d.ts.map