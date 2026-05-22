import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';
export interface WorkingMemorySnapshot {
    sessionId: string;
    activeChunkIds: string[];
    recentSignals: RuntimeSignal[];
    recentOutcomes: ExecutionOutcome[];
    pendingMutationCount: number;
    capturedAt: number;
}
/**
 * Short-lived session memory. Holds in-progress context for the current execution session.
 * TTL-based eviction; not persisted to disk.
 */
export declare class WorkingMemory {
    private sessionId;
    private activeChunkIds;
    private recentSignals;
    private recentOutcomes;
    private pendingMutationCount;
    private readonly ttlMs;
    private readonly maxSignals;
    private readonly maxOutcomes;
    private lastActivity;
    constructor(sessionId: string, ttlMs?: number, maxSignals?: number, maxOutcomes?: number);
    setActiveChunks(chunkIds: string[]): void;
    addSignal(signal: RuntimeSignal): void;
    addOutcome(outcome: ExecutionOutcome): void;
    setPendingMutations(count: number): void;
    isExpired(): boolean;
    snapshot(): WorkingMemorySnapshot;
    clear(): void;
    private touch;
}
//# sourceMappingURL=WorkingMemory.d.ts.map