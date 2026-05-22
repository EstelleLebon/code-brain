import type { LearningResult } from '../learning/RuntimeLearningEngine.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';
export interface AggregatedLearningSignal {
    totalObservations: number;
    successCount: number;
    failureCount: number;
    successRate: number;
    dominantSignal: 'success' | 'failure' | 'neutral';
    recentTrend: 'improving' | 'degrading' | 'stable';
    operationTypeStats: Map<string, {
        successes: number;
        failures: number;
    }>;
}
export declare class LearningSignalAggregator {
    private results;
    private readonly maxHistory;
    constructor(maxHistory?: number);
    ingest(result: LearningResult, outcome: ExecutionOutcome): void;
    aggregate(): AggregatedLearningSignal;
    private computeTrend;
    clear(): void;
}
//# sourceMappingURL=LearningSignalAggregator.d.ts.map