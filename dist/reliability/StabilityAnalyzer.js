"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.StabilityAnalyzer = void 0;
class StabilityAnalyzer {
    _trustHistory = [];
    _planningHistory = [];
    _retrievalHistory = [];
    _replanEvents = [];
    _executionCount = 0;
    recordTrust(score) {
        this._trustHistory.push(score);
    }
    recordPlanningOutcome(score) {
        this._planningHistory.push(score);
    }
    recordRetrievalQuality(score) {
        this._retrievalHistory.push(score);
    }
    recordReplan() {
        this._replanEvents.push(Date.now());
    }
    recordExecution() {
        this._executionCount++;
    }
    analyze() {
        const trustOscillation = this._stddev(this._trustHistory);
        const planningEntropy = this._variance(this._planningHistory);
        const retrievalDrift = this._drift(this._retrievalHistory);
        const replanFrequency = this._executionCount === 0
            ? 0
            : this._replanEvents.length / this._executionCount;
        const notes = [];
        if (trustOscillation > 0.3)
            notes.push('high trust oscillation');
        if (planningEntropy > 0.2)
            notes.push('high planning entropy');
        if (retrievalDrift > 0.2)
            notes.push('retrieval quality drifting');
        if (replanFrequency > 3)
            notes.push('excessive replanning frequency');
        return {
            trustOscillation,
            planningEntropy,
            retrievalDrift,
            replanFrequency,
            regressionDetected: this._detectRegression(),
            instabilityDetected: notes.length >= 2,
            notes,
        };
    }
    detectRegression() {
        return this._detectRegression();
    }
    detectInstability() {
        const report = this.analyze();
        return report.instabilityDetected;
    }
    _detectRegression() {
        if (this._trustHistory.length < 4)
            return false;
        const recent = this._trustHistory.slice(-4);
        const older = this._trustHistory.slice(-8, -4);
        if (older.length === 0)
            return false;
        const recentMean = recent.reduce((s, v) => s + v, 0) / recent.length;
        const olderMean = older.reduce((s, v) => s + v, 0) / older.length;
        return olderMean - recentMean > 0.15;
    }
    _stddev(arr) {
        if (arr.length < 2)
            return 0;
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        const variance = arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
        return Math.sqrt(variance);
    }
    _variance(arr) {
        if (arr.length < 2)
            return 0;
        const mean = arr.reduce((s, v) => s + v, 0) / arr.length;
        return arr.reduce((s, v) => s + (v - mean) ** 2, 0) / arr.length;
    }
    _drift(arr) {
        if (arr.length < 2)
            return 0;
        let totalDelta = 0;
        for (let i = 1; i < arr.length; i++) {
            totalDelta += Math.abs(arr[i] - arr[i - 1]);
        }
        return totalDelta / (arr.length - 1);
    }
    reset() {
        this._trustHistory = [];
        this._planningHistory = [];
        this._retrievalHistory = [];
        this._replanEvents = [];
        this._executionCount = 0;
    }
}
exports.StabilityAnalyzer = StabilityAnalyzer;
//# sourceMappingURL=StabilityAnalyzer.js.map