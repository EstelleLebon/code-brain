"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MetricsAggregator = void 0;
const CognitiveMetrics_js_1 = require("./CognitiveMetrics.js");
const RuntimeHealthMetrics_js_1 = require("./RuntimeHealthMetrics.js");
/**
 * Aggregates CognitiveMetrics + RuntimeHealthMetrics into a single observable surface.
 */
class MetricsAggregator {
    cognitive;
    runtime;
    constructor(cognitive, runtime) {
        this.cognitive = cognitive ?? new CognitiveMetrics_js_1.CognitiveMetrics();
        this.runtime = runtime ?? new RuntimeHealthMetrics_js_1.RuntimeHealthMetrics();
    }
    ingestSignals(signals) {
        this.runtime.ingestAll(signals);
    }
    recordExecution(opts) {
        const { signals, ...cogObs } = opts;
        this.cognitive.record(cogObs);
        if (signals)
            this.runtime.ingestAll(signals);
    }
    cognitiveHealth(semanticConfidence, recoverySuccessRate) {
        return this.cognitive.healthSnapshot(semanticConfidence, recoverySuccessRate);
    }
    overallStabilityScore() {
        const ch = this.cognitiveHealth();
        const rh = this.runtime.report().overallHealth;
        return (ch.stabilityScore + rh) / 2;
    }
}
exports.MetricsAggregator = MetricsAggregator;
//# sourceMappingURL=MetricsAggregator.js.map