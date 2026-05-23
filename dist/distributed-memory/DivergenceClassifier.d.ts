import type { MemoryEntry } from './MemoryReconciliation.js';
export type DivergenceSeverity = 'benign' | 'recoverable' | 'dangerous' | 'catastrophic';
export interface DivergenceMetrics {
    contradictionCount: number;
    confidenceDrift: number;
    replayMismatch: boolean;
    consensusMismatch: boolean;
}
export interface DivergenceClassification {
    severity: DivergenceSeverity;
    metrics: DivergenceMetrics;
    recommendation: string;
}
export declare class DivergenceClassifier {
    classify(metrics: DivergenceMetrics): DivergenceClassification;
    classifyEntries(entries: MemoryEntry[], replayMismatch: boolean, consensusMismatch: boolean): DivergenceClassification;
}
//# sourceMappingURL=DivergenceClassifier.d.ts.map