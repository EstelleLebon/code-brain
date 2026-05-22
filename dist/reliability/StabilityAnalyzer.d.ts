export interface StabilityReport {
    trustOscillation: number;
    planningEntropy: number;
    retrievalDrift: number;
    replanFrequency: number;
    regressionDetected: boolean;
    instabilityDetected: boolean;
    notes: string[];
}
export declare class StabilityAnalyzer {
    private _trustHistory;
    private _planningHistory;
    private _retrievalHistory;
    private _replanEvents;
    private _executionCount;
    recordTrust(score: number): void;
    recordPlanningOutcome(score: number): void;
    recordRetrievalQuality(score: number): void;
    recordReplan(): void;
    recordExecution(): void;
    analyze(): StabilityReport;
    detectRegression(): boolean;
    detectInstability(): boolean;
    private _detectRegression;
    private _stddev;
    private _variance;
    private _drift;
    reset(): void;
}
//# sourceMappingURL=StabilityAnalyzer.d.ts.map