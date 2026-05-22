export interface PlanMetricRecord {
    planId: string;
    successRate: number;
    replanningCount: number;
    avgRollbackDepth: number;
    avgExecutionDepth: number;
    adaptiveRecoverySuccess: number;
    plannerConfidence: number;
    graphComplexity: number;
    timestamp: Date;
}
export declare class PlanningMetrics {
    private records;
    record(metric: PlanMetricRecord): void;
    summary(): {
        avgSuccessRate: number;
        avgReplanningFreq: number;
        avgRollbackDepth: number;
    };
    history(): PlanMetricRecord[];
}
//# sourceMappingURL=PlanningMetrics.d.ts.map