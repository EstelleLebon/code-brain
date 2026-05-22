import { CognitiveMetrics, type CognitiveHealthSnapshot } from './CognitiveMetrics.js';
import { RuntimeHealthMetrics } from './RuntimeHealthMetrics.js';
import type { RuntimeSignal } from '../runtime-awareness/RuntimeSignal.js';
/**
 * Aggregates CognitiveMetrics + RuntimeHealthMetrics into a single observable surface.
 */
export declare class MetricsAggregator {
    readonly cognitive: CognitiveMetrics;
    readonly runtime: RuntimeHealthMetrics;
    constructor(cognitive?: CognitiveMetrics, runtime?: RuntimeHealthMetrics);
    ingestSignals(signals: RuntimeSignal[]): void;
    recordExecution(opts: {
        success: boolean;
        hadRollback: boolean;
        retrievalHits: number;
        retrievalTotal: number;
        hadContradiction: boolean;
        runtimePassed: boolean;
        calibrationDelta: number;
        signals?: RuntimeSignal[];
    }): void;
    cognitiveHealth(semanticConfidence?: number, recoverySuccessRate?: number): CognitiveHealthSnapshot;
    overallStabilityScore(): number;
}
//# sourceMappingURL=MetricsAggregator.d.ts.map