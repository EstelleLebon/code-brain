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
export class CognitiveFeedbackLoop {
  readonly adaptiveTrust: AdaptiveTrustPolicy;
  readonly adaptiveRetrieval: AdaptiveRetrievalPolicy;
  readonly signalAggregator: LearningSignalAggregator;
  private iterations = 0;

  constructor(
    adaptiveTrust?: AdaptiveTrustPolicy,
    adaptiveRetrieval?: AdaptiveRetrievalPolicy,
    signalAggregator?: LearningSignalAggregator,
  ) {
    this.adaptiveTrust = adaptiveTrust ?? new AdaptiveTrustPolicy();
    this.adaptiveRetrieval = adaptiveRetrieval ?? new AdaptiveRetrievalPolicy();
    this.signalAggregator = signalAggregator ?? new LearningSignalAggregator();
  }

  /**
   * Feed an execution outcome through the full feedback loop.
   * Called automatically after SemanticExecutor.executeAsync() completes.
   */
  observe(learningResult: LearningResult, outcome: ExecutionOutcome, affectedChunkIds: string[] = []): void {
    this.iterations++;

    const isSuccess = learningResult.outcome === 'success';

    // Update trust policy adaptation
    if (isSuccess) this.adaptiveTrust.recordSuccess();
    else this.adaptiveTrust.recordFailure();

    // Update retrieval reliability for affected chunks
    for (const chunkId of affectedChunkIds) {
      if (isSuccess) this.adaptiveRetrieval.recordSuccess(chunkId);
      else this.adaptiveRetrieval.recordFailure(chunkId);
    }

    // Aggregate signal
    this.signalAggregator.ingest(learningResult, outcome);
  }

  currentTrustPolicy(): TrustPolicy {
    return this.adaptiveTrust.currentPolicy();
  }

  summary(): FeedbackLoopSummary {
    return {
      trustPolicy: this.adaptiveTrust.currentPolicy(),
      aggregatedSignal: this.signalAggregator.aggregate(),
      loopIterations: this.iterations,
    };
  }
}
