import { AdaptiveTrustPolicy } from './AdaptiveTrustPolicy.js';
import { AdaptiveRetrievalPolicy } from './AdaptiveRetrievalPolicy.js';
import { LearningSignalAggregator, type AggregatedLearningSignal } from './LearningSignalAggregator.js';
import type { LearningResult } from '../learning/RuntimeLearningEngine.js';
import type { ExecutionOutcome } from '../outcomes/ExecutionOutcome.js';
import type { TrustPolicy } from '../trust/TrustPolicy.js';
export interface FeedbackLoopSummary {
    trustPolicy: TrustPolicy;
    aggregatedSignal: AggregatedLearningSignal;
    loopIterations: number;
}
/**
 * Top-level orchestrator closing the cognitive loop:
 *   execution outcome → learning signal → trust adaptation → retrieval adaptation
 */
export declare class CognitiveFeedbackLoop {
    readonly adaptiveTrust: AdaptiveTrustPolicy;
    readonly adaptiveRetrieval: AdaptiveRetrievalPolicy;
    readonly signalAggregator: LearningSignalAggregator;
    private iterations;
    constructor(adaptiveTrust?: AdaptiveTrustPolicy, adaptiveRetrieval?: AdaptiveRetrievalPolicy, signalAggregator?: LearningSignalAggregator);
    /**
     * Feed an execution outcome through the full feedback loop.
     * Called automatically after SemanticExecutor.executeAsync() completes.
     */
    observe(learningResult: LearningResult, outcome: ExecutionOutcome, affectedChunkIds?: string[]): void;
    currentTrustPolicy(): TrustPolicy;
    summary(): FeedbackLoopSummary;
}
//# sourceMappingURL=CognitiveFeedbackLoop.d.ts.map