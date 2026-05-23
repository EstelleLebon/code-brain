import type { DistributedEventBus } from '../distributed/DistributedEventBus.js';
export type ReplicationStrategy = 'last_write_wins' | 'highest_confidence' | 'merge' | 'manual';
export interface ReplicatedMemoryEntry {
    memoryId: string;
    content: unknown;
    confidence: number;
    sourceNodeId: string;
    version: number;
    timestamp: number;
}
export interface ReplicationConflict {
    memoryId: string;
    entries: ReplicatedMemoryEntry[];
    detectedAt: number;
}
export declare class MemoryReplication {
    private bus;
    private strategy;
    private store;
    private conflicts;
    private clock;
    constructor(bus: DistributedEventBus, strategy?: ReplicationStrategy);
    replicate(entry: ReplicatedMemoryEntry, targetNodeId: string): void;
    resolve(memoryId: string): ReplicatedMemoryEntry | undefined;
    getConflicts(): ReplicationConflict[];
    getStore(): Map<string, ReplicatedMemoryEntry[]>;
    syncEpisodic(events: unknown[], sourceNodeId: string, targetNodeId: string): void;
}
//# sourceMappingURL=MemoryReplication.d.ts.map