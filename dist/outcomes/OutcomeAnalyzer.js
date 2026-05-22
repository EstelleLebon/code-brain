"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeAnalyzer = void 0;
const ExecutionOutcome_js_1 = require("./ExecutionOutcome.js");
const OutcomeClassifier_js_1 = require("./OutcomeClassifier.js");
const OutcomeCorrelation_js_1 = require("./OutcomeCorrelation.js");
class OutcomeAnalyzer {
    classifier = new OutcomeClassifier_js_1.OutcomeClassifier();
    correlation = new OutcomeCorrelation_js_1.OutcomeCorrelation();
    analyze(operationId, operationType, signals) {
        const { outcome, summary } = this.classifier.classify(signals);
        const failureSignals = signals.filter(s => s.status === 'failure');
        const riskObserved = Math.min(100, failureSignals.length * 25);
        const result = {
            id: (0, ExecutionOutcome_js_1.makeOutcomeId)(),
            operationId,
            outcome,
            signals,
            riskObserved,
            summary,
            timestamp: Date.now(),
        };
        this.correlation.record(operationType, result);
        return result;
    }
}
exports.OutcomeAnalyzer = OutcomeAnalyzer;
//# sourceMappingURL=OutcomeAnalyzer.js.map