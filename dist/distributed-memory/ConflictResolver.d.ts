import type { ReplicatedMemoryEntry } from './MemoryReplication.js';
export interface SemanticConflict {
    memoryId: string;
    entries: ReplicatedMemoryEntry[];
    conflictType: 'confidence' | 'version' | 'content';
}
export interface ResolutionResult {
    resolved: ReplicatedMemoryEntry;
    strategy: string;
    discarded: ReplicatedMemoryEntry[];
}
export declare class ConflictResolver {
    resolveSemanticConflict(conflict: SemanticConflict): ResolutionResult;
    resolveEpisodicConflict(entries: ReplicatedMemoryEntry[]): ResolutionResult;
    resolveTrustConflict(entries: ReplicatedMemoryEntry[]): ResolutionResult;
}
//# sourceMappingURL=ConflictResolver.d.ts.map