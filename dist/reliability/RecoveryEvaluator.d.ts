export type RecoveryQuality = 'excellent' | 'acceptable' | 'poor' | 'catastrophic';
export interface RecoveryOutcome {
    executionId: string;
    rollbackDepth: number;
    recoveryDurationMs: number;
    collateralSteps: number;
    repeatedFailures: number;
    eventualSuccess: boolean;
    quality: RecoveryQuality;
    score: number;
}
export interface RecoveryEvaluation {
    outcomes: RecoveryOutcome[];
    meanScore: number;
    qualityDistribution: Record<RecoveryQuality, number>;
    worstCase?: RecoveryOutcome;
    bestCase?: RecoveryOutcome;
}
export declare class RecoveryEvaluator {
    private _outcomes;
    evaluate(params: Omit<RecoveryOutcome, 'quality' | 'score'>): RecoveryOutcome;
    summary(): RecoveryEvaluation;
    reset(): void;
}
//# sourceMappingURL=RecoveryEvaluator.d.ts.map