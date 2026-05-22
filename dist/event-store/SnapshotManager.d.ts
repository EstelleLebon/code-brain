export interface MemorySnapshot {
    workingMemory: unknown;
    episodicMemory: unknown;
    semanticMemory: unknown;
    proceduralMemory: unknown;
}
export interface TrustSnapshot {
    successCount: number;
    failureCount: number;
    chunkReliability: Record<string, {
        successes: number;
        failures: number;
    }>;
}
export interface CognitiveSnapshot {
    readonly id: string;
    readonly createdAt: Date;
    readonly executionId: string;
    readonly memory: MemorySnapshot;
    readonly trust: TrustSnapshot;
    readonly metadata: Record<string, unknown>;
}
export interface SnapshotSource {
    getWorkingMemoryState(): unknown;
    getEpisodicMemoryState(): unknown;
    getSemanticMemoryState(): unknown;
    getProceduralMemoryState(): unknown;
    getTrustState(): TrustSnapshot;
}
export declare class SnapshotManager {
    private _snapshots;
    createSnapshot(executionId: string, source: SnapshotSource, metadata?: Record<string, unknown>): CognitiveSnapshot;
    restoreSnapshot(id: string): CognitiveSnapshot | undefined;
    latest(): CognitiveSnapshot | undefined;
    latestForExecution(executionId: string): CognitiveSnapshot | undefined;
    list(): CognitiveSnapshot[];
    clear(): void;
}
//# sourceMappingURL=SnapshotManager.d.ts.map