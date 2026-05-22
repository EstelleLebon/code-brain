"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RuntimeLearningEngine = void 0;
const FailureLearning_js_1 = require("./FailureLearning.js");
const SuccessPatternMemory_js_1 = require("./SuccessPatternMemory.js");
const FailureMemory_js_1 = require("../failure-memory/FailureMemory.js");
/**
 * Top-level learning orchestrator: routes execution outcomes to the appropriate
 * learning subsystem (failure or success), persists what can be persisted.
 */
class RuntimeLearningEngine {
    calibration;
    calibrationStore;
    failureLearning;
    successMemory;
    failureMemory;
    constructor(calibration = null, failureStore = null, calibrationStore = null) {
        this.calibration = calibration;
        this.calibrationStore = calibrationStore;
        this.failureMemory = new FailureMemory_js_1.FailureMemory();
        this.successMemory = new SuccessPatternMemory_js_1.SuccessPatternMemory();
        this.failureLearning = new FailureLearning_js_1.FailureLearning(this.failureMemory, failureStore, calibration);
    }
    observe(outcome) {
        if (outcome.outcome === 'success') {
            const context = outcome.signals.map(s => s.signalType);
            const pattern = this.successMemory.record(outcome.signals[0]?.source ?? 'unknown', context, outcome.riskObserved);
            // Persist calibration record on success too
            if (this.calibration && this.calibrationStore) {
                const cal = this.calibration.observe(outcome.signals[0]?.source ?? 'unknown', outcome.riskObserved, outcome.riskObserved);
                this.calibrationStore.save({
                    id: `cal-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                    operationType: outcome.signals[0]?.source ?? 'unknown',
                    predictedRisk: outcome.riskObserved,
                    observedRisk: outcome.riskObserved,
                    calibrationDelta: cal.calibrationDelta,
                    timestamp: Date.now(),
                });
            }
            return { outcome: 'success', successPatternId: pattern.id };
        }
        const fl = this.failureLearning.learn(outcome);
        return { outcome: 'failure_learned', failureLearning: fl };
    }
}
exports.RuntimeLearningEngine = RuntimeLearningEngine;
//# sourceMappingURL=RuntimeLearningEngine.js.map