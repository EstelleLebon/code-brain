"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_test_1 = require("node:test");
const strict_1 = __importDefault(require("node:assert/strict"));
const ClusterTrustManager_js_1 = require("../distributed-cognition/ClusterTrustManager.js");
const ConsensusHealthMonitor_js_1 = require("../distributed-cognition/ConsensusHealthMonitor.js");
const DistributedRecoveryCoordinator_js_1 = require("../distributed-cognition/DistributedRecoveryCoordinator.js");
const DistributedCognitiveLoop_js_1 = require("../distributed-cognition/DistributedCognitiveLoop.js");
(0, node_test_1.describe)('ClusterTrustManager', () => {
    (0, node_test_1.it)('initNode() creates node with trust=1.0', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        const trust = mgr.getNodeTrust('n1');
        strict_1.default.ok(trust);
        strict_1.default.equal(trust.trustScore, 1.0);
    });
    (0, node_test_1.it)('updateNodeTrust() clamps to [0,1] from above', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.updateNodeTrust('n1', 5.0);
        strict_1.default.equal(mgr.getNodeTrust('n1').trustScore, 1.0);
    });
    (0, node_test_1.it)('updateNodeTrust() clamps to [0,1] from below', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.updateNodeTrust('n1', -5.0);
        strict_1.default.equal(mgr.getNodeTrust('n1').trustScore, 0.0);
    });
    (0, node_test_1.it)('degradeUnstableNode() subtracts 0.2', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.degradeUnstableNode('n1');
        strict_1.default.ok(Math.abs(mgr.getNodeTrust('n1').trustScore - 0.8) < 0.0001);
    });
    (0, node_test_1.it)('degradeIsolatedNode() subtracts 0.3', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.degradeIsolatedNode('n1');
        strict_1.default.ok(Math.abs(mgr.getNodeTrust('n1').trustScore - 0.7) < 0.0001);
    });
    (0, node_test_1.it)('degradeDivergentNode() subtracts 0.25', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.degradeDivergentNode('n1');
        strict_1.default.ok(Math.abs(mgr.getNodeTrust('n1').trustScore - 0.75) < 0.0001);
    });
    (0, node_test_1.it)('getGlobalClusterTrust() averages all nodes', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.initNode('n2');
        mgr.updateNodeTrust('n1', -0.5); // 0.5
        // n2 is still 1.0
        const global = mgr.getGlobalClusterTrust();
        strict_1.default.ok(Math.abs(global - 0.75) < 0.0001);
    });
    (0, node_test_1.it)('getUnstableNodes() returns nodes below threshold', () => {
        const mgr = new ClusterTrustManager_js_1.ClusterTrustManager();
        mgr.initNode('n1');
        mgr.initNode('n2');
        mgr.updateNodeTrust('n1', -0.6); // 0.4
        const unstable = mgr.getUnstableNodes(0.5);
        strict_1.default.ok(unstable.includes('n1'));
        strict_1.default.ok(!unstable.includes('n2'));
    });
});
(0, node_test_1.describe)('ConsensusHealthMonitor', () => {
    function makeSnapshot(overrides = {}) {
        return {
            quorumHealth: 0.9,
            consensusLatency: 10,
            voteStability: 0.9,
            leaderStability: 0.9,
            partitionPressure: 0.1,
            ...overrides,
        };
    }
    (0, node_test_1.it)('recordSnapshot() stores snapshot', () => {
        const mon = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        mon.recordSnapshot(makeSnapshot());
        strict_1.default.equal(mon.getHistory().length, 1);
    });
    (0, node_test_1.it)('detectAnomalies() returns unstable_quorum when quorumHealth < 0.5', () => {
        const mon = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        mon.recordSnapshot(makeSnapshot({ quorumHealth: 0.3 }));
        const anomalies = mon.detectAnomalies();
        strict_1.default.ok(anomalies.includes('unstable_quorum'));
    });
    (0, node_test_1.it)('detectAnomalies() returns partition_pressure_high when pressure > 0.7', () => {
        const mon = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        mon.recordSnapshot(makeSnapshot({ partitionPressure: 0.8 }));
        const anomalies = mon.detectAnomalies();
        strict_1.default.ok(anomalies.includes('partition_pressure_high'));
    });
    (0, node_test_1.it)('detectAnomalies() returns repeated_split_brain when two consecutive high pressure', () => {
        const mon = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        mon.recordSnapshot(makeSnapshot({ partitionPressure: 0.9 }));
        mon.recordSnapshot(makeSnapshot({ partitionPressure: 0.9 }));
        const anomalies = mon.detectAnomalies();
        strict_1.default.ok(anomalies.includes('repeated_split_brain'));
    });
    (0, node_test_1.it)('computeOverallHealth() returns value in [0,1]', () => {
        const mon = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        mon.recordSnapshot(makeSnapshot());
        const health = mon.computeOverallHealth();
        strict_1.default.ok(health >= 0 && health <= 1);
    });
});
(0, node_test_1.describe)('DistributedRecoveryCoordinator', () => {
    (0, node_test_1.it)('triggerGlobalRollback() creates plan', () => {
        const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        const plan = coord.triggerGlobalRollback('low trust');
        strict_1.default.ok(plan.planId);
        strict_1.default.equal(plan.completed, false);
        strict_1.default.ok(plan.actions.some(a => a.type === 'global_rollback'));
    });
    (0, node_test_1.it)('triggerTargetedRollback() includes nodeId in plan', () => {
        const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        const plan = coord.triggerTargetedRollback('n1', 'node failed');
        const action = plan.actions.find(a => a.type === 'targeted_rollback');
        strict_1.default.ok(action && action.type === 'targeted_rollback');
        strict_1.default.equal(action.nodeId, 'n1');
    });
    (0, node_test_1.it)('completePlan() marks plan completed', () => {
        const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        const plan = coord.triggerGlobalRollback('test');
        coord.completePlan(plan.planId);
        strict_1.default.equal(coord.getAllPlans().find(p => p.planId === plan.planId).completed, true);
    });
    (0, node_test_1.it)('getActivePlans() excludes completed plans', () => {
        const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        const p1 = coord.triggerGlobalRollback('r1');
        coord.triggerGlobalRollback('r2');
        coord.completePlan(p1.planId);
        strict_1.default.equal(coord.getActivePlans().length, 1);
    });
});
(0, node_test_1.describe)('DistributedCognitiveLoop', () => {
    function makeLoop() {
        return new DistributedCognitiveLoop_js_1.DistributedCognitiveLoop(new ClusterTrustManager_js_1.ClusterTrustManager(), new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor(), new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator());
    }
    (0, node_test_1.it)('observe() with failure decreases trust', () => {
        const loop = makeLoop();
        loop.observe({ nodeId: 'n1', executionId: 'exec-1', outcome: 'success', timestamp: 1 });
        const stateBefore = loop.getState();
        loop.observe({ nodeId: 'n1', executionId: 'exec-1', outcome: 'failure', timestamp: 2 });
        const stateAfter = loop.getState();
        strict_1.default.ok(stateAfter.globalTrust <= stateBefore.globalTrust);
    });
    (0, node_test_1.it)('adapt() lowers aggression under anomalies', () => {
        const clusterTrust = new ClusterTrustManager_js_1.ClusterTrustManager();
        const healthMonitor = new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        const coord = new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        const loop = new DistributedCognitiveLoop_js_1.DistributedCognitiveLoop(clusterTrust, healthMonitor, coord);
        // Add unstable_quorum anomaly
        healthMonitor.recordSnapshot({ quorumHealth: 0.3, consensusLatency: 10, voteStability: 0.9, leaderStability: 0.9, partitionPressure: 0.1 });
        const before = loop.getState().aggression;
        loop.adapt();
        strict_1.default.ok(loop.getState().aggression <= before);
    });
    (0, node_test_1.it)('rebalance() sorts by trust DESC', () => {
        const clusterTrust = new ClusterTrustManager_js_1.ClusterTrustManager();
        clusterTrust.initNode('n1');
        clusterTrust.initNode('n2');
        clusterTrust.initNode('n3');
        clusterTrust.updateNodeTrust('n1', -0.5); // 0.5
        clusterTrust.updateNodeTrust('n3', -0.2); // 0.8
        // n2 = 1.0
        const loop = new DistributedCognitiveLoop_js_1.DistributedCognitiveLoop(clusterTrust, new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor(), new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator());
        const ordered = loop.rebalance(['n1', 'n2', 'n3']);
        strict_1.default.equal(ordered[0], 'n2'); // highest trust
    });
    (0, node_test_1.it)('triggerRecoveryIfNeeded() returns plan when globalTrust < 0.4', () => {
        const clusterTrust = new ClusterTrustManager_js_1.ClusterTrustManager();
        clusterTrust.initNode('n1');
        clusterTrust.updateNodeTrust('n1', -0.7); // 0.3
        const loop = new DistributedCognitiveLoop_js_1.DistributedCognitiveLoop(clusterTrust, new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor(), new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator());
        const plan = loop.triggerRecoveryIfNeeded();
        strict_1.default.ok(plan !== null);
    });
    (0, node_test_1.it)('getState() reflects current iteration count', () => {
        const loop = makeLoop();
        strict_1.default.equal(loop.getState().iteration, 0);
        loop.adapt();
        strict_1.default.equal(loop.getState().iteration, 1);
        loop.adapt();
        strict_1.default.equal(loop.getState().iteration, 2);
    });
});
//# sourceMappingURL=distributed-cognition.test.js.map