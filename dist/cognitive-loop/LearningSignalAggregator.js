"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.LearningSignalAggregator = void 0;
class LearningSignalAggregator {
    results = [];
    maxHistory;
    constructor(maxHistory = 100) {
        this.maxHistory = maxHistory;
    }
    ingest(result, outcome) {
        this.results.push({ result, outcome, timestamp: Date.now() });
        if (this.results.length > this.maxHistory)
            this.results.shift();
    }
    aggregate() {
        const successes = this.results.filter(r => r.result.outcome === 'success').length;
        const failures = this.results.length - successes;
        const total = this.results.length;
        const successRate = total === 0 ? 0.5 : successes / total;
        const operationTypeStats = new Map();
        for (const entry of this.results) {
            const opType = entry.outcome.operationId;
            const s = operationTypeStats.get(opType) ?? { successes: 0, failures: 0 };
            if (entry.result.outcome === 'success')
                s.successes++;
            else
                s.failures++;
            operationTypeStats.set(opType, s);
        }
        return {
            totalObservations: total,
            successCount: successes,
            failureCount: failures,
            successRate,
            dominantSignal: successRate > 0.6 ? 'success' : successRate < 0.4 ? 'failure' : 'neutral',
            recentTrend: this.computeTrend(),
            operationTypeStats,
        };
    }
    computeTrend() {
        if (this.results.length < 4)
            return 'stable';
        const half = Math.floor(this.results.length / 2);
        const early = this.results.slice(0, half);
        const late = this.results.slice(half);
        const earlyRate = early.filter(r => r.result.outcome === 'success').length / early.length;
        const lateRate = late.filter(r => r.result.outcome === 'success').length / late.length;
        if (lateRate - earlyRate > 0.15)
            return 'improving';
        if (earlyRate - lateRate > 0.15)
            return 'degrading';
        return 'stable';
    }
    clear() {
        this.results = [];
    }
}
exports.LearningSignalAggregator = LearningSignalAggregator;
//# sourceMappingURL=LearningSignalAggregator.js.map