export interface ReliabilitySnapshot {
    timestamp: Date;
    meanRecoveryTimeMs: number;
    rollbackContainmentRate: number;
    executionReproducibility: number;
    snapshotIntegrity: number;
    trustStability: number;
    planningStability: number;
    runtimeResilience: number;
    overallScore: number;
}
export interface ReliabilityTrend {
    snapshots: ReliabilitySnapshot[];
    improving: boolean;
    degrading: boolean;
    delta: Partial<ReliabilitySnapshot>;
}
export declare class ReliabilityMetrics {
    private _recoveries;
    private _snapshotChecks;
    private _replayChecks;
    private _trustSamples;
    private _planningSamples;
    private _runtimeSamples;
    private _history;
    recordRecovery(durationMs: number, contained: boolean): void;
    recordSnapshotCheck(passed: boolean): void;
    recordReplayCheck(reproducible: boolean): void;
    recordTrustSample(score: number): void;
    recordPlanningSample(score: number): void;
    recordRuntimeSample(score: number): void;
    private _mean;
    private _rate;
    snapshot(): ReliabilitySnapshot;
    trend(): ReliabilityTrend;
    reset(): void;
}
//# sourceMappingURL=ReliabilityMetrics.d.ts.map