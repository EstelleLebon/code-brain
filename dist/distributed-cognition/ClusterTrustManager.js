"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClusterTrustManager = void 0;
class ClusterTrustManager {
    nodeTrusts;
    partitionTrusts;
    logicalClock;
    splitBrainDetector;
    constructor(splitBrainDetector) {
        this.nodeTrusts = new Map();
        this.partitionTrusts = new Map();
        this.logicalClock = 0;
        this.splitBrainDetector = splitBrainDetector;
    }
    initNode(nodeId) {
        this.logicalClock++;
        if (!this.nodeTrusts.has(nodeId)) {
            this.nodeTrusts.set(nodeId, {
                nodeId,
                trustScore: 1.0,
                failureCount: 0,
                isolationCount: 0,
                divergenceCount: 0,
                quarantined: false,
                lastUpdated: this.logicalClock,
            });
        }
    }
    updateNodeTrust(nodeId, delta) {
        this.logicalClock++;
        const trust = this.nodeTrusts.get(nodeId);
        if (!trust)
            return;
        trust.trustScore = Math.min(1.0, Math.max(0.0, trust.trustScore + delta));
        trust.lastUpdated = this.logicalClock;
    }
    degradeUnstableNode(nodeId) {
        const trust = this.nodeTrusts.get(nodeId);
        if (trust) {
            trust.failureCount++;
        }
        this.updateNodeTrust(nodeId, -0.2);
        this.applyProgressiveDegradation(nodeId);
    }
    degradeIsolatedNode(nodeId) {
        const trust = this.nodeTrusts.get(nodeId);
        if (trust) {
            trust.isolationCount++;
        }
        this.updateNodeTrust(nodeId, -0.3);
        this.applyProgressiveDegradation(nodeId);
    }
    degradeDivergentNode(nodeId) {
        const trust = this.nodeTrusts.get(nodeId);
        if (trust) {
            trust.divergenceCount++;
        }
        this.updateNodeTrust(nodeId, -0.25);
        this.applyProgressiveDegradation(nodeId);
    }
    /** Apply alerts emitted by SplitBrainDetector into trust scores. */
    processTrustAlerts(alerts) {
        for (const alert of alerts) {
            for (const nodeId of alert.implicatedNodes) {
                if (!this.nodeTrusts.has(nodeId))
                    this.initNode(nodeId);
                switch (alert.recommendation) {
                    case 'quarantine':
                        this.quarantineNode(nodeId);
                        break;
                    case 'degrade':
                        this.updateNodeTrust(nodeId, -0.15);
                        break;
                    case 'reconcile':
                        this.updateNodeTrust(nodeId, -0.1);
                        break;
                    case 'monitor':
                        // no trust change, flag only
                        break;
                }
            }
        }
    }
    /** Quarantine a node: set trust to 0, mark quarantined flag. */
    quarantineNode(nodeId) {
        const trust = this.nodeTrusts.get(nodeId);
        if (!trust)
            return;
        trust.trustScore = 0.0;
        trust.quarantined = true;
        trust.lastUpdated = ++this.logicalClock;
        if (this.splitBrainDetector) {
            this.splitBrainDetector.quarantineNode(nodeId);
        }
    }
    /** Release a quarantined node, restoring minimum viable trust. */
    releaseNode(nodeId, recoveryTrust = 0.3) {
        const trust = this.nodeTrusts.get(nodeId);
        if (!trust)
            return;
        trust.quarantined = false;
        trust.trustScore = Math.max(trust.trustScore, recoveryTrust);
        trust.lastUpdated = ++this.logicalClock;
        if (this.splitBrainDetector) {
            this.splitBrainDetector.releaseNode(nodeId);
        }
    }
    isQuarantined(nodeId) {
        return this.nodeTrusts.get(nodeId)?.quarantined ?? false;
    }
    getNodeTrust(nodeId) {
        return this.nodeTrusts.get(nodeId);
    }
    getGlobalClusterTrust() {
        if (this.nodeTrusts.size === 0)
            return 1.0;
        let sum = 0;
        for (const t of this.nodeTrusts.values()) {
            sum += t.trustScore;
        }
        return sum / this.nodeTrusts.size;
    }
    updatePartitionTrust(partitionId, nodeIds) {
        this.logicalClock++;
        if (nodeIds.length === 0) {
            this.partitionTrusts.set(partitionId, {
                partitionId,
                nodeIds: [],
                averageTrust: 0,
                stable: false,
            });
            return;
        }
        let sum = 0;
        for (const id of nodeIds) {
            const t = this.nodeTrusts.get(id);
            sum += t ? t.trustScore : 0;
        }
        const avg = sum / nodeIds.length;
        this.partitionTrusts.set(partitionId, {
            partitionId,
            nodeIds: [...nodeIds],
            averageTrust: avg,
            stable: avg >= 0.5,
        });
    }
    getPartitionTrust(partitionId) {
        return this.partitionTrusts.get(partitionId);
    }
    getUnstableNodes(threshold = 0.5) {
        const result = [];
        for (const t of this.nodeTrusts.values()) {
            if (t.trustScore < threshold)
                result.push(t.nodeId);
        }
        return result;
    }
    getLowTrustNodes(threshold = 0.3) {
        const result = [];
        for (const t of this.nodeTrusts.values()) {
            if (t.trustScore < threshold)
                result.push(t.nodeId);
        }
        return result;
    }
    getQuarantinedNodes() {
        const result = [];
        for (const t of this.nodeTrusts.values()) {
            if (t.quarantined)
                result.push(t.nodeId);
        }
        return result;
    }
    reset() {
        this.nodeTrusts.clear();
        this.partitionTrusts.clear();
        this.logicalClock = 0;
    }
    // ── Private ─────────────────────────────────────────────────────────────────
    /** Progressive degradation: auto-quarantine nodes with repeated severe incidents. */
    applyProgressiveDegradation(nodeId) {
        const trust = this.nodeTrusts.get(nodeId);
        if (!trust || trust.quarantined)
            return;
        const totalIncidents = trust.failureCount + trust.isolationCount + trust.divergenceCount;
        if (trust.trustScore <= 0.1 || totalIncidents >= 10) {
            this.quarantineNode(nodeId);
        }
    }
}
exports.ClusterTrustManager = ClusterTrustManager;
//# sourceMappingURL=ClusterTrustManager.js.map