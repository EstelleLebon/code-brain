"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ChaosEngine_js_1 = require("../chaos-engineering/ChaosEngine.js");
const FaultInjection_js_1 = require("../stress-testing/FaultInjection.js");
const DistributedCognitiveLoop_js_1 = require("../distributed-cognition/DistributedCognitiveLoop.js");
const ClusterTrustManager_js_1 = require("../distributed-cognition/ClusterTrustManager.js");
const ConsensusHealthMonitor_js_1 = require("../distributed-cognition/ConsensusHealthMonitor.js");
const DistributedRecoveryCoordinator_js_1 = require("../distributed-cognition/DistributedRecoveryCoordinator.js");
const CrossNodeReplayEngine_js_1 = require("../distributed-replay/CrossNodeReplayEngine.js");
const DistributedExecutionFingerprint_js_1 = require("../reproducibility/DistributedExecutionFingerprint.js");
const DeterminismValidator_js_1 = require("../reproducibility/DeterminismValidator.js");
const VectorClock_js_1 = require("../distributed-memory/VectorClock.js");
const MemoryReconciliation_js_1 = require("../distributed-memory/MemoryReconciliation.js");
const DivergenceClassifier_js_1 = require("../distributed-memory/DivergenceClassifier.js");
function makeEvent(overrides) {
    return {
        nodeId: 'n1',
        executionId: 'exec-1',
        timestamp: 100,
        logicalClock: 1,
        eventType: 'test.event',
        payload: {},
        orderingKey: 'default',
        ...overrides,
    };
}
function makeMap(events) {
    const m = new Map();
    for (const e of events) {
        const arr = m.get(e.nodeId) ?? [];
        arr.push(e);
        m.set(e.nodeId, arr);
    }
    return m;
}
function makeLoop() {
    const clusterTrust = new ClusterTrustManager_js_1.ClusterTrustManager();
    const healthMonitor = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
    const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
    return { clusterTrust, healthMonitor, coord, loop: new DistributedCognitiveLoop_js_1.DistributedCognitiveLoop(clusterTrust, healthMonitor, coord) };
}
(0, node_test_1.describe)('cluster-recovery integration', () => {
    (0, node_test_1.it)('inject partition → loop observe failure → triggerRecoveryIfNeeded → recovery plan created', () => {
        const engine = new ChaosEngine_js_1.ChaosEngine(new FaultInjection_js_1.FaultInjector(), 'SAFE');
        engine.injectPartition(['n1', 'n2'], 42);
        strict_1.default.equal(engine.activeScenarios.size, 1);
        const { clusterTrust, loop } = makeLoop();
        clusterTrust.initNode('n1');
        clusterTrust.updateNodeTrust('n1', -0.8); // trust = 0.2
        const plan = loop.triggerRecoveryIfNeeded();
        strict_1.default.ok(plan !== null);
        strict_1.default.ok(plan.actions.length > 0);
    });
    (0, node_test_1.it)('heal partition → activeScenarios decreases', () => {
        const engine = new ChaosEngine_js_1.ChaosEngine(new FaultInjection_js_1.FaultInjector(), 'SAFE');
        const r = engine.injectPartition(['n1', 'n2'], 1);
        strict_1.default.equal(engine.activeScenarios.size, 1);
        engine.healPartition(r.scenarioId);
        strict_1.default.equal(engine.activeScenarios.size, 0);
    });
    (0, node_test_1.it)('replayDistributedExecution returns correct events after partition', () => {
        const events = [
            makeEvent({ eventId: 'e1', executionId: 'exec-part', nodeId: 'n1', logicalClock: 1 }),
            makeEvent({ eventId: 'e2', executionId: 'exec-part', nodeId: 'n2', logicalClock: 2 }),
            makeEvent({ eventId: 'e3', executionId: 'exec-other', nodeId: 'n3', logicalClock: 3 }),
        ];
        const engine = new CrossNodeReplayEngine_js_1.CrossNodeReplayEngine(makeMap(events));
        const result = engine.replayExecution('exec-part');
        strict_1.default.equal(result.length, 2);
        strict_1.default.ok(result.every(e => e.executionId === 'exec-part'));
    });
    (0, node_test_1.it)('validateDistributedDeterminism returns deterministic=true for clean execution', () => {
        const v = new DeterminismValidator_js_1.DeterminismValidator();
        const events1 = [{ logicalClock: 1, timestamp: 100, nodeId: 'n1', eventId: 'e1' }];
        strict_1.default.equal(v.validateDistributedEventOrdering(events1), true);
    });
    (0, node_test_1.it)('memory reconciliation after split-brain: contradiction_aware picks winner', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const entries = [
            { key: 'state', value: 'A', nodeId: 'n1', version: 1, confidence: 0.85, timestamp: 100 },
            { key: 'state', value: 'B', nodeId: 'n2', version: 1, confidence: 0.95, timestamp: 100 },
        ];
        const result = rec.reconcile(entries, 'contradiction_aware');
        strict_1.default.equal(result.resolvedValue, 'B'); // highest confidence wins
        strict_1.default.equal(result.conflictDetected, true);
    });
    (0, node_test_1.it)('DivergenceClassifier classifies post-partition entries', () => {
        const dc = new DivergenceClassifier_js_1.DivergenceClassifier();
        const entries = [
            { key: 'k', value: 'v1', nodeId: 'n1', version: 1, confidence: 0.9, timestamp: 1 },
            { key: 'k', value: 'v2', nodeId: 'n2', version: 1, confidence: 0.9, timestamp: 1 },
        ];
        const result = dc.classifyEntries(entries, true, false);
        strict_1.default.ok(['recoverable', 'dangerous', 'catastrophic'].includes(result.severity));
    });
    (0, node_test_1.it)('ConsensusHealthMonitor detects repeated_split_brain', () => {
        const mon = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        mon.recordSnapshot({ quorumHealth: 0.9, consensusLatency: 5, voteStability: 0.9, leaderStability: 0.9, partitionPressure: 0.9 });
        mon.recordSnapshot({ quorumHealth: 0.9, consensusLatency: 5, voteStability: 0.9, leaderStability: 0.9, partitionPressure: 0.9 });
        const anomalies = mon.detectAnomalies();
        strict_1.default.ok(anomalies.includes('repeated_split_brain'));
    });
    (0, node_test_1.it)('ClusterTrustManager degrades multiple nodes sequentially', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.initNode('n2');
        mgr.degradeUnstableNode('n1');
        mgr.degradeIsolatedNode('n2');
        strict_1.default.ok(mgr.getNodeTrust('n1').trustScore < 1.0);
        strict_1.default.ok(mgr.getNodeTrust('n2').trustScore < 1.0);
    });
    (0, node_test_1.it)('DistributedCognitiveLoop isolateUnstableNodes() returns nodes', () => {
        const { clusterTrust, loop } = makeLoop();
        clusterTrust.initNode('n1');
        clusterTrust.updateNodeTrust('n1', -0.8); // 0.2 < 0.3 threshold
        const isolated = loop.isolateUnstableNodes();
        strict_1.default.ok(isolated.includes('n1'));
    });
    (0, node_test_1.it)('Recovery coordinator getActivePlans() and completePlan() lifecycle', () => {
        const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        const p1 = coord.triggerGlobalRollback('r1');
        const p2 = coord.triggerGlobalRollback('r2');
        strict_1.default.equal(coord.getActivePlans().length, 2);
        coord.completePlan(p1.planId);
        strict_1.default.equal(coord.getActivePlans().length, 1);
        strict_1.default.equal(coord.getActivePlans()[0].planId, p2.planId);
    });
    (0, node_test_1.it)('CrossNodeReplayEngine compareReplay() detects divergence between partitions', () => {
        const events = [
            makeEvent({ eventId: 'e1', executionId: 'part-a', eventType: 'op.write', orderingKey: 'k1', logicalClock: 1, nodeId: 'n1' }),
            makeEvent({ eventId: 'e2', executionId: 'part-b', eventType: 'op.read', orderingKey: 'k2', logicalClock: 2, nodeId: 'n2' }),
        ];
        const engine = new CrossNodeReplayEngine_js_1.CrossNodeReplayEngine(makeMap(events));
        const result = engine.compareReplay('part-a', 'part-b');
        strict_1.default.equal(result.match, false);
    });
    (0, node_test_1.it)('VectorClock tracks causality across 3 nodes correctly', () => {
        const a = new VectorClock_js_1.VectorClock();
        const b = new VectorClock_js_1.VectorClock();
        const c = new VectorClock_js_1.VectorClock();
        a.increment('n1');
        b.increment('n2');
        const merged = a.merge(b);
        merged.increment('n3');
        c.increment('n3');
        strict_1.default.equal(c.causalBefore(merged), true);
    });
    (0, node_test_1.it)('MemoryReconciliation reconcileAll() with multiple keys', () => {
        const rec = new MemoryReconciliation_js_1.MemoryReconciliation();
        const m = new Map([
            ['key1', [{ key: 'key1', value: 'v1', nodeId: 'n1', version: 1, confidence: 0.8, timestamp: 10 }]],
            ['key2', [{ key: 'key2', value: 'v2', nodeId: 'n2', version: 1, confidence: 0.9, timestamp: 20 }]],
            ['key3', [{ key: 'key3', value: 'v3', nodeId: 'n3', version: 2, confidence: 0.7, timestamp: 30 }]],
        ]);
        const results = rec.reconcileAll(m, 'last_write_wins');
        strict_1.default.equal(results.size, 3);
        strict_1.default.equal(results.get('key1').resolvedValue, 'v1');
        strict_1.default.equal(results.get('key3').resolvedValue, 'v3');
    });
    (0, node_test_1.it)('full round-trip: create nodes, simulate partition, recover, validate determinism', () => {
        // Setup
        const { clusterTrust, healthMonitor, coord, loop } = makeLoop();
        const validator = new DeterminismValidator_js_1.DeterminismValidator();
        // Initialize cluster
        clusterTrust.initNode('n1');
        clusterTrust.initNode('n2');
        clusterTrust.initNode('n3');
        // Simulate partition: degrade nodes
        loop.observe({ nodeId: 'n1', executionId: 'ex1', outcome: 'partition', timestamp: 1 });
        loop.observe({ nodeId: 'n2', executionId: 'ex1', outcome: 'failure', timestamp: 2 });
        // Check health
        healthMonitor.recordSnapshot({ quorumHealth: 0.4, consensusLatency: 50, voteStability: 0.5, leaderStability: 0.6, partitionPressure: 0.8 });
        const health = healthMonitor.computeOverallHealth();
        strict_1.default.ok(health >= 0 && health <= 1);
        // Trigger recovery
        const plan = coord.triggerGlobalRollback('partition detected');
        strict_1.default.ok(plan.planId);
        strict_1.default.equal(coord.getActivePlans().length, 1);
        // Complete recovery
        coord.completePlan(plan.planId);
        strict_1.default.equal(coord.getActivePlans().length, 0);
        // Validate determinism
        const events1 = [{ logicalClock: 1, timestamp: 100, nodeId: 'n1', eventId: 'e1', eventType: 'exec.step' }];
        const events2 = [{ logicalClock: 1, timestamp: 100, nodeId: 'n1', eventId: 'e1', eventType: 'exec.step' }];
        strict_1.default.equal(validator.validatePartitionReplayStability(events1, events2), true);
        // Fingerprint comparison
        const fp = new DistributedExecutionFingerprint_js_1.DistributedExecutionFingerprint('ex1');
        const nodes = ['n1', 'n2', 'n3'];
        const data1 = fp.compute(nodes, [], [], [], ['e1']);
        const data2 = fp.compute(nodes, [], [], [], ['e1']);
        const diff = (0, DistributedExecutionFingerprint_js_1.diffDistributedFingerprints)(data1, data2);
        strict_1.default.equal(diff.match, true);
    });
});
//# sourceMappingURL=cluster-recovery.test.js.map