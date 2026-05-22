import { FailurePattern } from './FailurePattern.js';
export declare class FailureMemory {
    private patterns;
    record(operationType: string, structuralContext: string[], runtimeConsequences: string[], severity: number): FailurePattern;
    findSimilar(operationType: string, structuralContext: string[], threshold?: number): FailurePattern | undefined;
    search(operationType?: string, contextKeyword?: string): FailurePattern[];
    topBySeverity(limit?: number): FailurePattern[];
    all(): FailurePattern[];
    clear(): void;
}
//# sourceMappingURL=FailureMemory.d.ts.map