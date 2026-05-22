export interface SuccessPattern {
    id: string;
    operationType: string;
    structuralContext: string[];
    successCount: number;
    averageRisk: number;
    lastSeen: number;
}
/**
 * Symmetric counterpart to FailureMemory: tracks successful transformations
 * to reinforce stable, low-risk operation patterns.
 */
export declare class SuccessPatternMemory {
    private patterns;
    record(operationType: string, structuralContext: string[], observedRisk: number): SuccessPattern;
    findSimilar(operationType: string, context: string[], threshold?: number): SuccessPattern | undefined;
    getAll(): SuccessPattern[];
    topBySuccessRate(limit?: number): SuccessPattern[];
}
//# sourceMappingURL=SuccessPatternMemory.d.ts.map