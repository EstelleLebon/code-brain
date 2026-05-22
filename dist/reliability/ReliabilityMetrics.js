"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReliabilityMetrics = void 0;
class ReliabilityMetrics {
    _recoveries = [];
    _snapshotChecks = [];
    _replayChecks = [];
    _trustSamples = [];
    _planningSamples = [];
    _runtimeSamples = [];
    _history = [];
    recordRecovery(durationMs, contained) {
        this._recoveries.push({ durationMs, contained });
    }
    recordSnapshotCheck(passed) {
        this._snapshotChecks.push(passed);
    }
    recordReplayCheck(reproducible) {
        this._replayChecks.push(reproducible);
    }
    recordTrustSample(score) {
        this._trustSamples.push(Math.max(0, Math.min(1, score)));
    }
    recordPlanningSample(score) {
        this._planningSamples.push(Math.max(0, Math.min(1, score)));
    }
    recordRuntimeSample(score) {
        this._runtimeSamples.push(Math.max(0, Math.min(1, score)));
    }
    _mean(arr) {
        if (arr.length === 0)
            return 1;
        return arr.reduce((s, v) => s + v, 0) / arr.length;
    }
    _rate(arr) {
        if (arr.length === 0)
            return 1;
        return arr.filter(Boolean).length / arr.length;
    }
    snapshot() {
        const meanRecoveryTimeMs = this._recoveries.length === 0
            ? 0
            : this._recoveries.reduce((s, r) => s + r.durationMs, 0) / this._recoveries.length;
        const rollbackContainmentRate = this._recoveries.length === 0
            ? 1
            : this._recoveries.filter(r => r.contained).length / this._recoveries.length;
        const executionReproducibility = this._rate(this._replayChecks);
        const snapshotIntegrity = this._rate(this._snapshotChecks);
        const trustStability = this._mean(this._trustSamples);
        const planningStability = this._mean(this._planningSamples);
        const runtimeResilience = this._mean(this._runtimeSamples);
        const overallScore = (rollbackContainmentRate * 0.2 +
            executionReproducibility * 0.2 +
            snapshotIntegrity * 0.15 +
            trustStability * 0.15 +
            planningStability * 0.15 +
            runtimeResilience * 0.15);
        const snap = {
            timestamp: new Date(),
            meanRecoveryTimeMs,
            rollbackContainmentRate,
            executionReproducibility,
            snapshotIntegrity,
            trustStability,
            planningStability,
            runtimeResilience,
            overallScore,
        };
        this._history.push(snap);
        return snap;
    }
    trend() {
        const snapshots = [...this._history];
        if (snapshots.length < 2) {
            return { snapshots, improving: false, degrading: false, delta: {} };
        }
        const last = snapshots[snapshots.length - 1];
        const prev = snapshots[snapshots.length - 2];
        const delta = last.overallScore - prev.overallScore;
        return {
            snapshots,
            improving: delta > 0.02,
            degrading: delta < -0.02,
            delta: { overallScore: delta },
        };
    }
    reset() {
        this._recoveries = [];
        this._snapshotChecks = [];
        this._replayChecks = [];
        this._trustSamples = [];
        this._planningSamples = [];
        this._runtimeSamples = [];
    }
}
exports.ReliabilityMetrics = ReliabilityMetrics;
//# sourceMappingURL=ReliabilityMetrics.js.map