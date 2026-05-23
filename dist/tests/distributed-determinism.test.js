"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const DistributedExecutionFingerprint_js_1 = require("../reproducibility/DistributedExecutionFingerprint.js");
const DeterminismValidator_js_1 = require("../reproducibility/DeterminismValidator.js");
function makeFp(executionId = 'exec-1') {
    return new DistributedExecutionFingerprint_js_1.DistributedExecutionFingerprint(executionId);
}
const nodeIds = ['n1', 'n2', 'n3'];
const allocations = [{ nodeId: 'n1', role: 'leader' }, { nodeId: 'n2', role: 'follower' }];
const decisions = [{ round: 1, outcome: 'commit' }, { round: 2, outcome: 'commit' }];
const replication = [{ key: 'k1', version: 1 }, { key: 'k2', version: 2 }];
const replayIds = ['e1', 'e2', 'e3'];
(0, node_test_1.describe)('DistributedExecutionFingerprint', () => {
    (0, node_test_1.it)('computeTopologyHash() is deterministic for same nodeIds', () => {
        const fp = makeFp();
        strict_1.default.equal(fp.computeTopologyHash(['n1', 'n2', 'n3']), fp.computeTopologyHash(['n1', 'n2', 'n3']));
    });
    (0, node_test_1.it)('computeTopologyHash() is order-independent', () => {
        const fp = makeFp();
        strict_1.default.equal(fp.computeTopologyHash(['n3', 'n1', 'n2']), fp.computeTopologyHash(['n1', 'n2', 'n3']));
    });
    (0, node_test_1.it)('computeTopologyHash() differs for different nodeIds', () => {
        const fp = makeFp();
        strict_1.default.notEqual(fp.computeTopologyHash(['n1', 'n2']), fp.computeTopologyHash(['n1', 'n3']));
    });
    (0, node_test_1.it)('computeNodeAllocationHash() deterministic', () => {
        const fp = makeFp();
        strict_1.default.equal(fp.computeNodeAllocationHash(allocations), fp.computeNodeAllocationHash(allocations));
    });
    (0, node_test_1.it)('computeConsensusDecisionsHash() deterministic', () => {
        const fp = makeFp();
        strict_1.default.equal(fp.computeConsensusDecisionsHash(decisions), fp.computeConsensusDecisionsHash(decisions));
    });
    (0, node_test_1.it)('computeReplicationHash() deterministic', () => {
        const fp = makeFp();
        strict_1.default.equal(fp.computeReplicationHash(replication), fp.computeReplicationHash(replication));
    });
    (0, node_test_1.it)('computeReplayHash() deterministic', () => {
        const fp = makeFp();
        strict_1.default.equal(fp.computeReplayHash(replayIds), fp.computeReplayHash(replayIds));
    });
    (0, node_test_1.it)('compute() returns all components', () => {
        const fp = makeFp();
        const result = fp.compute(nodeIds, allocations, decisions, replication, replayIds);
        strict_1.default.ok(result.components.topologyHash);
        strict_1.default.ok(result.components.nodeAllocationHash);
        strict_1.default.ok(result.components.consensusDecisionsHash);
        strict_1.default.ok(result.components.replicationHash);
        strict_1.default.ok(result.components.replayHash);
        strict_1.default.ok(result.hash);
        strict_1.default.equal(result.executionId, 'exec-1');
    });
    (0, node_test_1.it)('diffDistributedFingerprints() match=true for identical inputs', () => {
        const fp = makeFp();
        const data = fp.compute(nodeIds, allocations, decisions, replication, replayIds);
        const diff = (0, DistributedExecutionFingerprint_js_1.diffDistributedFingerprints)(data, data);
        strict_1.default.equal(diff.match, true);
        strict_1.default.equal(diff.differences.length, 0);
    });
    (0, node_test_1.it)('diffDistributedFingerprints() reports differences for different inputs', () => {
        const fp = makeFp();
        const a = fp.compute(nodeIds, allocations, decisions, replication, replayIds);
        const b = fp.compute(['n1'], allocations, decisions, replication, replayIds);
        const diff = (0, DistributedExecutionFingerprint_js_1.diffDistributedFingerprints)(a, b);
        strict_1.default.equal(diff.match, false);
        strict_1.default.ok(diff.differences.some(d => d.component === 'topologyHash'));
    });
});
(0, node_test_1.describe)('DeterminismValidator distributed methods', () => {
    (0, node_test_1.it)('validateDistributedEventOrdering() true for sorted events', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const events = [
            { logicalClock: 1, timestamp: 100, nodeId: 'n1', eventId: 'e1' },
            { logicalClock: 2, timestamp: 200, nodeId: 'n1', eventId: 'e2' },
            { logicalClock: 3, timestamp: 300, nodeId: 'n2', eventId: 'e3' },
        ];
        strict_1.default.equal(v.validateDistributedEventOrdering(events), true);
    });
    (0, node_test_1.it)('validateDistributedEventOrdering() false for unsorted events', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const events = [
            { logicalClock: 2, timestamp: 200, nodeId: 'n1', eventId: 'e2' },
            { logicalClock: 1, timestamp: 100, nodeId: 'n1', eventId: 'e1' },
        ];
        strict_1.default.equal(v.validateDistributedEventOrdering(events), false);
    });
    (0, node_test_1.it)('validateConsensusDeterminism() true for identical runs', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const run = [{ round: 1, outcome: 'commit' }, { round: 2, outcome: 'commit' }];
        strict_1.default.equal(v.validateConsensusDeterminism(run, run), true);
    });
    (0, node_test_1.it)('validateConsensusDeterminism() false for different runs', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const runA = [{ round: 1, outcome: 'commit' }];
        const runB = [{ round: 1, outcome: 'abort' }];
        strict_1.default.equal(v.validateConsensusDeterminism(runA, runB), false);
    });
    (0, node_test_1.it)('validatePartitionReplayStability() true for matching runs', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const run = [{ eventId: 'e1', eventType: 'op.run' }, { eventId: 'e2', eventType: 'op.done' }];
        strict_1.default.equal(v.validatePartitionReplayStability(run, run), true);
    });
    (0, node_test_1.it)('validateMemoryReplicationConvergence() true for consistent entries', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const entries = [
            { key: 'k1', value: 'v1', nodeId: 'n1', version: 2 },
            { key: 'k1', value: 'v1', nodeId: 'n2', version: 2 },
        ];
        strict_1.default.equal(v.validateMemoryReplicationConvergence(entries), true);
    });
    (0, node_test_1.it)('validateMemoryReplicationConvergence() false for divergent entries', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const entries = [
            { key: 'k1', value: 'v1', nodeId: 'n1', version: 1 },
            { key: 'k1', value: 'v2', nodeId: 'n2', version: 1 },
        ];
        strict_1.default.equal(v.validateMemoryReplicationConvergence(entries), false);
    });
});
//# sourceMappingURL=distributed-determinism.test.js.map