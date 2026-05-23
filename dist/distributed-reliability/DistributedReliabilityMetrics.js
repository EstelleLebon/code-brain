"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DistributedReliabilityMetrics = void 0;
class DistributedReliabilityMetrics {
    snapshots = [];
    clock = 0;
    consensusVotes = 0;
    consensusSuccesses = 0;
    replicationAttempts = 0;
    replicationSuccesses = 0;
    recoveryAttempts = 0;
    recoverySuccesses = 0;
    partitionEvents = 0;
    partitionRecoveries = 0;
    coordinationEvents = 0;
    coordinationOverheadTicks = 0;
    replayAttempts = 0;
    replayConsistent = 0;
    recordConsensusAttempt(success) {
        this.consensusVotes++;
        if (success)
            this.consensusSuccesses++;
    }
    recordReplication(success) {
        this.replicationAttempts++;
        if (success)
            this.replicationSuccesses++;
    }
    recordRecovery(success) {
        this.recoveryAttempts++;
        if (success)
            this.recoverySuccesses++;
    }
    recordPartitionEvent(healed) {
        this.partitionEvents++;
        if (healed)
            this.partitionRecoveries++;
    }
    recordCoordinationOverhead(ticks) {
        this.coordinationEvents++;
        this.coordinationOverheadTicks += ticks;
    }
    recordReplayConsistency(consistent) {
        this.replayAttempts++;
        if (consistent)
            this.replayConsistent++;
    }
    snapshot() {
        const consensusStability = this.consensusVotes > 0 ? this.consensusSuccesses / this.consensusVotes : 1;
        const replicationIntegrity = this.replicationAttempts > 0 ? this.replicationSuccesses / this.replicationAttempts : 1;
        const crossNodeRecoveryRate = this.recoveryAttempts > 0 ? this.recoverySuccesses / this.recoveryAttempts : 1;
        const partitionTolerance = this.partitionEvents > 0 ? this.partitionRecoveries / this.partitionEvents : 1;
        const avgOverhead = this.coordinationEvents > 0 ? this.coordinationOverheadTicks / this.coordinationEvents : 0;
        const coordinationOverhead = Math.max(0, 1 - avgOverhead / 100);
        const distributedReplayConsistency = this.replayAttempts > 0 ? this.replayConsistent / this.replayAttempts : 1;
        const overallScore = (consensusStability + replicationIntegrity + crossNodeRecoveryRate + partitionTolerance + coordinationOverhead + distributedReplayConsistency) / 6;
        const snap = {
            timestamp: this.clock++,
            consensusStability,
            replicationIntegrity,
            crossNodeRecoveryRate,
            partitionTolerance,
            coordinationOverhead,
            distributedReplayConsistency,
            overallScore,
        };
        this.snapshots.push(snap);
        return snap;
    }
    getHistory() { return this.snapshots; }
    getLatest() { return this.snapshots[this.snapshots.length - 1]; }
}
exports.DistributedReliabilityMetrics = DistributedReliabilityMetrics;
//# sourceMappingURL=DistributedReliabilityMetrics.js.map