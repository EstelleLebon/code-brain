"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ReliabilityMetrics_js_1 = require("../reliability/ReliabilityMetrics.js");
(0, node_test_1.describe)('ReliabilityMetrics', () => {
    let metrics;
    (0, node_test_1.beforeEach)(() => {
        metrics = new ReliabilityMetrics_js_1.ReliabilityMetrics();
    });
    (0, node_test_1.it)('snapshot returns all required fields', () => {
        const snap = metrics.snapshot();
        strict_1.default.ok(snap.timestamp instanceof Date);
        strict_1.default.ok(typeof snap.meanRecoveryTimeMs === 'number');
        strict_1.default.ok(typeof snap.rollbackContainmentRate === 'number');
        strict_1.default.ok(typeof snap.executionReproducibility === 'number');
        strict_1.default.ok(typeof snap.snapshotIntegrity === 'number');
        strict_1.default.ok(typeof snap.trustStability === 'number');
        strict_1.default.ok(typeof snap.planningStability === 'number');
        strict_1.default.ok(typeof snap.runtimeResilience === 'number');
        strict_1.default.ok(typeof snap.overallScore === 'number');
    });
    (0, node_test_1.it)('defaults to perfect score with no data', () => {
        const snap = metrics.snapshot();
        strict_1.default.ok(snap.overallScore >= 0.9);
    });
    (0, node_test_1.it)('recordRecovery affects mean recovery time', () => {
        metrics.recordRecovery(200, true);
        metrics.recordRecovery(400, true);
        const snap = metrics.snapshot();
        strict_1.default.equal(snap.meanRecoveryTimeMs, 300);
    });
    (0, node_test_1.it)('containment rate drops with uncontained recoveries', () => {
        metrics.recordRecovery(100, false);
        metrics.recordRecovery(100, false);
        const snap = metrics.snapshot();
        strict_1.default.equal(snap.rollbackContainmentRate, 0);
    });
    (0, node_test_1.it)('snapshot integrity reflects failed checks', () => {
        metrics.recordSnapshotCheck(false);
        metrics.recordSnapshotCheck(false);
        metrics.recordSnapshotCheck(true);
        const snap = metrics.snapshot();
        strict_1.default.ok(snap.snapshotIntegrity < 0.5);
    });
    (0, node_test_1.it)('replay checks affect reproducibility', () => {
        metrics.recordReplayCheck(true);
        metrics.recordReplayCheck(false);
        const snap = metrics.snapshot();
        strict_1.default.equal(snap.executionReproducibility, 0.5);
    });
    (0, node_test_1.it)('trust samples affect trust stability', () => {
        metrics.recordTrustSample(0.2);
        metrics.recordTrustSample(0.4);
        const snap = metrics.snapshot();
        strict_1.default.ok(snap.trustStability < 0.5);
    });
    (0, node_test_1.it)('planning samples affect planning stability', () => {
        metrics.recordPlanningSample(1.0);
        metrics.recordPlanningSample(1.0);
        const snap = metrics.snapshot();
        strict_1.default.ok(snap.planningStability >= 0.9);
    });
    (0, node_test_1.it)('trend detects improving score', () => {
        metrics.recordTrustSample(0.5);
        metrics.snapshot();
        metrics.recordTrustSample(0.9);
        metrics.recordPlanningSample(1.0);
        metrics.snapshot();
        const trend = metrics.trend();
        strict_1.default.ok(trend.snapshots.length >= 2);
    });
    (0, node_test_1.it)('reset clears all recorded data', () => {
        metrics.recordRecovery(500, false);
        metrics.recordTrustSample(0.1);
        metrics.reset();
        const snap = metrics.snapshot();
        strict_1.default.equal(snap.meanRecoveryTimeMs, 0);
        strict_1.default.ok(snap.trustStability >= 0.9);
    });
    (0, node_test_1.it)('overall score is clamped 0–1', () => {
        for (let i = 0; i < 10; i++) {
            metrics.recordSnapshotCheck(false);
            metrics.recordReplayCheck(false);
            metrics.recordTrustSample(0);
        }
        const snap = metrics.snapshot();
        strict_1.default.ok(snap.overallScore >= 0 && snap.overallScore <= 1);
    });
});
//# sourceMappingURL=reliability.test.js.map