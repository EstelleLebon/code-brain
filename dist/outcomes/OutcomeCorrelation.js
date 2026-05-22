"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OutcomeCorrelation = void 0;
class OutcomeCorrelation {
    history = [];
    record(operationType, outcome) {
        this.history.push({ operationType, outcome });
    }
    correlate(operationType) {
        const entries = this.history.filter(e => e.operationType === operationType);
        const outcomes = entries.map(e => e.outcome.outcome);
        const total = outcomes.length;
        if (total === 0) {
            return { operationType, outcomes: [], failureRate: 0, successRate: 1, totalCount: 0 };
        }
        const failures = outcomes.filter(o => o === 'failure' || o === 'regression').length;
        const successes = outcomes.filter(o => o === 'success').length;
        return {
            operationType,
            outcomes,
            failureRate: failures / total,
            successRate: successes / total,
            totalCount: total,
        };
    }
    allCorrelations() {
        const types = [...new Set(this.history.map(e => e.operationType))];
        return types.map(t => this.correlate(t));
    }
}
exports.OutcomeCorrelation = OutcomeCorrelation;
//# sourceMappingURL=OutcomeCorrelation.js.map