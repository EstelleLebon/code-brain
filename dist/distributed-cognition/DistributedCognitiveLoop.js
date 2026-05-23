"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedCognitiveLoop = void 0;
class DistributedCognitiveLoop {
    clusterTrust;
    healthMonitor;
    recoveryCoordinator;
    logicalClock;
    iteration;
    aggression;
    stableIterations;
    rebalancePending;
    constructor(clusterTrust, healthMonitor, recoveryCoordinator) {
        this.clusterTrust = clusterTrust;
        this.healthMonitor = healthMonitor;
        this.recoveryCoordinator = recoveryCoordinator;
        this.logicalClock = 0;
        this.iteration = 0;
        this.aggression = 0.7;
        this.stableIterations = 0;
        this.rebalancePending = false;
    }
    observe(obs) {
        try {
            this.logicalClock++;
            this.clusterTrust.initNode(obs.nodeId);
            if (obs.trustDelta !== undefined) {
                this.clusterTrust.updateNodeTrust(obs.nodeId, obs.trustDelta);
            }
            switch (obs.outcome) {
                case 'failure':
                    this.clusterTrust.degradeUnstableNode(obs.nodeId);
                    break;
                case 'partition':
                    this.clusterTrust.degradeIsolatedNode(obs.nodeId);
                    this.rebalancePending = true;
                    break;
                case 'timeout':
                    this.clusterTrust.degradeUnstableNode(obs.nodeId);
                    break;
                case 'success':
                    // no degradation
                    break;
            }
        }
        catch {
            // swallow
        }
    }
    adapt() {
        try {
            this.logicalClock++;
            this.iteration++;
            const anomalies = this.healthMonitor.detectAnomalies();
            const isUnstable = anomalies.includes('unstable_quorum') ||
                anomalies.includes('repeated_split_brain') ||
                anomalies.includes('consensus_oscillation') ||
                anomalies.includes('leader_churn');
            if (isUnstable) {
                this.aggression = Math.max(0.0, this.aggression - 0.1);
                this.stableIterations = 0;
            }
            else {
                this.stableIterations++;
                if (this.stableIterations >= 3) {
                    this.aggression = Math.min(1.0, this.aggression + 0.05);
                }
            }
        }
        catch {
            // swallow
        }
    }
    rebalance(nodeIds) {
        try {
            this.logicalClock++;
            this.rebalancePending = false;
            return [...nodeIds].sort((a, b) => {
                const ta = this.clusterTrust.getNodeTrust(a)?.trustScore ?? 0;
                const tb = this.clusterTrust.getNodeTrust(b)?.trustScore ?? 0;
                return tb - ta;
            });
        }
        catch {
            return nodeIds;
        }
    }
    triggerRecoveryIfNeeded() {
        try {
            this.logicalClock++;
            const globalTrust = this.clusterTrust.getGlobalClusterTrust();
            const anomalies = this.healthMonitor.detectAnomalies();
            if (globalTrust < 0.4) {
                return this.recoveryCoordinator.triggerGlobalRollback(`global trust too low: ${globalTrust.toFixed(2)}`);
            }
            if (anomalies.includes('repeated_split_brain')) {
                const lowTrust = this.clusterTrust.getLowTrustNodes();
                if (lowTrust.length > 0) {
                    return this.recoveryCoordinator.triggerMemoryReconciliation(lowTrust);
                }
                return this.recoveryCoordinator.triggerGlobalRollback('repeated_split_brain detected');
            }
            return null;
        }
        catch {
            return null;
        }
    }
    isolateUnstableNodes() {
        try {
            this.logicalClock++;
            const unstable = this.clusterTrust.getLowTrustNodes(0.3);
            for (const nodeId of unstable) {
                this.clusterTrust.degradeIsolatedNode(nodeId);
            }
            return unstable;
        }
        catch {
            return [];
        }
    }
    getState() {
        return {
            iteration: this.iteration,
            globalTrust: this.clusterTrust.getGlobalClusterTrust(),
            overallConsensusHealth: this.healthMonitor.computeOverallHealth(),
            activeRecoveryPlans: this.recoveryCoordinator.getActivePlans().length,
            aggression: this.aggression,
            rebalancePending: this.rebalancePending,
        };
    }
    reset() {
        this.clusterTrust.reset();
        this.healthMonitor.reset();
        this.recoveryCoordinator.reset();
        this.logicalClock = 0;
        this.iteration = 0;
        this.aggression = 0.7;
        this.stableIterations = 0;
        this.rebalancePending = false;
    }
}
exports.DistributedCognitiveLoop = DistributedCognitiveLoop;
//# sourceMappingURL=DistributedCognitiveLoop.js.map