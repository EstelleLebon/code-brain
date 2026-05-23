"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedExecutionRuntime = void 0;
const ClusterTrustManager_js_1 = require("./ClusterTrustManager.js");
const ConsensusHealthMonitor_js_1 = require("./ConsensusHealthMonitor.js");
const DistributedCognitiveLoop_js_1 = require("./DistributedCognitiveLoop.js");
const DistributedRecoveryCoordinator_js_1 = require("./DistributedRecoveryCoordinator.js");
/**
 * Concrete implementation of CognitiveExecutionRuntime for distributed clusters.
 * Encapsulates DistributedCognitiveLoop, ClusterTrustManager, ConsensusHealthMonitor,
 * DistributedRecoveryCoordinator, and SplitBrainDetector.
 * No throws — all errors result in degraded outcomes.
 */
class DistributedExecutionRuntime {
    clusterTrust;
    healthMonitor;
    recoveryCoordinator;
    loop;
    splitBrainDetector;
    executionCounter = 0;
    constructor(opts = {}) {
        this.clusterTrust = opts.clusterTrust ?? new ClusterTrustManager_js_1.ClusterTrustManager(opts.splitBrainDetector);
        this.healthMonitor = opts.healthMonitor ?? new ConsensusHealthMonitor_js_1.ConsensusHealthMonitor();
        this.recoveryCoordinator = opts.recoveryCoordinator ?? new DistributedRecoveryCoordinator_js_1.DistributedRecoveryCoordinator();
        this.splitBrainDetector = opts.splitBrainDetector;
        this.loop = new DistributedCognitiveLoop_js_1.DistributedCognitiveLoop(this.clusterTrust, this.healthMonitor, this.recoveryCoordinator);
    }
    executeCycle(nodeIds) {
        try {
            const executionId = `exec-${++this.executionCounter}`;
            const affectedNodes = [];
            let recoveryTriggered = false;
            for (const nodeId of nodeIds) {
                this.clusterTrust.initNode(nodeId);
            }
            // Run SplitBrain checks and apply resulting alerts
            if (this.splitBrainDetector) {
                const alerts = [
                    ...this.splitBrainDetector.detectFingerprintDivergence(),
                    ...this.splitBrainDetector.detectMajorityInconsistency(nodeIds.length),
                    ...this.splitBrainDetector.detectReplayIncompatibility(),
                ];
                if (alerts.length > 0) {
                    this.clusterTrust.processTrustAlerts(alerts);
                }
            }
            // Observe all nodes
            for (const nodeId of nodeIds) {
                const trust = this.clusterTrust.getNodeTrust(nodeId);
                if (!trust)
                    continue;
                const outcome = this.resolveOutcome(trust.trustScore, trust.quarantined);
                this.loop.observe({
                    nodeId,
                    executionId,
                    outcome,
                    timestamp: this.executionCounter,
                });
                if (outcome !== 'success')
                    affectedNodes.push(nodeId);
            }
            // Adapt aggression
            this.loop.adapt();
            // Trigger recovery if needed
            const plan = this.loop.triggerRecoveryIfNeeded();
            if (plan)
                recoveryTriggered = true;
            const loopState = this.loop.getState();
            const globalOutcome = loopState.globalTrust < 0.4
                ? 'degraded'
                : affectedNodes.length > 0 ? 'failure' : 'success';
            return {
                executionId,
                iteration: loopState.iteration,
                outcome: globalOutcome,
                affectedNodes,
                recoveryTriggered,
            };
        }
        catch {
            return {
                executionId: `exec-err-${this.executionCounter}`,
                iteration: 0,
                outcome: 'failure',
                affectedNodes: nodeIds,
                recoveryTriggered: false,
            };
        }
    }
    recoverNode(nodeId, reason) {
        try {
            const plan = this.recoveryCoordinator.triggerTargetedRollback(nodeId, reason);
            if (this.clusterTrust.isQuarantined(nodeId)) {
                this.clusterTrust.releaseNode(nodeId, 0.3);
            }
            return plan !== null;
        }
        catch {
            return false;
        }
    }
    synchronizeCluster(nodeIds) {
        try {
            const rebalanced = this.loop.rebalance(nodeIds);
            const lowTrust = this.clusterTrust.getLowTrustNodes(0.5);
            if (lowTrust.length > 0) {
                this.recoveryCoordinator.triggerMemoryReconciliation(lowTrust);
            }
            // Register fingerprint state for split-brain detection
            if (this.splitBrainDetector) {
                let version = 0;
                for (const nodeId of rebalanced) {
                    const trust = this.clusterTrust.getNodeTrust(nodeId);
                    const score = trust?.trustScore ?? 1.0;
                    // Deterministic fingerprint from trust score and position (no Math.random, no crypto)
                    const fp = `fp-${nodeId}-${Math.round(score * 100)}`;
                    this.splitBrainDetector.updateNodeFingerprint(nodeId, fp);
                    this.splitBrainDetector.updateNodeVersion(nodeId, ++version);
                }
            }
        }
        catch {
            // no throw
        }
    }
    getClusterHealth() {
        try {
            const state = this.loop.getState();
            const unstable = this.clusterTrust.getUnstableNodes(0.5);
            const quarantined = this.clusterTrust.getQuarantinedNodes();
            return {
                globalTrust: state.globalTrust,
                consensusHealth: state.overallConsensusHealth,
                activeRecoveryPlans: state.activeRecoveryPlans,
                unstableNodeCount: unstable.length,
                quarantinedNodeCount: quarantined.length,
            };
        }
        catch {
            return {
                globalTrust: 0,
                consensusHealth: 0,
                activeRecoveryPlans: 0,
                unstableNodeCount: 0,
                quarantinedNodeCount: 0,
            };
        }
    }
    getDeterministicState() {
        try {
            const state = this.loop.getState();
            return {
                logicalClock: this.executionCounter,
                iteration: state.iteration,
                aggression: state.aggression,
                stableIterations: 0, // loop does not expose stableIterations publicly
                rebalancePending: state.rebalancePending,
            };
        }
        catch {
            return {
                logicalClock: this.executionCounter,
                iteration: 0,
                aggression: 0.7,
                stableIterations: 0,
                rebalancePending: false,
            };
        }
    }
    reset() {
        this.loop.reset();
        this.splitBrainDetector?.reset();
        this.executionCounter = 0;
    }
    // ── Internals ────────────────────────────────────────────────────────────────
    resolveOutcome(trustScore, quarantined) {
        if (quarantined)
            return 'partition';
        if (trustScore < 0.3)
            return 'failure';
        if (trustScore < 0.5)
            return 'timeout';
        return 'success';
    }
}
exports.DistributedExecutionRuntime = DistributedExecutionRuntime;
//# sourceMappingURL=DistributedExecutionRuntime.js.map