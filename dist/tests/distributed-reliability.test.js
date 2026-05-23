"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedReliabilityMetrics_js_1 = require("../distributed-reliability/DistributedReliabilityMetrics.js");
(0, node_test_1.describe)('DistributedReliabilityMetrics', () => {
    (0, node_test_1.it)('snapshot returns score of 1 with no data', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        const snap = m.snapshot();
        strict_1.default.equal(snap.overallScore, 1);
    });
    (0, node_test_1.it)('recordConsensusAttempt affects consensusStability', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordConsensusAttempt(true);
        m.recordConsensusAttempt(false);
        const snap = m.snapshot();
        strict_1.default.equal(snap.consensusStability, 0.5);
    });
    (0, node_test_1.it)('recordReplication affects replicationIntegrity', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordReplication(true);
        m.recordReplication(true);
        m.recordReplication(false);
        const snap = m.snapshot();
        strict_1.default.ok(Math.abs(snap.replicationIntegrity - 2 / 3) < 0.01);
    });
    (0, node_test_1.it)('recordRecovery affects crossNodeRecoveryRate', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordRecovery(true);
        m.recordRecovery(false);
        const snap = m.snapshot();
        strict_1.default.equal(snap.crossNodeRecoveryRate, 0.5);
    });
    (0, node_test_1.it)('recordPartitionEvent affects partitionTolerance', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordPartitionEvent(true);
        m.recordPartitionEvent(false);
        const snap = m.snapshot();
        strict_1.default.equal(snap.partitionTolerance, 0.5);
    });
    (0, node_test_1.it)('recordCoordinationOverhead affects coordinationOverhead', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordCoordinationOverhead(50); // 50% of 100
        const snap = m.snapshot();
        strict_1.default.equal(snap.coordinationOverhead, 0.5);
    });
    (0, node_test_1.it)('recordReplayConsistency affects distributedReplayConsistency', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordReplayConsistency(true);
        m.recordReplayConsistency(false);
        const snap = m.snapshot();
        strict_1.default.equal(snap.distributedReplayConsistency, 0.5);
    });
    (0, node_test_1.it)('overallScore is average of all dimensions', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordConsensusAttempt(true);
        m.recordReplication(true);
        m.recordRecovery(true);
        m.recordPartitionEvent(true);
        m.recordReplayConsistency(true);
        const snap = m.snapshot();
        strict_1.default.ok(snap.overallScore > 0.9);
    });
    (0, node_test_1.it)('getHistory accumulates snapshots', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.snapshot();
        m.snapshot();
        strict_1.default.equal(m.getHistory().length, 2);
    });
    (0, node_test_1.it)('getLatest returns most recent snapshot', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.snapshot();
        const snap = m.snapshot();
        strict_1.default.equal(m.getLatest()?.timestamp, snap.timestamp);
    });
    (0, node_test_1.it)('coordinationOverhead capped at 1', () => {
        const m = new DistributedReliabilityMetrics_js_1.DistributedReliabilityMetrics();
        m.recordCoordinationOverhead(0); // 0 overhead = 1.0
        const snap = m.snapshot();
        strict_1.default.equal(snap.coordinationOverhead, 1);
    });
});
//# sourceMappingURL=distributed-reliability.test.js.map