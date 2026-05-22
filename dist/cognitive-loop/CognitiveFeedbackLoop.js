"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CognitiveFeedbackLoop = void 0;
const AdaptiveTrustPolicy_js_1 = require("./AdaptiveTrustPolicy.js");
const AdaptiveRetrievalPolicy_js_1 = require("./AdaptiveRetrievalPolicy.js");
const LearningSignalAggregator_js_1 = require("./LearningSignalAggregator.js");
/**
 * Top-level orchestrator closing the cognitive loop:
 *   execution outcome → learning signal → trust adaptation → retrieval adaptation
 */
class CognitiveFeedbackLoop {
    adaptiveTrust;
    adaptiveRetrieval;
    signalAggregator;
    iterations = 0;
    constructor(adaptiveTrust, adaptiveRetrieval, signalAggregator) {
        this.adaptiveTrust = adaptiveTrust ?? new AdaptiveTrustPolicy_js_1.AdaptiveTrustPolicy();
        this.adaptiveRetrieval = adaptiveRetrieval ?? new AdaptiveRetrievalPolicy_js_1.AdaptiveRetrievalPolicy();
        this.signalAggregator = signalAggregator ?? new LearningSignalAggregator_js_1.LearningSignalAggregator();
    }
    /**
     * Feed an execution outcome through the full feedback loop.
     * Called automatically after SemanticExecutor.executeAsync() completes.
     */
    observe(learningResult, outcome, affectedChunkIds = []) {
        this.iterations++;
        const isSuccess = learningResult.outcome === 'success';
        // Update trust policy adaptation
        if (isSuccess)
            this.adaptiveTrust.recordSuccess();
        else
            this.adaptiveTrust.recordFailure();
        // Update retrieval reliability for affected chunks
        for (const chunkId of affectedChunkIds) {
            if (isSuccess)
                this.adaptiveRetrieval.recordSuccess(chunkId);
            else
                this.adaptiveRetrieval.recordFailure(chunkId);
        }
        // Aggregate signal
        this.signalAggregator.ingest(learningResult, outcome);
    }
    currentTrustPolicy() {
        return this.adaptiveTrust.currentPolicy();
    }
    summary() {
        return {
            trustPolicy: this.adaptiveTrust.currentPolicy(),
            aggregatedSignal: this.signalAggregator.aggregate(),
            loopIterations: this.iterations,
        };
    }
}
exports.CognitiveFeedbackLoop = CognitiveFeedbackLoop;
//# sourceMappingURL=CognitiveFeedbackLoop.js.map