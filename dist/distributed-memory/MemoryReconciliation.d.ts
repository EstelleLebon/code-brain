export interface MemoryEntry {
    key: string;
    value: unknown;
    nodeId: string;
    version: number;
    confidence: number;
    timestamp: number;
    vectorClock?: Record<string, number>;
}
export type ReconciliationStrategy = 'last_write_wins' | 'confidence_merge' | 'semantic_merge' | 'contradiction_aware';
export interface ReconciliationResult {
    key: string;
    resolvedValue: unknown;
    strategy: ReconciliationStrategy;
    confidence: number;
    contributingNodes: string[];
    conflictDetected: boolean;
}
export declare class MemoryReconciliation {
    reconcile(entries: MemoryEntry[], strategy: ReconciliationStrategy): ReconciliationResult;
    reconcileAll(entriesByKey: Map<string, MemoryEntry[]>, strategy: ReconciliationStrategy): Map<string, ReconciliationResult>;
}
//# sourceMappingURL=MemoryReconciliation.d.ts.map