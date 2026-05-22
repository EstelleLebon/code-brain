"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FailureLearning = void 0;
/**
 * On each runtime failure, enriches FailureMemory, persists it,
 * and triggers risk recalibration.
 */
class FailureLearning {
    memory;
    store;
    calibration;
    constructor(memory, store, calibration) {
        this.memory = memory;
        this.store = store;
        this.calibration = calibration;
    }
    learn(outcome) {
        if (outcome.outcome === 'success' || outcome.outcome === 'partial_success') {
            return { patternRecorded: false, patternId: null, calibrationAdjusted: false };
        }
        const structuralContext = outcome.signals.map(s => s.signalType);
        const runtimeConsequences = outcome.signals
            .filter(s => s.status === 'failure')
            .map(s => `${s.signalType}:${s.source}`);
        const severity = outcome.riskObserved / 100;
        const pattern = this.memory.record(outcome.signals[0]?.source ?? 'unknown', structuralContext, runtimeConsequences, severity);
        // Persist if store available
        if (this.store) {
            this.store.save(pattern);
        }
        // Recalibrate risk
        let calibrationAdjusted = false;
        if (this.calibration && outcome.riskObserved > 0) {
            this.calibration.observe(outcome.signals[0]?.source ?? 'unknown', outcome.riskObserved, outcome.riskObserved);
            calibrationAdjusted = true;
        }
        return { patternRecorded: true, patternId: pattern.id, calibrationAdjusted };
    }
}
exports.FailureLearning = FailureLearning;
//# sourceMappingURL=FailureLearning.js.map