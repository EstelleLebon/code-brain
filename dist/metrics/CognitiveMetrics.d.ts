export interface CognitiveMetricsSnapshot {
    retrievalPrecision: number;
    contradictionRate: number;
    rollbackFrequency: number;
    learningVelocity: number;
    calibrationDrift: number;
    runtimeStability: number;
    semanticConfidence: number;
    recoverySuccessRate: number;
    capturedAt: number;
}
export interface CognitiveHealthSnapshot {
    memoryHealth: number;
    runtimeHealth: number;
    trustHealth: number;
    learningHealth: number;
    retrievalHealth: number;
    stabilityScore: number;
}
export declare class CognitiveMetrics {
    private observations;
    private readonly windowSize;
    constructor(windowSize?: number);
    record(obs: {
        success: boolean;
        hadRollback: boolean;
        retrievalHits: number;
        retrievalTotal: number;
        hadContradiction: boolean;
        runtimePassed: boolean;
        calibrationDelta: number;
    }): void;
    snapshot(semanticConfidence?: number, recoverySuccessRate?: number): CognitiveMetricsSnapshot;
    healthSnapshot(semanticConfidence?: number, recoverySuccessRate?: number): CognitiveHealthSnapshot;
}
//# sourceMappingURL=CognitiveMetrics.d.ts.map