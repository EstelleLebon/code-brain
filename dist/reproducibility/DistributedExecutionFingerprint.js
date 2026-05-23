"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedExecutionFingerprint = void 0;
exports.diffDistributedFingerprints = diffDistributedFingerprints;
function simpleHash(input) {
    let h = 5381;
    for (let i = 0; i < input.length; i++) {
        h = ((h << 5) + h) ^ input.charCodeAt(i);
        h = h >>> 0;
    }
    return h.toString(16).padStart(8, '0');
}
function diffDistributedFingerprints(a, b) {
    const differences = [];
    const keys = [
        'topologyHash',
        'nodeAllocationHash',
        'consensusDecisionsHash',
        'replicationHash',
        'replayHash',
    ];
    for (const key of keys) {
        if (a.components[key] !== b.components[key]) {
            differences.push({ component: key, a: a.components[key], b: b.components[key] });
        }
    }
    return { match: differences.length === 0, differences };
}
class DistributedExecutionFingerprint {
    executionId;
    constructor(executionId) {
        this.executionId = executionId;
    }
    computeTopologyHash(nodeIds) {
        const sorted = [...nodeIds].sort();
        return simpleHash(sorted.join(','));
    }
    computeNodeAllocationHash(allocations) {
        const sorted = [...allocations].sort((a, b) => a.nodeId < b.nodeId ? -1 : a.nodeId > b.nodeId ? 1 : 0);
        return simpleHash(sorted.map(a => `${a.nodeId}:${a.role}`).join(','));
    }
    computeConsensusDecisionsHash(decisions) {
        const sorted = [...decisions].sort((a, b) => a.round - b.round);
        return simpleHash(sorted.map(d => `${d.round}:${d.outcome}`).join(','));
    }
    computeReplicationHash(entries) {
        const sorted = [...entries].sort((a, b) => a.key < b.key ? -1 : a.key > b.key ? 1 : 0);
        return simpleHash(sorted.map(e => `${e.key}:${e.version}`).join(','));
    }
    computeReplayHash(eventIds) {
        return simpleHash(eventIds.join('|'));
    }
    compute(nodeIds, allocations, decisions, replicationEntries, replayEventIds) {
        const components = {
            topologyHash: this.computeTopologyHash(nodeIds),
            nodeAllocationHash: this.computeNodeAllocationHash(allocations),
            consensusDecisionsHash: this.computeConsensusDecisionsHash(decisions),
            replicationHash: this.computeReplicationHash(replicationEntries),
            replayHash: this.computeReplayHash(replayEventIds),
        };
        const hash = simpleHash(Object.values(components).join(':'));
        return { executionId: this.executionId, components, hash };
    }
}
exports.DistributedExecutionFingerprint = DistributedExecutionFingerprint;
//# sourceMappingURL=DistributedExecutionFingerprint.js.map